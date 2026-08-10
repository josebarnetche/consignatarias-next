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
  routed_at?: string | null
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

/** Lead que ya se consultó y sigue sin resolverse. El "¿y si no responden?". */
export interface LeadSinRespuesta {
  lead: LeadRow
  resumen: string
  firmasConsultadas: number
  diasDesdePrimeraConsulta: number
  quedanFirmas: number
  agotado: boolean
  diagnostico: string
}

interface EstadoConsultas {
  firmasConsultadas: number
  ultimaConsulta: Date | null
  primeraConsulta: Date | null
  slugsConsultados: Set<string>
}

/** Cuántas firmas se consultaron por cada lead y cuándo — la memoria del agente. */
async function estadoPorLead(db: SupabaseClient, leadIds: number[]): Promise<Map<number, EstadoConsultas>> {
  const mapa = new Map<number, EstadoConsultas>()
  if (leadIds.length === 0) return mapa
  const { data } = await db
    .from('outreach_log')
    .select('consignataria_slug, notes, sent_at')
    .eq('type', OUTREACH_TYPE)
    .order('sent_at', { ascending: true })

  for (const row of data ?? []) {
    const m = /lead_id=(\d+)\|/.exec(row.notes ?? '')
    if (!m) continue
    const id = Number(m[1])
    if (!leadIds.includes(id)) continue
    const prev = mapa.get(id) ?? {
      firmasConsultadas: 0,
      ultimaConsulta: null,
      primeraConsulta: null,
      slugsConsultados: new Set<string>(),
    }
    const cuando = row.sent_at ? new Date(row.sent_at) : null
    prev.slugsConsultados.add(row.consignataria_slug)
    prev.firmasConsultadas = prev.slugsConsultados.size
    if (cuando) {
      if (!prev.primeraConsulta) prev.primeraConsulta = cuando
      prev.ultimaConsulta = cuando
    }
    mapa.set(id, prev)
  }
  return mapa
}

export interface ReporteOvejero {
  matches: MatchArrendamiento[]
  pendientes: LeadPendiente[]
  zonasSinOferta: ZonaSinOferta[]
  ranking: LeadRankeado[]
  consultas: ConsultaEnviada[]
  sinRespuesta: LeadSinRespuesta[]
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
/**
 * MODO INFORME POR DEFECTO (10-ago-2026). El agente sigue rankeando leads y
 * mandando el digest, pero NO le escribe a las consignatarias.
 *
 * Por qué: la doctrina es que el lead es nuestro. Un agente que le escribe a
 * doce firmas por cinco leads gasta relación ajena a cambio de poco, y con esta
 * base de leads todavía chica el criterio no está probado. Se enciende a
 * propósito con OVEJERO_OUTREACH=on.
 */
export const OUTREACH_ACTIVO = (process.env.OVEJERO_OUTREACH || 'off').toLowerCase() === 'on'
/** Nunca dos consultas a la misma firma por el mismo lead, ni a la misma casilla en 30 días. */
const DIAS_ENTRE_CONSULTAS = 30
const OUTREACH_TYPE = 'ovejero_lead_match'
const MAX_FIRMAS_POR_LEAD = 2
/**
 * Qué pasa si no contestan. Tres reglas, porque insistir sin criterio quema la
 * zona y no insistir deja el lead muerto:
 *  · Se espera DIAS_ESPERA_RESPUESTA antes de ir por la tanda siguiente de firmas
 *    (mandar 6 mails el mismo día a un pueblo es la forma más rápida de quemarlo).
 *  · Se corta en MAX_FIRMAS_TOTAL por lead: agotado eso, no se gasta más cupo.
 *  · Al agotarse, el lead sube al digest con diagnóstico y opciones para Jose.
 */
const DIAS_ESPERA_RESPUESTA = 3
const MAX_FIRMAS_TOTAL_POR_LEAD = 6

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

/**
 * ¿Este lead está en condiciones de que le escribamos a una firma real?
 *
 * El 2026-08-07 el agente le escribió a Reggi diciendo "quiere vender ? novillos en
 * zona s/d" — un lead sin zona ni cantidad. Los límites de VOLUMEN funcionaban; lo
 * que faltaba era el de CALIDAD. Un mail así quema la relación con la firma y nos
 * hace quedar como un robot, que es exactamente lo que no queremos ser.
 */
export function leadConsultable(l: LeadRow): { ok: boolean; motivo?: string } {
  if (!l.province && !l.zona) return { ok: false, motivo: 'sin provincia ni zona: la firma no sabría de dónde le hablamos' }
  if (l.intent === 'vender' && !l.head_count) return { ok: false, motivo: 'venta sin cantidad de cabezas' }
  if ((l.intent === 'arrendar_busco' || l.intent === 'arrendar_ofrezco') && !l.hectareas) {
    return { ok: false, motivo: 'arrendamiento sin hectáreas' }
  }
  if (!l.phone && !l.email) return { ok: false, motivo: 'sin forma de contactar al productor' }
  // Ya lo ruteaste: la firma que corresponde ya lo tiene. Volver a preguntar por
  // ahí duplica el trabajo y te deja mal parado con las dos puntas.
  if (l.routed_at) return { ok: false, motivo: 'ya está ruteado a una firma' }
  return { ok: true }
}

/**
 * Casillas a las que no se le manda una consulta comercial: prensa, marketing y
 * RRHH no resuelven un lead y encima nos fichan como spam. Rosgan recibió la
 * primera consulta en prensarosgan@ — de ahí la lista.
 */
const CASILLAS_NO_COMERCIALES = /^(prensa|press|prensarosgan|marketing|comunicacion|comunicaciones|rrhh|recursos|empleos|jobs|legales|newsletter|no-?reply|noreply)/i

function esCasillaComercial(email: string): boolean {
  const local = email.split('@')[0] ?? ''
  return !CASILLAS_NO_COMERCIALES.test(local)
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
      .filter((c) => c.email && c.email.includes('@') && esCasillaComercial(c.email.trim()))
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
): Promise<{ enviadas: ConsultaEnviada[]; sinRespuesta: LeadSinRespuesta[] }> {
  const sinRespuesta: LeadSinRespuesta[] = []
  if (!OUTREACH_ACTIVO || MAX_CONSULTAS_DIA === 0) return { enviadas: [], sinRespuesta }
  const enviadas: ConsultaEnviada[] = []
  const estados = await estadoPorLead(db, ranking.map((r) => r.lead.id))
  const ahora = Date.now()

  for (const { lead } of ranking) {
    // Portero de calidad ANTES que cualquier otra cosa: nunca se le escribe a una
    // firma real por un lead incompleto. Sube al digest para que lo completen.
    const calidad = leadConsultable(lead)
    if (!calidad.ok) {
      sinRespuesta.push({
        lead,
        resumen: resumenLead(lead),
        firmasConsultadas: 0,
        diasDesdePrimeraConsulta: 0,
        quedanFirmas: 0,
        agotado: false,
        diagnostico: `No le escribo a ninguna firma por este lead: ${calidad.motivo}. Completalo desde el board o llamalo vos y lo retomo.`,
      })
      continue
    }

    const est = estados.get(lead.id)
    const yaConsultadas = est?.firmasConsultadas ?? 0
    const resumenPrevio = resumenLead(lead)

    if (yaConsultadas > 0) {
      const diasDesdeUltima = est?.ultimaConsulta
        ? Math.floor((ahora - est.ultimaConsulta.getTime()) / 86_400_000)
        : 99
      const diasDesdePrimera = est?.primeraConsulta
        ? Math.floor((ahora - est.primeraConsulta.getTime()) / 86_400_000)
        : 0

      // Techo: ya se preguntó bastante. No se gasta más cupo, sube a decisión.
      if (yaConsultadas >= MAX_FIRMAS_TOTAL_POR_LEAD) {
        sinRespuesta.push({
          lead,
          resumen: resumenPrevio,
          firmasConsultadas: yaConsultadas,
          diasDesdePrimeraConsulta: diasDesdePrimera,
          quedanFirmas: 0,
          agotado: true,
          diagnostico:
            `Consulté ${yaConsultadas} firmas de ${lead.province ?? 'la zona'} en ${diasDesdePrimera} días y no apareció nada. ` +
            `Se agotó lo que puedo hacer solo: o le avisás al productor que por ahora no hay, o ampliamos a provincias vecinas.`,
        })
        continue
      }

      // Paciencia: darle aire a las firmas ya consultadas antes de ir por más.
      if (diasDesdeUltima < DIAS_ESPERA_RESPUESTA) {
        sinRespuesta.push({
          lead,
          resumen: resumenPrevio,
          firmasConsultadas: yaConsultadas,
          diasDesdePrimeraConsulta: diasDesdePrimera,
          quedanFirmas: MAX_FIRMAS_TOTAL_POR_LEAD - yaConsultadas,
          agotado: false,
          diagnostico: `${yaConsultadas} ${yaConsultadas === 1 ? 'firma consultada' : 'firmas consultadas'}, esperando respuesta (${diasDesdeUltima} ${diasDesdeUltima === 1 ? 'día' : 'días'}). Si no contestan sigo con las que faltan.`,
        })
        continue
      }
    }

    if (enviadas.length >= MAX_CONSULTAS_DIA) break
    const firmas = await firmasParaConsultar(db, lead)
    const resumen = resumenLead(lead)

    // Sin firmas nuevas en la zona: se acabó la cantera, no es falta de ganas.
    if (firmas.length === 0 && yaConsultadas > 0) {
      sinRespuesta.push({
        lead,
        resumen,
        firmasConsultadas: yaConsultadas,
        diasDesdePrimeraConsulta: est?.primeraConsulta
          ? Math.floor((ahora - est.primeraConsulta.getTime()) / 86_400_000)
          : 0,
        quedanFirmas: 0,
        agotado: true,
        diagnostico:
          `No quedan firmas con email en ${lead.province ?? 'la zona'} sin consultar (llevo ${yaConsultadas}). ` +
          `Para seguir hace falta cargar más correos de consignatarias o ampliar la búsqueda.`,
      })
      continue
    }

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
  return { enviadas, sinRespuesta }
}

export async function correrOvejero(db: SupabaseClient): Promise<ReporteOvejero> {
  const { data } = await db
    .from('producer_leads')
    .select(
      'id, created_at, intent, province, zona, category, head_count, hectareas, name, phone, email, message, status, estimated_value_ars, fee_ars, routed_at',
    )
    .in('status', ['new', 'routed', 'contacted'])
    .order('created_at', { ascending: false })
    .limit(500)

  const leads = (data ?? []) as LeadRow[]
  const busca = leads.filter((l) => l.intent === 'arrendar_busco')
  const ofrece = leads.filter((l) => l.intent === 'arrendar_ofrezco')

  // 1 · Matches de arrendamiento: contra otros leads Y contra los campos publicados
  // en la inmobiliaria rural (que es de donde ahora sale la oferta de verdad).
  const matches: MatchArrendamiento[] = []
  for (const b of busca) {
    for (const o of ofrece) {
      const motivo = compatibilidadZona(b, o)
      if (motivo) matches.push({ busca: b, ofrece: o, motivo })
    }
  }

  const { data: camposPub } = await db
    .from('campos')
    .select('id, slug, hectareas, provincia, partido, operacion, precio_kg_ha_mes')
    .eq('status', 'publicado')
    .neq('operacion', 'venta')
    .limit(200)

  for (const b of busca) {
    for (const campo of camposPub ?? []) {
      // Se reusa la misma compatibilidad tratando al campo como si fuera un lead.
      const comoLead: LeadRow = {
        id: -campo.id,
        created_at: new Date().toISOString(),
        intent: 'arrendar_ofrezco',
        province: campo.provincia,
        zona: campo.partido,
        category: null,
        head_count: null,
        hectareas: campo.hectareas,
        name: `Campo publicado #${campo.id}`,
        phone: null,
        email: null,
        message: campo.slug,
        status: 'publicado',
        estimated_value_ars: null,
        fee_ars: null,
      }
      const motivo = compatibilidadZona(b, comoLead)
      if (motivo) {
        matches.push({
          busca: b,
          ofrece: comoLead,
          motivo: `${motivo} — campo publicado en /campos/${campo.slug}`,
        })
      }
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
      `${provincia} (${detalle}). ¿Tenés algo en cartera? Avisame y se lo comunico.`
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
    sinRespuesta: [],
    hayAlgoQueHacer: matches.length > 0 || pendientes.length > 0 || zonasSinOferta.length > 0,
    totales: { leadsActivos: leads.length, demandasActivas: demandasActivas ?? 0 },
  }
}
