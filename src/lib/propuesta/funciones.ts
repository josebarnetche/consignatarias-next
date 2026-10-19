/**
 * Datos para la sección "Lo que va a ver y usar" de la propuesta PRO (17-10-2026).
 *
 * La propuesta mostraba los números de la firma y una lista de beneficios; Jose pidió
 * que la firma VEA lo que compra: cada función con la captura de cómo queda dentro del
 * sitio. Las capturas se arman con los componentes reales (la fila del calendario, el
 * mail semanal, el panel) y con los datos reales de la firma donde son públicos o
 * suyos sin comprometer a terceros: sus remates, su lugar en el directorio, sus vistas.
 * Lo que lleva datos de terceros (la cartera de remitentes del MAG, las consultas con
 * contacto) va con datos de EJEMPLO y rotulado así: la propuesta la puede pedir
 * cualquiera con un mail.
 */
import 'server-only'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile, getCanonicalSlug, type ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { createServiceClient } from '@/lib/supabase'
import { construirOrigenVisitas, type OrigenVisitas } from '@/lib/reports/origen-visitas'
import { armarRematesNewsletter, type RemateNewsletter } from '@/lib/newsletter/remates-semana'
import { isWeeklyRecipient } from '@/lib/newsletter-segments'
import { hoyArgentina } from '@/lib/remates-en-vivo'

const auctions = rematesData as unknown as Auction[]
const DIA = 86_400_000

export interface DatosFunciones {
  /** Filas del calendario: los próximos de la firma (PRO) mezclados con otros. */
  calendario: { remate: Auction; pro: boolean }[]
  /** El mail semanal tal como saldría con la firma PRO. */
  newsletter: { remates: RemateNewsletter[]; total: number; semana: string }
  /** Destinatarios del semanal hoy (mismo filtro que el envío). null = no se pudo medir. */
  destinatariosSemanal: number | null
  /** La firma primera y otras de su provincia, como en el directorio. */
  directorio: { nombre: string; slug: string; remates: number; pro: boolean }[]
  provincia: string | null
  /** Vistas de la ficha (30 días) con su origen, y visitas desde IAs (90 días). */
  origen: OrigenVisitas | null
}

function fecha(hoy: string, dias: number): string {
  return new Date(Date.parse(`${hoy}T12:00:00Z`) + dias * DIA).toISOString().slice(0, 10)
}

export async function getDatosFunciones(profile: ConsignatariaProfile): Promise<DatosFunciones> {
  const slug = profile.canonicalSlug
  const hoy = hoyArgentina()
  const enSemana = fecha(hoy, 7)
  const propios = getAuctionsForProfile(auctions, slug)
    .filter((a) => a.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date))
  const esPropio = (a: Auction) => (getCanonicalSlug(a.consignatariaSlug) || a.consignatariaSlug) === slug

  // CALENDARIO: sus dos próximos remates entre los de otras firmas de LOS MISMOS días,
  // que es como lo ve el productor que recorre una fecha.
  const susFechas = new Set(propios.slice(0, 2).map((a) => a.date))
  const mismoDia = auctions
    .filter((a) => susFechas.has(a.date) && !esPropio(a))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const otros = mismoDia.length >= 2
    ? mismoDia
    : auctions.filter((a) => a.date >= hoy && a.date <= enSemana && !esPropio(a)).sort((a, b) => a.date.localeCompare(b.date))
  const calendario = [
    ...propios.slice(0, 2).map((remate) => ({ remate, pro: true })),
    ...otros.slice(0, 3).map((remate) => ({ remate, pro: false })),
  ].sort((a, b) => a.remate.date.localeCompare(b.remate.date) || Number(b.pro) - Number(a.pro))

  // NEWSLETTER: la semana que viene, con la firma marcada PRO. Si no tiene remate en
  // los próximos 7 días se suma el próximo que tenga, para que se vea cómo sale.
  const semana = auctions.filter((a) => a.date >= hoy && a.date <= enSemana)
  const conPropio = propios[0] && !semana.includes(propios[0]) ? [...semana, propios[0]] : semana
  const { remates } = armarRematesNewsletter(conPropio, new Set([slug]), 6)
  const fmt = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`
  const newsletter = { remates, total: semana.length, semana: `${fmt(hoy)} - ${fmt(enSemana)}` }

  // DIRECTORIO: la firma primera y las que más rematan en su provincia.
  const provincia = propios[0]?.province ?? getAuctionsForProfile(auctions, slug)[0]?.province ?? null
  const perfiles = new Map(getAllProfiles().map((p) => [p.canonicalSlug, p.displayName]))
  const conteo = new Map<string, number>()
  for (const a of auctions) {
    if (!provincia || a.province !== provincia || a.date < hoy) continue
    const c = getCanonicalSlug(a.consignatariaSlug) || a.consignatariaSlug
    if (c !== slug && perfiles.has(c)) conteo.set(c, (conteo.get(c) ?? 0) + 1)
  }
  const directorio = [
    { nombre: profile.displayName, slug, remates: propios.length, pro: true },
    ...[...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s, n]) => ({ nombre: perfiles.get(s)!, slug: s, remates: n, pro: false })),
  ]

  // Lo que necesita la base: destinatarios del semanal y origen de las vistas.
  let destinatariosSemanal: number | null = null
  let origen: OrigenVisitas | null = null
  const db = createServiceClient()
  if (db) {
    try {
      const { data } = await db.from('newsletter_subscribers').select('source').eq('status', 'active').limit(5000)
      if (data) destinatariosSemanal = data.filter((s) => isWeeklyRecipient(s.source)).length
    } catch { /* se omite la cifra */ }
    try {
      const desde30 = new Date(Date.now() - 30 * DIA).toISOString()
      const desde90 = new Date(Date.now() - 90 * DIA).toISOString()
      const ficha = `/consignatarias/${slug}`
      const [vistas, ias] = await Promise.all([
        db.from('profile_views').select('viewed_at, referrer').eq('entity_type', 'consignataria')
          .eq('entity_slug', slug).gte('viewed_at', desde30).limit(1000),
        db.from('ai_referrals').select('engine, path').like('path', `${ficha}%`).gte('created_at', desde90).limit(5000),
      ])
      const propias = (ias.data ?? []).filter((r) => {
        const p = (r.path ?? '').split(/[?#]/)[0].replace(/\/+$/, '')
        return p === ficha || p.startsWith(ficha + '/')
      })
      const filas = (vistas.data ?? []).filter((v): v is { viewed_at: string; referrer: string | null } => !!v.viewed_at)
      origen = construirOrigenVisitas(filas, propias, ficha)
    } catch { /* se usa la muestra */ }
  }

  return { calendario, newsletter, destinatariosSemanal, directorio, provincia, origen }
}
