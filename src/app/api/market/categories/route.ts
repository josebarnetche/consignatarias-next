import { NextRequest, NextResponse } from 'next/server'
import categoriesData from '@/lib/data/market-categories.json'
import marketData from '@/lib/data/market-prices.json'

/**
 * GET /api/market/categories
 * 
 * Historical price data by livestock category (Insight #81)
 * 
 * Query params:
 * - category: string (novillos|novillitos|vacas|vaquillonas|toros|mej|igmag)
 *            If omitted, returns all categories
 * - from: string (YYYY-MM, default: 12 months ago)
 * - to: string (YYYY-MM, default: latest available)
 * 
 * Response:
 * {
 *   source: string,
 *   unit: string,
 *   category?: string,
 *   current: object, // Real-time category prices from market-prices.json
 *   series: Array<{ period: string, ...values }>,
 *   meta: { from, to, count }
 * }
 */

const VALID_CATEGORIES = ['novillos', 'novillitos', 'vacas', 'vaquillonas', 'toros', 'mej', 'igmag']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const category = searchParams.get('category')?.toLowerCase()
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  
  // Validate category if provided
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Valid options: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    )
  }
  
  // Filter series by date range
  let series = categoriesData.series as Array<Record<string, string | number>>
  
  if (fromParam || toParam) {
    series = series.filter(s => {
      const period = s.period as string
      if (fromParam && period < fromParam) return false
      if (toParam && period > toParam) return false
      return true
    })
  } else {
    // Default: last 12 months available
    series = series.slice(-12)
  }
  
  // Get current real-time prices from market-prices.json
  const currentPrices = marketData.categories as Record<string, {
    price: number
    change: number
    volume?: number
    source: string
  }>
  
  // Build response based on category filter
  if (category) {
    // Single category mode
    const categorySeries = series.map(s => ({
      period: s.period,
      value: s[category] as number
    }))
    
    const values = categorySeries.map(s => s.value).filter(v => v > 0)
    
    return NextResponse.json({
      source: categoriesData.source,
      unit: categoriesData.unit,
      category,
      current: currentPrices[category] || null,
      series: categorySeries,
      meta: {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
        count: categorySeries.length,
        from: categorySeries[0]?.period,
        to: categorySeries[categorySeries.length - 1]?.period,
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    })
  }
  
  // All categories mode
  return NextResponse.json({
    source: categoriesData.source,
    unit: categoriesData.unit,
    categories: VALID_CATEGORIES,
    current: currentPrices,
    series,
    meta: {
      count: series.length,
      from: series[0]?.period,
      to: series[series.length - 1]?.period,
      range: categoriesData.range,
    }
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    }
  })
}
