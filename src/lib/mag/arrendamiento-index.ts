/**
 * arrendamiento-index.ts — cierre mensual del ÍNDICE ARRENDAMIENTO del MAG
 * (haciinfo000013, "INMAG sugerido para arrendamientos rurales / ROFEX"), fila
 * "Totales" del listado pedido para el mes completo.
 *
 * OJO: no es el INMAG mensual (haciinfo000011, todas las categorías, ver
 * monthly-close.ts). Octubre 2026: índice arrendamiento $4.186,564 vs. INMAG
 * $4.122,039, ambos sobre 80.045 cab. ingresadas.
 *
 * Lo usan el cron `arrendamiento-cierre` (número principal y canon del mail) y
 * `scripts/arrendamiento-mensual.mjs` (regenera src/lib/data/arrendamiento-mensual.json,
 * que lee /mercado/arrendamiento). Sin imports con alias: el script lo importa vía tsx.
 */

export const MAG_ARRENDAMIENTO_URL = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000013'

export interface ArrendamientoMonthClose {
  /** Índice del período (fila Totales) en $/kg, redondeado a 3 decimales. */
  index: number
  /** Cabezas ingresadas en el período (fila Totales). */
  cabezas: number | null
  /** Importe total del período en $ (fila Totales). */
  importe: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "131.340.085.900,00" → 131340085900 ; "4.186,564" → 4186.564 */
export function parseNumAr(s: string): number {
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
}

/** URL del listado haciinfo000013 para el mes (y, m 1-based) completo. */
export function arrendamientoIndexUrl(y: number, m: number): string {
  const last = new Date(y, m, 0).getDate()
  return (
    `${MAG_ARRENDAMIENTO_URL}?txtFECHAINI=${encodeURIComponent(`01/${pad(m)}/${y}`)}` +
    `&txtFECHAFIN=${encodeURIComponent(`${pad(last)}/${pad(m)}/${y}`)}`
  )
}

/**
 * Parsea la fila "Totales" del HTML de haciinfo000013: Totales | Cab | Importe | Índice.
 * Devuelve null si no hay fila Totales o el índice no es un número positivo.
 */
export function parseArrendamientoTotales(html: string): ArrendamientoMonthClose | null {
  const rows = [...html.matchAll(/<TR[^>]*>([\s\S]*?)<\/TR>/gi)].map((r) =>
    [...r[1].matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(),
    ),
  )
  for (const cells of rows) {
    const ne = cells.filter(Boolean)
    if (ne.length < 4 || !/^Totales$/i.test(ne[0])) continue
    // El índice es la única celda con 3 decimales (el importe lleva 2).
    const idx = ne.find((c, i) => i >= 1 && /^\d{1,3}(\.\d{3})*,\d{3}$/.test(c))
    if (!idx) continue
    const index = Math.round(parseNumAr(idx) * 1000) / 1000
    if (!Number.isFinite(index) || index <= 0) continue
    const cab = parseNumAr(ne[1])
    const imp = ne.find((c, i) => i >= 2 && /^\d{1,3}(\.\d{3})*,\d{2}$/.test(c))
    return {
      index,
      cabezas: Number.isFinite(cab) ? cab : null,
      importe: imp ? parseNumAr(imp) : null,
    }
  }
  return null
}

/**
 * Baja del MAG el cierre del Índice Arrendamiento del mes (y, m 1-based).
 * Devuelve null si el MAG no responde o todavía no tiene la fila Totales — el
 * llamador decide (el cron de arrendamiento NO cae al INMAG: no manda el mail).
 */
export async function fetchArrendamientoMonthClose(
  y: number,
  m: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ArrendamientoMonthClose | null> {
  const res = await fetchImpl(arrendamientoIndexUrl(y, m), { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return null
  const html = new TextDecoder('iso-8859-1').decode(await res.arrayBuffer())
  return parseArrendamientoTotales(html)
}
