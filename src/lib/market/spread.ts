import marketData from '@/lib/data/market-prices.json'

/**
 * Relación maíz/novillo: kg de maíz que se compran con 1 kg de novillo vivo, todo en USD.
 * Una sola cuenta para `/api/market/spread` y para `/mercado/spread`, que la pinta desde el
 * server (antes la página la pedía por fetch a /api/, bloqueado en robots, y el bot veía
 * un spinner donde está el número).
 */
export interface SpreadData {
  novilloArs: number
  novilloUsd: number
  cornUsd: number
  usdBlue: number
  spread: number
  profitabilityThreshold: number
  isProfitable: boolean
  lastUpdate: string
}

/** Umbral de la industria: por encima de 12:1 el engorde a corral da margen. */
export const UMBRAL_RENTABILIDAD_SPREAD = 12

const redondear2 = (n: number) => Math.round(n * 100) / 100

export function calcularSpread(): SpreadData {
  const novilloArs = marketData.inmag.current
  const novilloUsd = novilloArs / marketData.usdBlue.current
  const spread = novilloUsd / (marketData.corn.current / 1000)
  return {
    novilloArs: redondear2(novilloArs),
    novilloUsd: redondear2(novilloUsd),
    cornUsd: redondear2(marketData.corn.current),
    usdBlue: marketData.usdBlue.current,
    spread: redondear2(spread),
    profitabilityThreshold: UMBRAL_RENTABILIDAD_SPREAD,
    isProfitable: spread > UMBRAL_RENTABILIDAD_SPREAD,
    lastUpdate: marketData.lastUpdate,
  }
}
