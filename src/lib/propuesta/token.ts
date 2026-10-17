/**
 * Link firmado de la propuesta PRO de una firma (/propuesta/<slug>?t=<token>).
 *
 * La propuesta muestra números internos de la firma (vistas, consultas, seguidores):
 * no puede quedar abierta a quien adivine el slug. Por eso el link lleva `t`, un HMAC
 * del slug con un secreto del servidor — mismo esquema que la baja del newsletter
 * (src/lib/newsletter/baja.ts). Sin secreto no se emite token y la página sólo la
 * puede abrir un admin con sesión: falla cerrada, nunca abierta.
 *
 * El secreto propio (`PROPUESTA_SECRET`) permite invalidar todos los links enviados
 * sin tocar el pepper de las API keys; si no está, cae al pepper.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

function secreto(): string {
  return process.env.PROPUESTA_SECRET || process.env.API_KEY_PEPPER || ''
}

/** Token del slug canónico. Vacío si el servidor no tiene secreto. */
export function tokenPropuesta(slug: string): string {
  const s = secreto()
  if (!s) return ''
  return createHmac('sha256', s).update(`propuesta:${slug.trim().toLowerCase()}`).digest('base64url').slice(0, 22)
}

/** Comparación en tiempo constante: no filtra cuántos caracteres acertó. */
export function tokenPropuestaValido(slug: string, token: string | null | undefined): boolean {
  if (!token) return false
  const esperado = tokenPropuesta(slug)
  if (!esperado || esperado.length !== token.length) return false
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
}

export interface OpcionesLink {
  /** Nombre de la persona a la que va dirigida (portada "Para: …"). */
  contacto?: string
  /** Párrafo propio, texto plano, se recorta a 600 caracteres en la página. */
  nota?: string
}

/** Link público y compartible de la propuesta. */
export function urlPropuesta(slug: string, opciones: OpcionesLink = {}, base = APP_URL): string {
  const q = new URLSearchParams()
  const t = tokenPropuesta(slug)
  if (t) q.set('t', t)
  if (opciones.contacto?.trim()) q.set('contacto', opciones.contacto.trim())
  if (opciones.nota?.trim()) q.set('nota', opciones.nota.trim())
  const qs = q.toString()
  return `${base}/propuesta/${slug}${qs ? `?${qs}` : ''}`
}
