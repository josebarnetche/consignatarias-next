/**
 * spread.ts — inteligencia de spread para el negocio comisionista.
 *
 * Dado el precio que pide un productor ($/kg) y la categoría, lo compara contra el
 * precio de mercado de esa categoría (market-prices.json) y devuelve el % vs.
 * mercado. Es la señal clave para el comisionista: un vendedor que pide POR DEBAJO
 * del mercado es fácil de colocar (y deja margen); uno que pide muy por encima es
 * ambicioso. Módulo PURO (sin server deps) → usable en la API y en el cliente.
 */

import marketPrices from '@/lib/data/market-prices.json'

export interface SpreadInfo {
  /** Precio de mercado de la categoría ($/kg). */
  marketPrice: number
  /** % del precio deseado vs. mercado (positivo = por encima del mercado). */
  spreadPct: number
}

/**
 * computeSpread — % del precio deseado vs. el precio de mercado de la categoría.
 * Sólo aplica a hacienda (categorías con precio $/kg). Devuelve null si falta la
 * categoría, el precio deseado, o no hay precio de mercado para esa categoría.
 */
export function computeSpread(category?: string | null, desiredPriceArs?: number | null): SpreadInfo | null {
  if (!category || !desiredPriceArs || desiredPriceArs <= 0) return null
  const cats = (marketPrices as { categories?: Record<string, { current?: number }> }).categories
  const market = cats?.[category.toLowerCase()]?.current
  if (typeof market !== 'number' || market <= 0) return null
  return { marketPrice: market, spreadPct: ((desiredPriceArs - market) / market) * 100 }
}

/** Lectura corta para el comisionista: qué tan realista/atractivo es el pedido. */
export function spreadReading(spreadPct: number): string {
  if (spreadPct <= -3) return 'por debajo del mercado — fácil de colocar'
  if (spreadPct < 3) return 'en línea con el mercado'
  if (spreadPct < 10) return 'algo por encima del mercado'
  return 'muy por encima del mercado — pedido ambicioso'
}
