import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { resolveYoutubeUrl } from '@/lib/youtube-live'
import { resolverStream, contactoClicable, videoEnVivoDelCanal, idDeVideo } from '@/lib/streams'
import { getEffectiveStatus } from '@/lib/ui/tokens'
import { createServiceClient } from '@/lib/supabase'
import type { StreamItem } from '@/components/remates/StreamWall'

/**
 * El estado de las transmisiones de hoy, calculado en un solo lugar.
 *
 * POR QUÉ EXISTE. Esto vivía adentro de `/remates/en-vivo/page.tsx`, que revalida
 * cada varios minutos. Con la página sola, un remate que arrancaba a las 14:00
 * podía tardar en aparecer al aire, y una vez pintada no se enteraba de nada más:
 * quien dejaba la pestaña abierta seguía viendo el estado del momento en que
 * entró. El muro ahora repregunta cada medio minuto y necesita la misma cuenta
 * que hace el servidor para la primera pintada, así que la cuenta se mudó acá y
 * la usan los dos: la página para el SSR y `/api/remates/en-vivo/estado` para el
 * refresco.
 */

/** Hoy en Argentina, en formato YYYY-MM-DD. */
export function hoyArgentina(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export interface RemateBase {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string
  time: string | null
  location: string
  province: string
  type: string
  mainCategory: string
  estimatedHeads: number | null
  description: string
  youtubeUrl: string | null
  catalogUrl: string | null
  sourceUrl: string | null
  status: string
}

/**
 * Clave estable para el ancla del stream. NO se usa `remate.id`: se reasigna en
 * cada scrape, así que un link compartido apuntaría a otro remate mañana.
 */
export function claveStream(r: { consignatariaSlug: string; date: string; time: string | null }): string {
  return `${r.consignatariaSlug}-${r.date}${r.time ? '-' + r.time.replace(':', '') : ''}`
}

/** Minutos desde medianoche, o null si no sabemos la hora. */
export function minutosDeHora(t: string | null | undefined): number | null {
  if (!t || t === '00:00') return null
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Sesiones que NUESTRO capturador declara en vivo ahora mismo. */
const SESION_FRESCA_MIN = 20

async function sesionesEnVivo(): Promise<Map<string, string>> {
  const salida = new Map<string, string>()
  const db = createServiceClient()
  if (!db) return salida
  const desde = new Date(Date.now() - SESION_FRESCA_MIN * 60_000).toISOString()
  const { data } = await db
    .from('live_remate_session')
    .select('consignataria_slug, youtube_url, last_seen')
    .eq('status', 'live')
    .gte('last_seen', desde)
  for (const row of data ?? []) {
    const r = row as { consignataria_slug: string | null; youtube_url: string | null }
    if (r.consignataria_slug && r.youtube_url) salida.set(r.consignataria_slug, r.youtube_url)
  }
  return salida
}

async function traerContactos(slugs: string[]): Promise<Map<string, { phone: string | null; whatsapp: string | null }>> {
  const salida = new Map<string, { phone: string | null; whatsapp: string | null }>()
  const db = createServiceClient()
  if (!db || slugs.length === 0) return salida
  const { data } = await db
    .from('consignatarias')
    .select('canonical_slug, phone, whatsapp')
    .in('canonical_slug', slugs)
  for (const row of data ?? []) {
    const r = row as { canonical_slug: string; phone: string | null; whatsapp: string | null }
    salida.set(r.canonical_slug, { phone: r.phone, whatsapp: r.whatsapp })
  }
  return salida
}

export interface RemateResuelto extends RemateBase {
  confidence: 'confirmed' | 'probable'
  watchUrl: string
}

/** Los remates de hoy en adelante que se pueden ver por YouTube, ordenados. */
export function rematesTransmitibles(hoy: string): RemateResuelto[] {
  return (remates as RemateBase[])
    .filter((r) => r.date >= hoy)
    .map((r) => {
      const resolved = resolveYoutubeUrl(r)
      if (!resolved) return null
      return { ...r, confidence: resolved.confidence, watchUrl: resolved.url }
    })
    .filter((r): r is RemateResuelto => r !== null)
    .sort((a, b) => {
      if (a.date === hoy && b.date !== hoy) return -1
      if (b.date === hoy && a.date !== hoy) return 1
      if (a.confidence !== b.confidence) return a.confidence === 'confirmed' ? -1 : 1
      const porFecha = a.date.localeCompare(b.date)
      if (porFecha !== 0) return porFecha
      return (a.time || '23:59').localeCompare(b.time || '23:59')
    })
}

/**
 * La pared de hoy: un item por remate que tenga algo REAL para reproducir.
 *
 * `frescuraSegundos` decide cuánto se cachea la pregunta a YouTube. La página la
 * pide con holgura porque su propio HTML ya está cacheado; el endpoint del
 * refresco la pide corta, que es lo que hace que el muro reaccione.
 */
export async function construirPared(hoy: string, frescuraSegundos = 900): Promise<StreamItem[]> {
  const deHoy = rematesTransmitibles(hoy).filter((r) => r.date === hoy)
  if (deHoy.length === 0) return []

  const canonicos = Array.from(
    new Set(deHoy.map((r) => getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug)),
  )
  const [contactos, enVivoPropio] = await Promise.all([traerContactos(canonicos), sesionesEnVivo()])

  // A YouTube se le pregunta UNA vez por canal, no una por remate: varias firmas
  // del mismo grupo comparten canal y hoy hay 23 remates para ~10 canales.
  const canalesDeHoy = new Map<string, string | null>()
  await Promise.all(
    deHoy.map(async (r) => {
      if (r.youtubeUrl) return
      const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug
      if (enVivoPropio.has(canonical)) return
      const emb = resolverStream(r)
      if (!emb || emb.tipo !== 'canal') return
      const chId = emb.embedUrl.match(/channel=([^&]+)/)?.[1]
      if (!chId || canalesDeHoy.has(chId)) return
      canalesDeHoy.set(chId, await videoEnVivoDelCanal(chId, frescuraSegundos))
    }),
  )

  return deHoy
    .map((r): StreamItem | null => {
      const emb = resolverStream(r)
      if (!emb) return null
      const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug

      let embedUrl = emb.embedUrl
      const propio = idDeVideo(enVivoPropio.get(canonical) ?? null)
      if (propio) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${propio}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
      } else if (emb.tipo === 'canal') {
        const chId = emb.embedUrl.match(/channel=([^&]+)/)?.[1]
        const vid = chId ? canalesDeHoy.get(chId) : null
        // Canal sin transmisión en curso: no hay nada que reproducir. Fuera.
        if (!vid) return null
        embedUrl = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
      }

      const c = contactos.get(canonical)
      const { tel, wa, visible } = contactoClicable(c?.phone, c?.whatsapp)
      return {
        id: claveStream(r),
        enVivoAhora: getEffectiveStatus(r.date, r.time, hoy) === 'live',
        titulo: r.title,
        firma: r.consignatariaName,
        slug: canonical,
        perfilHref: consignatariaProfilePath(r.consignatariaSlug),
        embedUrl,
        watchUrl: emb.watchUrl,
        confianza: emb.confianza,
        hora: r.time,
        lugar: r.province || null,
        tel,
        wa,
        telVisible: visible,
      }
    })
    .filter((s): s is StreamItem => s !== null)
}
