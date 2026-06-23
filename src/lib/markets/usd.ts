/**
 * Cotización del dólar blue en vivo (dolarapi.com). Server-side only, espeja el
 * patrón de chicago.ts: falla "suave" (try/catch → null ante cualquier error),
 * nunca rompe la página que la consume.
 *
 * El endpoint no trae el cierre de ayer, así que el delta diario se computa
 * contra el cierre previo del build (marketPrices.usdBlue.current), pasado por
 * el caller. Si la cotización cambia intradía, la cinta deja de estar congelada.
 */

export interface UsdBlue {
  compra: number
  venta: number
  fechaActualizacion: string
  /** value = venta (lo que mostramos en la cinta). */
  value: number
  /** % vs el cierre previo del build. null si no se pudo computar. */
  change: number | null
}

/**
 * @param prevClose cierre previo (marketPrices.usdBlue.current) para el delta.
 */
export async function fetchUsdBlue(prevClose?: number): Promise<UsdBlue | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue', {
      headers: { 'User-Agent': 'Mozilla/5.0 (consignatarias.com.ar market reference)' },
      next: { revalidate: 900 }, // 15 min
    })
    if (!res.ok) return null
    const json = await res.json()
    const compra = json?.compra
    const venta = json?.venta
    if (typeof venta !== 'number' || !Number.isFinite(venta)) return null
    const change =
      typeof prevClose === 'number' && prevClose > 0
        ? Math.round(((venta - prevClose) / prevClose) * 1000) / 10
        : null
    return {
      compra: typeof compra === 'number' ? compra : venta,
      venta,
      fechaActualizacion: typeof json?.fechaActualizacion === 'string' ? json.fechaActualizacion : '',
      value: venta,
      change,
    }
  } catch {
    return null
  }
}
