import type { ServiceClient } from '@/lib/supabase'

/**
 * Motor de alertas de precio por umbral. Categorías soportadas + lectura del precio
 * actual de cada una. Fuente única para la captura (API) y el cron de disparo.
 */

export const PRICE_ALERT_CATEGORIES = [
  { value: 'inmag', label: 'Índice Novillo (INMAG)' },
  { value: 'novillos', label: 'Novillos' },
  { value: 'novillitos', label: 'Novillitos' },
  { value: 'vaquillonas', label: 'Vaquillonas' },
  { value: 'vacas', label: 'Vacas' },
  { value: 'toros', label: 'Toros' },
] as const

export type PriceAlertCategory = (typeof PRICE_ALERT_CATEGORIES)[number]['value']

export const CATEGORY_VALUES = PRICE_ALERT_CATEGORIES.map((c) => c.value) as readonly string[]

export function isValidCategory(c: unknown): c is PriceAlertCategory {
  return typeof c === 'string' && CATEGORY_VALUES.includes(c)
}

export function categoryLabel(c: string): string {
  return PRICE_ALERT_CATEGORIES.find((x) => x.value === c)?.label ?? c
}

/**
 * Precio de referencia actual de una categoría:
 *  - 'inmag' → último inmag_value (mag_inmag_history), el índice novillo.
 *  - category_group → promedio de price_avg de sus subcategorías en la última fecha
 *    (mag_prices_detailed).
 * Devuelve null si no hay dato (no rompemos: el caller decide).
 */
export async function getCurrentPrice(
  service: ServiceClient,
  category: string,
): Promise<number | null> {
  if (category === 'inmag') {
    const { data, error } = await service
      .from('mag_inmag_history')
      .select('inmag_value')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`getCurrentPrice(inmag): ${error.message}`)
    return data?.inmag_value ?? null
  }

  // category_group: promedio de price_avg en la última fecha con datos del grupo.
  const { data, error } = await service
    .from('mag_prices_detailed')
    .select('date, price_avg')
    .eq('category_group', category)
    .order('date', { ascending: false })
    .limit(20)
  if (error) throw new Error(`getCurrentPrice(${category}): ${error.message}`)
  if (!data || data.length === 0) return null

  const latestDate = data[0].date
  const sameDay = data.filter((r) => r.date === latestDate && r.price_avg != null)
  if (sameDay.length === 0) return null
  const sum = sameDay.reduce((acc, r) => acc + Number(r.price_avg), 0)
  return Math.round((sum / sameDay.length) * 100) / 100
}

/** Último dólar blue (venta) — para convertir precios ARS → USD en las alertas. */
export async function getUsdBlue(service: ServiceClient): Promise<number | null> {
  const { data } = await service
    .from('usd_blue_history')
    .select('venta')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.venta ?? null
}

/**
 * Precio actual en la MONEDA de la alerta: ARS directo, o USD (÷ dólar blue). Así el
 * umbral ("avisame cuando el kilo supere XX USD/ARS") y el last_value quedan en la
 * misma unidad y el cruce se detecta bien.
 */
export async function getCurrentPriceInCurrency(
  service: ServiceClient,
  category: string,
  currency: string,
): Promise<number | null> {
  const ars = await getCurrentPrice(service, category)
  if (ars == null) return null
  if (currency === 'usd') {
    const blue = await getUsdBlue(service)
    if (!blue || blue <= 0) return null
    return Math.round((ars / blue) * 100) / 100
  }
  return ars
}

/** ¿La alerta cruzó su umbral? current del lado del umbral y last_value del otro. */
export function crossed(
  direction: 'above' | 'below',
  current: number,
  last: number | null,
  threshold: number,
): boolean {
  if (direction === 'above') {
    return current >= threshold && (last == null || last < threshold)
  }
  return current <= threshold && (last == null || last > threshold)
}
