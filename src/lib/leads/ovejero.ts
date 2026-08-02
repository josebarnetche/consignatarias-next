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

export interface LeadRankeado {
  lead: LeadRow
  score: number
  porQue: string[]
  diasEsperando: number
}

export interface ConsultaEnviada {
  leadId: number
  leadResumen: string
  firma: string
  slug: string
  email: string
}

export interface ReporteOvejero {
  matches: MatchArrendamiento[]
  pendientes: LeadPendiente[]
  zonasSinOferta: ZonaSinOferta[]
  ranking: LeadRankeado[]
  consultas: ConsultaEnviada[]
  hayAlgoQueHacer: boolean
  totales: { leadsActivos: number; demandasActivas: number }
}

/**
 * Ranking de relevancia. Ordena por dónde conviene poner la energía hoy, no por
 * fecha: un lead de 40.000 kg vale más que uno de ayer sin datos, y uno de 60 días
 * ya está frío por más plata que tenga.
 */
export function rankearLeads(leads: LeadRow[]): LeadRankeado[] {
  return leads
    .filter((l) => l.status === 'new')
    .map((lead) => {
      const dias = diasDesde(lead.created_at)
      const porQue: string[] = []
      let score = 0

      // 1 · Plata en juego (lo que más pesa). Sin fee calculado, la superficie sirve de proxy.
      const fee = Number(lead.fee_ars ?? 0)
      if (fee > 0) {
        score += Math.min(50, fee / 20_000)
        porQue.push(`fee estimado $${Math.round(fee).toLocaleString('es-AR')}`)
      } else if (lead.hectareas) {
        score += Math.min(30, lead.hectareas / 10)
        porQue.push(`${lead.hectareas} ha`)
      } else if (lead.head_count) {
        score += Math.min(30, lead.head_count / 5)
        porQue.push(`${lead.head_count} cabezas`)
      }

      // 2 · Urgencia con decaimiento: pica a los 2 días, pico a los 7, muere a los 45.
      if (dias >= DIAS_AVISO && dias <= 45) {
        score += dias <= DIAS_URGENTE ? dias * 3 : Math.max(0, 21 - (dias - DIAS_URGENTE) / 2)
        porQue.push(`${dias} días esperando`)
      } else if (dias > 45) {
        score -= 15
        porQue.push(`frío (${dias} días)`)
      }

      // 3 · Se lo puede trabajar: sin teléfono no hay llamada.
      if (lead.phone) { score += 12; porQue.push('tiene teléfono') }
      if (lead.email) score += 4
      if (lead.zona) { score += 6; porQue.push('zona declarada') }

      return { lead, score: Math.round(score), porQue, diasEsperando: dias }
    })
    .sort((a, b) => b.score - a.score)
}

const DIAS_AVISO = 2
const DIAS_URGENTE = 7

/**
 * Cuántas consultas puede mandar el agente por corrida. Arranca en 3 a propósito:
 * es outreach en frío a firmas reales y el propio repo avisa "RIESGO AUP ALTO".
 * Se sube cuando haya respuestas que lo justifiquen, no antes.
 */
export const MAX_CONSULTAS_DIA = Math.max(0, parseInt(process.env.OVEJERO_MAX_CONSULTAS || '3', 10))
/** Freno de mano: OVEJERO_OUTREACH=off deja el agente en modo informe. */
export const OUTREACH_ACTIVO = (process.env.OVEJERO_OUTREACH || 'on').toLowerCase() !== 'off'
/** Nunca dos consultas a la misma firma por el mismo lead, ni a la misma casilla en 30 días. */
const DIAS_ENTRE_CONSULTAS = 30
const OUTREACH_TYPE = 'ovejero_lead_match'
const MAX_FIRMAS_POR_LEAD = 2

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

function resumenLead(l: LeadRow): string {
  const que =
    l.intent === 'arrendar_busco'
      ? `busca ${l.hectareas ?? '?'} ha para arrendar`
      : l.intent === 'arrendar_ofrezco'
        ? `ofrece ${l.hectareas ?? '?'} ha en arrendamiento`
        : l.intent === 'vender'
          ? `quiere vender ${l.head_count ?? '?'} ${l.category ?? 'cabezas'}`
          : l.intent
  return `${que} en ${l.zona ?? l.province ?? 'zona s/d'}`
}

/**
 * Firmas de la zona a las que se les puede consultar HOY por este lead.
 * Tres frenos, en orden: necesita email · no la contactamos hoy · no le escribimos
 * a esa casilla en los últimos 30 días ni por este lead nunca.
 */
async function firmasParaConsultar(
  db: SupabaseClient,
  lead: LeadRow,
): Promise<Array<{ slug: string; displayName: string; email: string }>> {
  const candidatas = await matchConsignatarias(db, { province: lead.province, limit: 25 })
  if (candidatas.length === 0) return []

  const { data: contactos } = await db
    .from('consignatarias')
    .select('canonical_slug, email')
    .in('canonical_slug', candidatas.map((c) => c.slug))
  const emailPorSlug = new Map(
    (contactos ?? [])
      .filter((c) => c.email && c.email.includes('@'))
      .map((c) => [c.canonical_slug, c.email.trim().toLowerCase()]),
  )

  const desde = new Date(Date.now() - DIAS_ENTRE_CONSULTAS * 86_400_000).toISOString()
  const { data: recientes } = await db
    .from('outreach_log')
    .select('email_sent_to, consignataria_slug, notes')
    .eq('type', OUTREACH_TYPE)
    .gte('sent_at', desde)
  const casillasRecientes = new Set((recientes ?? []).map((r) => r.email_sent_to?.toLowerCase()))

  // Por este lead puntual el corte es para siempre, no 30 días.
  const { data: porEsteLead } = await db
    .from('outreach_log')
    .select('consignataria_slug')
    .eq('type', OUTREACH_TYPE)
    .like('notes', `%lead_id=${lead.id}|%`)
  const yaConsultadasPorEsteLead = new Set((porEsteLead ?? []).map((r) => r.consignataria_slug))

  return candidatas
    .map((c) => ({ slug: c.slug, displayName: c.displayName, email: emailPorSlug.get(c.slug) }))
    .filter(
      (c): c is { slug: string; displayName: string; email: string } =>
        Boolean(c.email) && !casillasRecientes.has(c.email!) && !yaConsultadasPorEsteLead.has(c.slug),
    )
    .slice(0, MAX_FIRMAS_POR_LEAD)
}

/**
 * Manda las consultas del día: agarra los leads mejor rankeados y le pregunta a
 * las firmas de su zona si pueden resolverlo. Cada envío queda en outreach_log
 * ANTES de contar como enviado, así un fallo nunca habilita un reenvío.
 */
export async function enviarConsultas(
  db: SupabaseClient,
  ranking: LeadRankeado[],
  enviar: (dest: { email: string; firma: string; lead: LeadRow; resumen: string }) => Promise<{ success: boolean }>,
): Promise<ConsultaEnviada[]> {
  if (!OUTREACH_ACTIVO || MAX_CONSULTAS_DIA === 0) return []
  const enviadas: ConsultaEnviada[] = []

  for (const { lead } of ranking) {
    if (enviadas.length >= MAX_CONSULTAS_DIA) break
    const firmas = await firmasParaConsultar(db, lead)
    const resumen = resumenLead(lead)

    for (const f of firmas) {
      if (enviadas.length >= MAX_CONSULTAS_DIA) break
      const r = await enviar({ email: f.email, firma: f.displayName, lead, resumen })
      if (!r.success) continue
      await db.from('outreach_log').insert({
        type: OUTREACH_TYPE,
        consignataria_slug: f.slug,
        email_sent_to: f.email,
        notes: `lead_id=${lead.id}| ${resumen}`,
      })
      enviadas.push({ leadId: lead.id, leadResumen: resumen, firma: f.displayName, slug: f.slug, email: f.email })
      await new Promise((res) => setTimeout(res, 400))
    }
  }
  return enviadas
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
    ranking: rankearLeads(leads),
    consultas: [],
    hayAlgoQueHacer: matches.length > 0 || pendientes.length > 0 || zonasSinOferta.length > 0,
    totales: { leadsActivos: leads.length, demandasActivas: demandasActivas ?? 0 },
  }
}
