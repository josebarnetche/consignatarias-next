import { getChannelForSlug } from '@/lib/youtube-live'
import { normalizeUrl } from '@/lib/utils/url'

/**
 * De qué se puede ver un remate SIN salir del sitio.
 *
 * El problema: solo la mitad de los remates trae una URL de video concreta. Del
 * resto sabemos el canal, y hasta ahora eso obligaba a mandar al usuario a
 * YouTube — que es perderlo justo cuando está por mirar un remate nuestro.
 *
 * YouTube tiene un embed por CANAL (`/embed/live_stream?channel=<id>`) que
 * reproduce lo que ese canal esté transmitiendo en ese momento. Con eso los dos
 * casos se resuelven adentro: si hay video, ese video; si no, lo que el canal
 * esté pasando ahora.
 */
export interface StreamEmbebible {
  /** 'video' = URL confirmada del remate · 'canal' = lo que el canal esté dando. */
  tipo: 'video' | 'canal'
  embedUrl: string
  /** A dónde ir si el usuario prefiere YouTube (o si el embed falla). */
  watchUrl: string
  confianza: 'confirmed' | 'probable'
}

export function idDeVideo(url?: string | null): string | null {
  if (!url) return null
  return url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}

/**
 * `mute=1` no es un capricho: sin eso el navegador bloquea el autoplay y el
 * usuario ve un cuadro negro. Los controles quedan visibles a propósito —acá el
 * usuario quiere subir el volumen y poner pantalla completa, al revés que en el
 * video decorativo del perfil.
 */
function paramsComunes(origen: string): string {
  return `autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origen)}`
}

/**
 * ¿El canal está transmitiendo AHORA? Devuelve el id del video en vivo, o null.
 *
 * Por qué existe: que un remate figure a las 13:30 no significa que la firma
 * esté al aire. Puede arrancar tarde, transmitir por otro lado, o no transmitir
 * esa feria. Embeber "el canal" a ciegas produce un cuadro negro, que es la peor
 * forma de fallar: parece que el sitio está roto.
 *
 * YouTube resuelve /embed/live_stream?channel=<id> a la transmisión en curso, y
 * si no hay ninguna devuelve una página sin videoId. Preguntarle es barato
 * cuando se hace solo con los remates DE HOY: son un puñado, no doscientos.
 */
export async function videoEnVivoDelCanal(channelId: string): Promise<string | null> {
  try {
    const r = await fetch(`https://www.youtube.com/embed/live_stream?channel=${channelId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; consignatarias.com.ar)' },
      // Se revalida con la página (1 h). No hace falta más frescura que eso.
      next: { revalidate: 900 },
    })
    if (!r.ok) return null
    const html = await r.text()
    const id = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1]
    return id ?? null
  } catch {
    // Si YouTube no contesta, preferimos no mostrar player a mostrar uno vacío.
    return null
  }
}

export function resolverStream(
  remate: { consignatariaSlug?: string | null; youtubeUrl?: string | null },
  origen = 'https://www.consignatarias.com.ar',
): StreamEmbebible | null {
  const directa = normalizeUrl(remate.youtubeUrl ?? undefined)
  const videoId = idDeVideo(directa)
  if (videoId) {
    return {
      tipo: 'video',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${paramsComunes(origen)}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      confianza: 'confirmed',
    }
  }

  const canal = getChannelForSlug(remate.consignatariaSlug ?? null)
  if (canal?.channelId) {
    return {
      tipo: 'canal',
      // Este endpoint NO existe en youtube-nocookie: va contra youtube.com.
      embedUrl: `https://www.youtube.com/embed/live_stream?channel=${canal.channelId}&${paramsComunes(origen)}`,
      watchUrl: canal.channelUrl.replace(/\/$/, '') + '/streams',
      confianza: 'probable',
    }
  }
  return null
}

/** Un teléfono argentino a formato marcable y a link de WhatsApp. */
export function contactoClicable(
  phone?: string | null,
  whatsapp?: string | null,
): { tel: string | null; wa: string | null; visible: string | null } {
  const limpiar = (v?: string | null) => {
    if (!v) return null
    const d = v.replace(/[^\d+]/g, '')
    return d.length >= 8 ? d : null
  }
  const tel = limpiar(phone)
  const waRaw = limpiar(whatsapp) ?? tel
  // wa.me quiere el número sin + ni ceros de salida, con código de país.
  let wa: string | null = null
  if (waRaw) {
    let n = waRaw.replace(/^\+/, '')
    if (!n.startsWith('54')) n = '54' + n.replace(/^0/, '')
    wa = `https://wa.me/${n}`
  }
  return { tel: tel ? `tel:${tel}` : null, wa, visible: phone?.trim() || whatsapp?.trim() || null }
}
