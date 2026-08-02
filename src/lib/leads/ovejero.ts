/**
 * EL OVEJERO — agente diario que trabaja los leads solo.
 *
 * Nació el 2026-08-01: había 3 leads, uno ruteado y dos parados (Elisabet, 11 días
 * sin respuesta), y cero matches de arrendamiento porque solo entraba un lado del
 * mercado (2 "busco", 0 "ofrezco"). Nadie lo miraba todos los días.
 *
 * Qué hace cada mañana:
 *  1. Cruza arrendamiento: quien busca campo contra quien lo ofrece.
 *  2. Vigila el SLA: lead sin rutear a las 48 h avisa, a los 7 días grita.
 *  3. Detecta el lado faltante del mercado y arma a quién pedirle cartera.
 *  4. Manda UN digest. Si no hay nada que hacer, no manda nada.
 *
 * DOS LÍMITES DELIBERADOS (no romper sin pensarlo):
 *  · NO escribe a terceros. Prepara el mensaje y el link de WhatsApp; el que
 *    aprieta enviar es una persona. El propio código de outreach del repo avisa
 *    "RIESGO AUP ALTO: cold outreach en goteo, nunca blast".
 *  · NO usa LLM todavía. Todo esto es SQL + reglas + plantillas; un modelo sumaría
 *    dependencia, costo y otro modo de falla sin mejorar el resultado. Cuando el
 *    volumen justifique juzgar zonas en texto libre ("Isla, partido de 25 de Mayo"
 *    vs "Bolívar"), el lugar donde entra es `compatibilidadZona()`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { matchConsignatarias, normalizeGeo, whatsappLink } from '@/lib/leads/routing'

export interface LeadRow {
  id: number
  created_at: string
  intent: string
  province: string | null
  zona: string | null
  category: string | null
  head_count: number | null
  hectareas: number | null
  name: string | null
  phone: string | null
  email: string | null
  message: string | null
  status: string
  estimated_value_ars: number | null
  fee_ars: number | null
}

export interface MatchArrendamiento {
  busca: LeadRow
  ofrece: LeadRow
  motivo: string
}

export interface LeadPendiente {
  lead: LeadRow
  diasEsperando: number
  urgente: boolean
  waLink: string | null
}

export interface ZonaSinOferta {
  provincia: string
  buscan: number
  hectareasPedidas: number
  firmas: Array<{ displayName: string; slug: string; waLink: string | null }>
  mensajeSugerido: string
}

export interface ReporteOvejero {
  matches: MatchArrendamiento[]
  pendientes: LeadPendiente[]
  zonasSinOferta: ZonaSinOferta[]
  hayAlgoQueHacer: boolean
  totales: { leadsActivos: number; demandasActivas: number }
}

const DIAS_AVISO = 2
const DIAS_URGENTE = 7

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/**
 * ¿El campo que se ofrece le sirve a quien busca? Provincia igual y superficie
 * en un rango razonable (quien busca 80 ha no quiere un campo de 2.000).
 * Acá es donde entraría un LLM el día que las zonas en texto libre importen.
 */
function compatibilidadZona(busca: LeadRow, ofrece: LeadRow): string | null {
  const pb = normalizeGeo(busca.province)
  const po = normalizeGeo(ofrece.province)
  if (!pb || !po || pb !== po) return null

  const zb = normalizeGeo(busca.zona)
  const zo = normalizeGeo(ofrece.zona)
  const mismaZona = Boolean(zb && zo && (zb.includes(zo) || zo.includes(zb)))

  const hb = busca.hectareas ?? busca.head_count
  const ho = ofrece.hectareas ?? ofrece.head_count
  if (hb && ho) {
    const ratio = ho / hb
    if (ratio < 0.4 || ratio > 4) return null
    return mismaZona
      ? `misma zona (${ofrece.zona}) y superficie compatible: pide ${hb} ha, ofrecen ${ho} ha`
      : `misma provincia (${busca.province}) y superficie compatible: pide ${hb} ha, ofrecen ${ho} ha`
  }
  return mismaZona
    ? `misma zona (${ofrece.zona})`
    : `misma provincia (${busca.province})`
}

export async function correrOvejero(db: SupabaseClient): Promise<ReporteOvejero> {
  const { data } = await db
    .from('producer_leads')
    .select(
      'id, created_at, intent, province, zona, category, head_count, hectareas, name, phone, email, message, status, estimated_value_ars, fee_ars',
    )
    .in('status', ['new', 'routed', 'contacted'])
    .order('created_at', { ascending: false })
    .limit(500)

  const leads = (data ?? []) as LeadRow[]
  const busca = leads.filter((l) => l.intent === 'arrendar_busco')
  const ofrece = leads.filter((l) => l.intent === 'arrendar_ofrezco')

  // 1 · Matches de arrendamiento
  const matches: MatchArrendamiento[] = []
  for (const b of busca) {
    for (const o of ofrece) {
      const motivo = compatibilidadZona(b, o)
      if (motivo) matches.push({ busca: b, ofrece: o, motivo })
    }
  }

  // 2 · Leads sin rutear que ya esperaron demasiado
  const pendientes: LeadPendiente[] = leads
    .filter((l) => l.status === 'new')
    .map((l) => ({ lead: l, diasEsperando: diasDesde(l.created_at) }))
    .filter((p) => p.diasEsperando >= DIAS_AVISO)
    .map((p) => ({
      ...p,
      urgente: p.diasEsperando >= DIAS_URGENTE,
      waLink: whatsappLink(
        p.lead.phone,
        `Hola ${p.lead.name ?? ''}, soy José de consignatarias.com.ar. Recibí tu consulta` +
          `${p.lead.hectareas ? ` por ${p.lead.hectareas} ha` : ''}${p.lead.zona ? ` en ${p.lead.zona}` : ''}. ¿Seguís buscando?`,
      ),
    }))
    .sort((a, b) => b.diasEsperando - a.diasEsperando)

  // 3 · Provincias con demanda y sin oferta: a quién pedirle cartera
  const zonasSinOferta: ZonaSinOferta[] = []
  const provinciasConDemanda = new Map<string, LeadRow[]>()
  for (const b of busca) {
    if (matches.some((m) => m.busca.id === b.id)) continue // ya tiene con quién cruzarse
    const key = b.province || '(sin provincia)'
    provinciasConDemanda.set(key, [...(provinciasConDemanda.get(key) ?? []), b])
  }

  for (const [provincia, pedidos] of provinciasConDemanda) {
    const firmas = await matchConsignatarias(db, { province: provincia, limit: 4 })
    const hectareas = pedidos.reduce((s, p) => s + (p.hectareas ?? 0), 0)
    const detalle = pedidos
      .map((p) => `${p.hectareas ?? '?'} ha en ${p.zona ?? provincia}`)
      .join(' y ')
    const mensajeSugerido =
      `Hola, soy José de consignatarias.com.ar. Tengo ${pedidos.length} ` +
      `${pedidos.length === 1 ? 'productor buscando' : 'productores buscando'} campo para arrendar en ` +
      `${provincia} (${detalle}). ¿Tenés algo en cartera? Te los paso sin cargo.`
    zonasSinOferta.push({
      provincia,
      buscan: pedidos.length,
      hectareasPedidas: hectareas,
      firmas: firmas.map((f) => ({
        displayName: f.displayName,
        slug: f.slug,
        waLink: whatsappLink(f.whatsapp || f.phone, mensajeSugerido),
      })),
      mensajeSugerido,
    })
  }

  const { count: demandasActivas } = await db
    .from('demanda_compra')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  return {
    matches,
    pendientes,
    zonasSinOferta,
    hayAlgoQueHacer: matches.length > 0 || pendientes.length > 0 || zonasSinOferta.length > 0,
    totales: { leadsActivos: leads.length, demandasActivas: demandasActivas ?? 0 },
  }
}
