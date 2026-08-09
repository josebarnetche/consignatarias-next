import { requireServiceClient } from '@/lib/supabase'
import { sendCampoMatchALead } from '@/lib/email'
import { canonEnPlata } from '@/lib/valuacion-campos'
import { fmtArs, fmtHa, fmtUsd, tituloCampo, type Campo } from '@/lib/campos'

/**
 * Cuando se publica un campo, avisarle a quien lo estaba esperando.
 *
 * Es la razón por la que la lista de espera vale algo: sin esto, capturamos
 * demanda y la dejamos morir, que es exactamente lo que venía pasando.
 *
 * El aviso lo mandamos NOSOTROS y la respuesta vuelve a nosotros. No se le pasa
 * el contacto de nadie a nadie: quien contesta queda conectado por Jose.
 */
const TIPO = 'campo_match'
const MAX_POR_CAMPO = 25

/** Cuánto puede diferir la superficie y seguir sirviendo. Quien busca 500 ha
 *  mira uno de 300 y uno de 1.000; no mira uno de 40 ni uno de 8.000. */
const FACTOR_MIN = 0.4
const FACTOR_MAX = 2.5

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export interface ResultadoMatch {
  avisados: number
  candidatos: number
  motivo?: string
}

export async function notificarLeadsDeCampo(campoId: number): Promise<ResultadoMatch> {
  const db = requireServiceClient()

  const { data: campoRaw } = await db
    .from('campos')
    .select('*')
    .eq('id', campoId)
    .eq('status', 'publicado')
    .maybeSingle()
  if (!campoRaw) return { avisados: 0, candidatos: 0, motivo: 'campo no publicado' }
  const campo = campoRaw as Campo & { consignataria_slug: string | null }

  // Qué intención busca este campo. 'ambos' sirve a los dos lados.
  const intents =
    campo.operacion === 'venta'
      ? ['comprar']
      : campo.operacion === 'arrendamiento'
        ? ['arrendar_busco']
        : ['comprar', 'arrendar_busco']

  const { data: leadsRaw } = await db
    .from('producer_leads')
    .select('id, name, email, province, zona, hectareas, intent, status')
    .in('intent', intents)
    .not('email', 'is', null)
    .neq('status', 'lost')
    .order('created_at', { ascending: false })
    .limit(500)

  const provinciaCampo = normalizar(campo.provincia)
  const partidoCampo = campo.partido ? normalizar(campo.partido) : null

  const candidatos = (leadsRaw ?? []).filter((l) => {
    const lead = l as { province: string | null; zona: string | null; hectareas: number | null }
    if (!lead.province) return false
    if (normalizar(lead.province) !== provinciaCampo) return false
    // La zona afina pero no excluye: alguien que puso "Mercedes" igual mira un
    // campo del partido de al lado. Solo descarta si pidió zona y no hay ninguna.
    if (lead.zona && partidoCampo) {
      const z = normalizar(lead.zona)
      const coincide = z.includes(partidoCampo) || partidoCampo.includes(z)
      if (!coincide) return false
    }
    if (lead.hectareas && lead.hectareas > 0) {
      const min = lead.hectareas * FACTOR_MIN
      const max = lead.hectareas * FACTOR_MAX
      if (campo.hectareas < min || campo.hectareas > max) return false
    }
    return true
  })

  if (candidatos.length === 0) return { avisados: 0, candidatos: 0 }

  // Nadie recibe dos veces el mismo campo. La clave va en notes porque
  // outreach_log no tiene columna para el id del campo.
  const { data: yaAvisados } = await db
    .from('outreach_log')
    .select('notes')
    .eq('type', TIPO)
  const vistos = new Set(
    (yaAvisados ?? [])
      .map((r) => String((r as { notes: string | null }).notes ?? ''))
      .filter(Boolean),
  )

  const arr = campo.precio_kg_ha_mes ? canonEnPlata(campo.hectareas, campo.precio_kg_ha_mes) : null
  const precio = arr
    ? `${campo.precio_kg_ha_mes} kg de novillo por ha por mes · ${fmtArs(arr.mensualArs)} por mes`
    : campo.precio_usd_ha
      ? `${fmtUsd(campo.precio_usd_ha)} por hectárea · ${fmtUsd(campo.precio_usd_ha * campo.hectareas)} el campo`
      : 'a consultar'

  const resumen = `${fmtHa(campo.hectareas)}${campo.partido ? ` en ${campo.partido}` : ''}, ${campo.provincia}.`
  const url = `https://www.consignatarias.com.ar/campos/${campo.slug ?? campo.id}`

  let avisados = 0
  for (const c of candidatos.slice(0, MAX_POR_CAMPO)) {
    const lead = c as { id: number; name: string | null; email: string | null }
    const clave = `lead:${lead.id}|campo:${campo.id}`
    if (vistos.has(clave) || !lead.email) continue

    const r = await sendCampoMatchALead({
      to: lead.email,
      nombre: lead.name ?? '',
      campoTitulo: tituloCampo(campo),
      campoUrl: url,
      resumen,
      precio,
    })
    if (!r.success) continue
    avisados++
    // Se registra DESPUÉS del envío: si el mail falla, el lead sigue elegible
    // en vez de quedar marcado como avisado sin haber recibido nada.
    await db.from('outreach_log').insert({
      type: TIPO,
      // La columna es NOT NULL y acá no hay consignataria: guardamos el campo,
      // que es lo que identifica el envío.
      consignataria_slug: campo.consignataria_slug ?? `campo-${campo.id}`,
      email_sent_to: lead.email,
      notes: clave,
    })
  }

  return { avisados, candidatos: candidatos.length }
}
