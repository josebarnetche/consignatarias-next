/**
 * Links de baja con firma (revisión del 17-10-2026).
 *
 * Antes la baja era `/unsubscribe?email=X`: cualquiera podía dar de baja cualquier
 * mail. Ahora cada link lleva `t`, un HMAC del mail con un secreto del servidor, y la
 * ruta rechaza un `t` que no corresponde. TRANSICIÓN: los mails ya enviados no tienen
 * `t` y la baja tiene que seguir funcionando (Ley 25.326), así que un pedido SIN `t`
 * todavía se acepta y queda marcado `sin_token` en ops_events. Cuando dejen de
 * aparecer, se cierra (ver la ruta).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

function secreto(): string {
  return process.env.NEWSLETTER_UNSUB_SECRET || process.env.API_KEY_PEPPER || ''
}

export function tokenBaja(email: string): string {
  const s = secreto()
  if (!s) return ''
  return createHmac('sha256', s).update(`baja:${email.trim().toLowerCase()}`).digest('base64url').slice(0, 22)
}

export function tokenBajaValido(email: string, token: string): boolean {
  const esperado = tokenBaja(email)
  if (!esperado || esperado.length !== token.length) return false
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
}

/** Página humana de baja (confirma con un botón). */
export function urlBaja(email: string): string {
  const t = tokenBaja(email)
  return `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}${t ? `&t=${t}` : ''}`
}

/** Endpoint one-click (RFC 8058) para el header List-Unsubscribe. */
export function urlBajaOneClick(email: string, campaign?: string): string {
  const t = tokenBaja(email)
  return `${APP_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}${t ? `&t=${t}` : ''}${campaign ? `&campaign=${encodeURIComponent(campaign)}` : ''}`
}
