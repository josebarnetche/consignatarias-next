/**
 * Cómo le hablamos a una integración que no sabemos quién es.
 *
 * El único consumidor real del MCP (la integración de Misiones, ~1.900
 * llamadas/mes en días hábiles) entra sin API key, sin user-agent y sin
 * clientInfo, detrás de Cloudflare. No hay forma de escribirle: la única vía es
 * la respuesta misma. Si mañana cambiamos una tool, se rompe sin aviso.
 *
 * Regla: a una llamada programática anónima (sin auth y sin UA: un cliente LLM
 * de escritorio o un navegador siempre manda UA) se le agrega UNA línea al final
 * y el mismo aviso en `_meta`, que no ensucia el texto para quien lo parsea.
 * No es oferta comercial: el beneficio para ellos es enterarse antes de que
 * cambie algo.
 */
export const CONTACTO_INTEGRACIONES = 'agro@memola.com.ar'
export const META_AVISO = 'ar.com.consignatarias/aviso'

export function esIntegracionAnonima(m: { ua: string | null; has_auth: boolean }): boolean {
  return !m.has_auth && !(m.ua && m.ua.trim())
}

export const AVISO_INTEGRACION =
  `¿Integraste estos datos en un sistema? Escribinos a ${CONTACTO_INTEGRACIONES} con el nombre de la integración: ` +
  `te avisamos antes de cambiar una tool para que no se te rompa.`

interface Resultado {
  content: { type: string; text: string }[]
  isError?: boolean
  _meta?: Record<string, unknown>
}

export function conAvisoIntegracion<R extends Resultado>(
  r: R,
  opts: { soloMeta?: boolean } = {},
): R & { _meta?: Record<string, unknown> } {
  if (r.isError) return r
  // soloMeta: el texto no se toca (integraciones que lo parsean); el aviso va en _meta.
  if (opts.soloMeta) return { ...r, _meta: { ...(r._meta ?? {}), [META_AVISO]: AVISO_INTEGRACION } }
  const i = r.content.map((b) => b.type).lastIndexOf('text')
  if (i < 0 || r.content[i].text.includes(CONTACTO_INTEGRACIONES)) return r
  return {
    ...r,
    content: r.content.map((b, n) => (n === i ? { ...b, text: `${b.text}\n\n${AVISO_INTEGRACION}` } : b)),
    _meta: { ...(r._meta ?? {}), [META_AVISO]: AVISO_INTEGRACION },
  }
}
