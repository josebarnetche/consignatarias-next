import { NextResponse } from 'next/server'
import marketData from '@/lib/data/market-prices.json'

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
 */
export async function GET() {
  const inmag = marketData.inmag
  const corn = marketData.corn
  const usdBlue = marketData.usdBlue
  
  // INMAG is in ARS/kg vivo
  const novilloArs = inmag.current
  
  // Convert to USD/kg
  const novilloUsd = novilloArs / usdBlue.current
  
  // Corn is in USD/tn, convert to USD/kg
  const cornUsdPerKg = corn.current / 1000
  
  // Calculate spread: kg novillo / kg corn (in USD terms)
  // This tells us how many kg of corn = 1 kg of novillo
  const spread = novilloUsd / cornUsdPerKg
  
  // Industry profitability threshold
  const profitabilityThreshold = 12
  
  const response = {
    novilloArs: Math.round(novilloArs * 100) / 100,
    novilloUsd: Math.round(novilloUsd * 100) / 100,
    cornUsd: Math.round(corn.current * 100) / 100,
    usdBlue: usdBlue.current,
    spread: Math.round(spread * 100) / 100,
    profitabilityThreshold,
    isProfitable: spread > profitabilityThreshold,
    lastUpdate: marketData.lastUpdate,
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
