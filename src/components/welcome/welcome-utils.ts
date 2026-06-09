/**
 * Shared helpers for the welcome surfaces (frente "Bienvenida ultra-PRO").
 *
 * Regla de marca #1: estas funciones NUNCA fabrican un dato. Solo formatean
 * o derivan saludos a partir de valores reales de la sesión / suscripción.
 */

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Formatea una fecha ISO (ej. "2026-07-31" o "2026-07-31T00:00:00Z") a
 * "31 de julio de 2026" en es-AR. Devuelve null si la fecha no es parseable
 * — el caller decide el estado honesto a mostrar.
 */
export function formatVigencia(iso: string | null | undefined): string | null {
  if (!iso) return null
  const datePart = iso.slice(0, 10)
  const parts = datePart.split('-')
  if (parts.length < 3) return null
  const [y, m, d] = parts.map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return null
  return `${d} de ${MESES_ES[m - 1]} de ${y}`
}

/**
 * Nombre legible del usuario para el saludo. Prioriza el nombre real de la
 * consignataria/frigorífico; si no hay, cae al email (nunca inventa un nombre).
 */
export function resolveGreetingName(displayName: string | null | undefined, email: string): string {
  const trimmed = displayName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : email
}

/** Saludo por franja horaria, en "vos" rioplatense, sin signos de más. */
export function greetingByHour(date = new Date()): string {
  const h = date.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
