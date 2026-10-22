/**
 * Carga de los prospectos PRO desde la base. Todo lo que se muestra en
 * /admin/prospectos sale de acá; el cálculo vive en `prospectos.ts` (puro).
 *
 * Una consulta que falla deja su métrica en `null` y `fallas` lo dice: la página
 * no muestra un cero que no midió.
 */
import 'server-only'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAuctionsForProfile, getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { getFeaturedSlugs } from '@/lib/featured'
import { requireServiceClient } from '@/lib/supabase'
import { hoyArgentina } from '@/lib/remates-en-vivo'
import { CABEZAS_MINIMAS } from '@/lib/leads/calidad'
import type { DatosHacienda } from '@/lib/agente/reglas'
import {
  COOLDOWN_DIAS,
  TIPO_OUTREACH,
  ordenar,
  puntuar,
  type ContextoZona,
  type MetricasFirma,
  type OfertaAPro,
  type PedidoZona,
  type Prospecto,
} from './prospectos'

const DIA = 86_400_000
const auctions = rematesData as unknown as Auction[]

export interface EmbudoPro {
  firmas: number
  conEmail: number
  conTelefono: number
  conVistas30: number
  vistas30: number
  reclamadas: number
  claims: { total: number; aprobados: number; rechazados: number; pendientes: number }
  pro: number
  proPagas: number
  canceladas: number
  /** Ofertas de hacienda que el agente mandó a firmas PRO. */
  ofertasAPro: number
  /** Correos automáticos a firmas (outreach_log) y cuántos tuvieron respuesta. */
  correosAFirmas: number
  respuestasDeFirmas: number
}

export interface DatosProspectos {
  prospectos: Prospecto[]
  embudo: EmbudoPro
  ctx: ContextoZona
  fallas: string[]
}

type Db = ReturnType<typeof requireServiceClient>

/** PostgREST corta en 1.000 filas sin avisar: se pagina hasta el final. */
async function vistasDesde(db: Db, desde: string): Promise<Array<{ entity_slug: string; viewed_at: string }> | null> {
  const out: Array<{ entity_slug: string; viewed_at: string }> = []
  for (let desdeFila = 0; desdeFila < 50_000; desdeFila += 1000) {
    const { data, error } = await db
      .from('profile_views')
      .select('entity_slug, viewed_at')
      .eq('entity_type', 'consignataria')
      .gte('viewed_at', desde)
      .order('id')
      .range(desdeFila, desdeFila + 999)
    if (error) return null
    out.push(...((data ?? []) as Array<{ entity_slug: string; viewed_at: string }>))
    if (!data || data.length < 1000) break
  }
  return out
}

const fechaArg = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10)

export async function getDatosProspectos(): Promise<DatosProspectos> {
  const db = requireServiceClient()
  const fallas: string[] = []
  const ahora = Date.now()
  const hace30 = new Date(ahora - 30 * DIA).toISOString()
  const hace60 = new Date(ahora - 60 * DIA).toISOString()
  const hoy = hoyArgentina()

  const [firmasQ, vistas, pro, leadsQ, ofertasQ, casosQ, outreachQ, bajasNlQ, bajasAgQ, gscQ, claimsQ, subsQ] = await Promise.all([
    db.from('consignatarias').select('canonical_slug, display_name, province, email, phone, whatsapp, verified, claimed_at'),
    vistasDesde(db, hace60),
    getFeaturedSlugs(),
    db
      .from('producer_leads')
      .select('province, intent, category, head_count, status')
      .gte('created_at', hace30)
      .in('intent', ['vender', 'comprar']),
    db.from('agente_ofertas').select('lead_id, tipo').eq('tipo', 'firma'),
    db.from('agente_casos').select('lead_id, lado, estado, datos'),
    db.from('outreach_log').select('consignataria_slug, type, sent_at, response_received_at').not('consignataria_slug', 'is', null)
      // El newsletter guarda el slug de la firma PROMOCIONADA y el mail del suscriptor: no es un correo a la firma.
      .not('type', 'like', 'weekly_newsletter%'),
    db.from('newsletter_subscribers').select('email').eq('status', 'unsubscribed'),
    db.from('agente_bajas').select('email'),
    db.from('gsc_fichas').select('slug, impresiones').eq('periodo_dias', 28),
    db.from('consignataria_claims').select('status'),
    db.from('subscriptions').select('entity_slug, status').eq('entity_type', 'consignataria'),
  ])

  if (firmasQ.error) fallas.push('consignatarias')
  if (vistas === null) fallas.push('profile_views')
  if (leadsQ.error) fallas.push('producer_leads')
  if (ofertasQ.error || casosQ.error) fallas.push('agente')
  if (outreachQ.error) fallas.push('outreach_log')
  if (gscQ.error) fallas.push('gsc_fichas')

  // --- Vistas por firma canónica (todas las variantes del slug) ---
  const porFirma = new Map<string, { v30: number; vPrev: number; dias: Map<string, number> }>()
  for (const r of vistas ?? []) {
    const slug = getCanonicalSlug(r.entity_slug) ?? r.entity_slug
    let f = porFirma.get(slug)
    if (!f) porFirma.set(slug, (f = { v30: 0, vPrev: 0, dias: new Map() }))
    if (r.viewed_at >= hace30) {
      f.v30++
      const d = fechaArg(r.viewed_at)
      f.dias.set(d, (f.dias.get(d) ?? 0) + 1)
    } else f.vPrev++
  }

  // --- Demanda: pedidos de 30 días y lo que hizo el agente ---
  const pedidos30: PedidoZona[] = ((leadsQ.data ?? []) as Array<{ province: string | null; intent: string; category: string | null; head_count: number | null; status: string | null }>)
    .filter((l) => l.status !== 'discarded')
    .map((l) => ({ provincia: l.province, lado: l.intent === 'comprar' ? 'compra' : 'vende', categoria: l.category, cabezas: l.head_count }))
  const casos = (casosQ.data ?? []) as Array<{ lead_id: number; lado: 'vende' | 'compra'; estado: string; datos: DatosHacienda }>
  const casoPorLead = new Map(casos.map((c) => [c.lead_id, c]))
  const aPedido = (c: { lado: 'vende' | 'compra'; datos: DatosHacienda }): PedidoZona => ({
    provincia: c.datos?.provincia ?? null,
    lado: c.lado,
    categoria: c.datos?.categoria ?? null,
    cabezas: c.datos?.cabezas ?? null,
  })
  const ofertasAPro: OfertaAPro[] = ((ofertasQ.data ?? []) as Array<{ lead_id: number }>)
    .map((o) => casoPorLead.get(o.lead_id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map(aPedido)
  const casosVivos = casos
    .filter((c) => ['nuevo', 'ofreciendo', 'sin_contraparte'].includes(c.estado) && (c.datos?.cabezas ?? 0) >= CABEZAS_MINIMAS)
    .map(aPedido)
  const ctx: ContextoZona = { pedidos30, ofertasAPro, casosVivos }

  // --- Historial de correos y bajas ---
  const correos = new Map<string, { n: number; resp: number; ultimo: string | null; informe: string | null }>()
  for (const r of (outreachQ.data ?? []) as Array<{ consignataria_slug: string; type: string; sent_at: string | null; response_received_at: string | null }>) {
    const slug = getCanonicalSlug(r.consignataria_slug) ?? r.consignataria_slug
    const c = correos.get(slug) ?? { n: 0, resp: 0, ultimo: null, informe: null }
    c.n++
    if (r.response_received_at) c.resp++
    if (r.sent_at && (!c.ultimo || r.sent_at > c.ultimo)) c.ultimo = r.sent_at
    if (r.type === TIPO_OUTREACH && r.sent_at && (!c.informe || r.sent_at > c.informe)) c.informe = r.sent_at
    correos.set(slug, c)
  }
  const bajas = new Set(
    [...((bajasNlQ.data ?? []) as Array<{ email: string | null }>), ...((bajasAgQ.data ?? []) as Array<{ email: string | null }>)]
      .map((b) => b.email?.trim().toLowerCase())
      .filter((e): e is string => !!e),
  )
  const gsc = new Map(((gscQ.data ?? []) as Array<{ slug: string; impresiones: number | null }>).map((g) => [g.slug, g.impresiones ?? 0]))
  const cooldown = new Date(ahora - COOLDOWN_DIAS * DIA).toISOString()

  // --- Firmas ---
  type Fila = { canonical_slug: string; display_name: string | null; province: string | null; email: string | null; phone: string | null; whatsapp: string | null; verified: boolean | null; claimed_at: string | null }
  const firmas = (firmasQ.data ?? []) as Fila[]
  const vacio = (s: string | null) => !s || !s.trim()
  const prospectos: Prospecto[] = []
  for (const f of firmas) {
    if (pro.has(f.canonical_slug)) continue
    const v = porFirma.get(f.canonical_slug)
    const email = vacio(f.email) ? null : f.email!.trim()
    const c = correos.get(f.canonical_slug)
    const m: MetricasFirma = {
      slug: f.canonical_slug,
      nombre: (f.display_name || getProfile(f.canonical_slug)?.displayName || f.canonical_slug).trim(),
      provincia: f.province,
      email,
      telefono: vacio(f.whatsapp) ? (vacio(f.phone) ? null : f.phone) : f.whatsapp,
      verificada: !!f.verified,
      reclamada: !!f.claimed_at,
      vistas30: vistas === null ? null : (v?.v30 ?? 0),
      vistasPrevias30: vistas === null ? null : (v?.vPrev ?? 0),
      diasConVisitas30: vistas === null ? null : (v?.dias.size ?? 0),
      maxDia30: vistas === null ? null : Math.max(0, ...(v ? [...v.dias.values()] : [0])),
      googleImpresiones28: gscQ.error ? null : (gsc.get(f.canonical_slug) ?? null),
      rematesProximos: getAuctionsForProfile(auctions, f.canonical_slug).filter((a) => a.date >= hoy).length,
      correosPrevios: c?.n ?? 0,
      respuestasPrevias: c?.resp ?? 0,
      ultimoCorreo: c?.ultimo ?? null,
      informeReciente: !!c?.informe && c.informe >= cooldown,
      dadaDeBaja: !!email && bajas.has(email.toLowerCase()),
    }
    prospectos.push(puntuar(m, ctx))
  }

  const claims = (claimsQ.data ?? []) as Array<{ status: string | null }>
  const subs = (subsQ.data ?? []) as Array<{ entity_slug: string; status: string | null }>
  const embudo: EmbudoPro = {
    firmas: firmas.length,
    conEmail: firmas.filter((f) => !vacio(f.email)).length,
    conTelefono: firmas.filter((f) => !vacio(f.phone) || !vacio(f.whatsapp)).length,
    conVistas30: [...porFirma.values()].filter((v) => v.v30 > 0).length,
    vistas30: [...porFirma.values()].reduce((a, v) => a + v.v30, 0),
    reclamadas: firmas.filter((f) => !!f.claimed_at).length,
    claims: {
      total: claims.length,
      aprobados: claims.filter((c) => c.status === 'approved').length,
      rechazados: claims.filter((c) => c.status === 'rejected').length,
      pendientes: claims.filter((c) => c.status === 'pending').length,
    },
    pro: pro.size,
    proPagas: subs.filter((s) => s.status === 'active').length,
    canceladas: subs.filter((s) => s.status === 'cancelled').length,
    ofertasAPro: ofertasAPro.length,
    correosAFirmas: [...correos.values()].reduce((a, c) => a + c.n, 0),
    respuestasDeFirmas: [...correos.values()].reduce((a, c) => a + c.resp, 0),
  }

  return { prospectos: ordenar(prospectos), embudo, ctx, fallas }
}

/** Un prospecto puntual, recalculado de cero (lo usa el endpoint de envío). */
export async function getProspecto(slug: string): Promise<Prospecto | null> {
  const { prospectos } = await getDatosProspectos()
  return prospectos.find((p) => p.m.slug === slug) ?? null
}
