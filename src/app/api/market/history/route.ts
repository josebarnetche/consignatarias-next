import { NextRequest, NextResponse } from 'next/server'
import marketData from '@/lib/data/market-prices.json'

/**
 * GET /api/market/history
 * 
 * Historical price data for INMAG (Índice Novillo Mercado Agroganadero)
 * 
 * Query params:
 * - days: number (default: 30, max: 365)
 * - from: ISO date string (optional, overrides days)
 * - to: ISO date string (optional, defaults to today)
 * 
 * Response:
 * {
 *   index: "inmag",
 *   unit: "$/kg vivo",
 *   source: "mercadoagroganadero.com.ar",
 *   current: number,
 *   change: number,
 *   series: Array<{ date: string, value: number, volume?: number }>,
 *   meta: {
 *     min: number,
 *     max: number,
 *     avg: number,
 *     vwap: number | null, // Volume-Weighted Average Price (Insight #86)
 *     totalVolume: number,
 *     count: number,
 *     from: string,
 *     to: string
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Parse query params
  const daysParam = searchParams.get('days')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  
  const inmag = marketData.inmag as {
    current: number
    change: number
    unit: string
    source: string
    series: Array<{ date: string; value: number; volume?: number }>
  }
  const allSeries = inmag.series
  
  // Sort series by date (oldest first)
  const sortedSeries = [...allSeries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  let filteredSeries: typeof sortedSeries
  
  if (fromParam) {
    // Date range mode
    const fromDate = new Date(fromParam)
    const toDate = toParam ? new Date(toParam) : new Date()
    
    filteredSeries = sortedSeries.filter(s => {
      const d = new Date(s.date)
      return d >= fromDate && d <= toDate
    })
  } else {
    // Days mode (default: 30)
    const days = Math.min(Math.max(parseInt(daysParam || '30', 10), 1), 365)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    filteredSeries = sortedSeries.filter(s => new Date(s.date) >= cutoffDate)
  }
  
  // If no data in range, return all data
  if (filteredSeries.length === 0) {
    filteredSeries = sortedSeries
  }
  
  // Calculate stats
  const values = filteredSeries.map(s => s.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  
  // Calculate VWAP (Volume-Weighted Average Price) — Insight #86
  let vwap: number | null = null
  let totalVolume = 0
  const entriesWithVolume = filteredSeries.filter(s => s.volume && s.volume > 0)
  
  if (entriesWithVolume.length > 0) {
    const sumPriceVolume = entriesWithVolume.reduce((sum, s) => sum + (s.value * (s.volume || 0)), 0)
    totalVolume = entriesWithVolume.reduce((sum, s) => sum + (s.volume || 0), 0)
    vwap = totalVolume > 0 ? Math.round((sumPriceVolume / totalVolume) * 100) / 100 : null
  }
  
  const response = {
    index: 'inmag',
    name: 'Índice Novillo Mercado Agroganadero',
    unit: inmag.unit,
    source: inmag.source,
    current: inmag.current,
    change: inmag.change,
    series: filteredSeries,
    meta: {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      vwap, // Volume-Weighted Average Price
      totalVolume,
      count: filteredSeries.length,
      from: filteredSeries[0]?.date,
      to: filteredSeries[filteredSeries.length - 1]?.date,
    },
  }
  
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
