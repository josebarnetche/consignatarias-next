import { NextResponse } from 'next/server'
import marketData from '@/lib/data/market-prices.json'
import { calcularSpread } from '@/lib/market/spread'

/**
 * GET /api/market/spread
 *
 * Cattle-Corn Spread Index (Relación Maíz/Novillo)
 *
 * The most-watched ratio in the feedlot industry.
 * Indicates how many kg of corn are needed to buy 1 kg of live cattle.
 *
 * Profitability threshold: ~12:1
 * - Above 12:1 = feedlots profitable
 * - Below 12:1 = margins compressed
 *
 * Response:
 * {
 *   novilloArs: number,    // INMAG price in ARS/kg
 *   novilloUsd: number,    // Converted to USD/kg
 *   cornUsd: number,       // Corn FOB USD/tn
 *   usdBlue: number,       // Exchange rate
 *   spread: number,        // The ratio (e.g., 14.1)
 *   profitabilityThreshold: number,  // Reference point (12)
 *   isProfitable: boolean, // spread > threshold
 *   lastUpdate: string     // Date of data
 * }
 *
 * La cuenta vive en `@/lib/market/spread` (la misma que pinta /mercado/spread en el server).
 */
export async function GET() {
  const inmag = marketData.inmag
  const corn = marketData.corn
  const usdBlue = marketData.usdBlue

  const response = {
    ...calcularSpread(),
    meta: {
      sources: {
        novillo: inmag.source,
        corn: corn.source,
        usd: usdBlue.source,
      },
      units: {
        novillo: inmag.unit,
        corn: corn.unit,
        usd: usdBlue.unit,
      },
      calculation: 'spread = (novilloArs / usdBlue) / (cornUsd / 1000)',
      interpretation: 'Kilograms of corn needed to buy 1 kg of live cattle',
    },
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
