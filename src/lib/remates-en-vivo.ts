import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath, getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
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

/**
 * El nombre de la firma como figura en su ficha, no como vino del scraper.
 *
 * El scraper guarda lo que dice cada sitio, y a veces eso es "Saenz Valiente
 * Bullrich 2020" —con el año del nombre de la campaña pegado— o una razón social
 * cortada. En un cartel de "próxima transmisión" eso se lee como un error nuestro.
 */
export function nombreDeFirma(r: { consignatariaSlug: string; consignatariaName: string }): string {
  const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug
  return getProfile(canonical)?.displayName ?? r.consignatariaName
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

  const ahoraMin = minutosAhoraArgentina()
  const items = deHoy
    .map((r): (StreamItem & { _distancia: number }) | null => {
      const emb = resolverStream(r)
      if (!emb) return null
      const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug

      let embedUrl = emb.embedUrl
      let videoId = idDeVideo(embedUrl)
      // `alAireConfirmado` = alguien que NO es nuestra agenda dice que está al aire:
      // nuestro capturador o el propio YouTube.
      let alAireConfirmado = false
      const propio = idDeVideo(enVivoPropio.get(canonical) ?? null)
      if (propio) {
        embedUrl = embedDe(propio)
        videoId = propio
        alAireConfirmado = true
      } else if (emb.tipo === 'canal') {
        const chId = emb.embedUrl.match(/channel=([^&]+)/)?.[1]
        const vid = chId ? canalesDeHoy.get(chId) : null
        // Canal sin transmisión en curso: no hay nada que reproducir. Fuera.
        if (!vid) return null
        embedUrl = embedDe(vid)
        videoId = vid
        alAireConfirmado = true
      }

      const c = contactos.get(canonical)
      const { tel, wa, visible } = contactoClicable(c?.phone, c?.whatsapp)
      const inicio = minutosDeHora(r.time)
      return {
        id: claveStream(r),
        // EL HECHO LE GANA AL HORARIO. La agenda supone que un remate dura tres
        // horas, y las ferias grandes se pasan: con la regla de la agenda sola,
        // a las tres horas justas el muro le sacaba el player de adelante a quien
        // lo estaba mirando, con el martillo todavía bajando. Si YouTube o nuestro
        // capturador dicen que está al aire, está al aire. La agenda decide sólo
        // cuando no hay nadie más que lo sepa (el video directo del JSON).
        enVivoAhora: alAireConfirmado || getEffectiveStatus(r.date, r.time, hoy) === 'live',
        videoId,
        titulo: r.title,
        firma: nombreDeFirma(r),
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
        _distancia: inicio === null ? 9999 : Math.abs(ahoraMin - inicio),
      }
    })
    .filter((s): s is StreamItem & { _distancia: number } => s !== null)

  // UN RECUADRO POR VIDEO. Una firma con tres remates el mismo día en el mismo
  // canal —UMC tenía tres el 18-sep— resolvía los tres al mismo video en vivo, y
  // el muro mostraba la misma transmisión tres veces. Queda el remate cuyo
  // horario está más cerca de ahora, que es el que se está rematando.
  return unoPorVideo(items).map(({ _distancia, ...s }) => {
    void _distancia
    return s
  })
}

/**
 * Deja un solo item por video: el de horario más cercano a ahora (`_distancia`
 * menor). Los que no tienen video se conservan todos. Exportada para testearla.
 */
export function unoPorVideo<T extends { videoId?: string | null; _distancia: number }>(items: T[]): T[] {
  const porVideo = new Map<string, T>()
  const sinVideo: T[] = []
  for (const it of items) {
    if (!it.videoId) {
      sinVideo.push(it)
      continue
    }
    const previo = porVideo.get(it.videoId)
    if (!previo || it._distancia < previo._distancia) porVideo.set(it.videoId, it)
  }
  return [...porVideo.values(), ...sinVideo]
}

function embedDe(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
}

function minutosAhoraArgentina(): number {
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  return art.getHours() * 60 + art.getMinutes()
}

/** Un remate que ya pasó y quedó grabado. Es lo que llena el muro cuando nadie transmite. */
export interface Repeticion {
  id: string
  videoId: string
  firma: string
  titulo: string
  fecha: string
  perfilHref: string
  watchUrl: string
  tel: string | null
  wa: string | null
  telVisible: string | null
}

/**
 * Los últimos remates grabados, del más nuevo al más viejo.
 *
 * POR QUÉ. El estado más común de esta página es "no hay nada al aire": un lunes
 * hay tres remates, y de noche ninguno. Hasta ahora eso era un recuadro vacío, y
 * un recuadro vacío es la puerta de salida: la mediana de permanencia en la página
 * era de 20 segundos. Un remate grabado es contenido de verdad —de una a tres
 * horas de hacienda entrando a la pista, con el teléfono de la firma al lado—, y
 * es exactamente lo que alguien que vino a ver un remate quiere ver.
 *
 * Sólo remates con video DIRECTO en la base (el scraper lo adjunta después de la
 * transmisión). No se inventa nada: si no hay grabaciones, no hay sección.
 */
export async function repeticionesRecientes(hoy: string, cuantas = 8): Promise<Repeticion[]> {
  const vistos = new Set<string>()
  const pasados = (remates as RemateBase[])
    .filter((r) => r.date < hoy && r.youtubeUrl)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
    .map((r) => ({ r, videoId: idDeVideo(r.youtubeUrl) }))
    .filter((x): x is { r: RemateBase; videoId: string } => {
      if (!x.videoId || vistos.has(x.videoId)) return false
      vistos.add(x.videoId)
      return true
    })
    .slice(0, cuantas)
  if (pasados.length === 0) return []

  const contactos = await traerContactos(
    Array.from(new Set(pasados.map(({ r }) => getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug))),
  )
  return pasados.map(({ r, videoId }) => {
    const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug
    const c = contactos.get(canonical)
    const { tel, wa, visible } = contactoClicable(c?.phone, c?.whatsapp)
    return {
      id: `rep-${videoId}`,
      videoId,
      firma: nombreDeFirma(r),
      titulo: r.title,
      fecha: r.date,
      perfilHref: consignatariaProfilePath(r.consignatariaSlug),
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      tel,
      wa,
      telVisible: visible,
    }
  })
}
