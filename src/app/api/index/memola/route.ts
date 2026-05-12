import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { authenticate, hasAuthHeader, setQuotaHeaders } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/index/memola
 *
 * Composite cattle market index, computed daily from MAG's 16 detailed
 * sub-categories. Unlike INMAG (novillos-only proxy), this weighs every
 * sub-category by its kgs operated that day → reflects real market mix.
 *
 * Formula per day:
 *   memola_index = SUM( price_avg_i × total_kgs_i ) / SUM( total_kgs_i )
 *
 * Params:
 *   ?days=N  (default 30, max 365) — return the last N days of the series
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD (overrides days)
 */
export async function GET(req: NextRequest) {
  let auth = null
  if (hasAuthHeader(req)) {
    const result = await authenticate(req)
    if (!result.ok) return result.response
    auth = result
  }

  const { searchParams } = new URL(req.url)
  const daysParam = searchParams.get('days')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  let fromIso: string
  let toIso: string
  if (fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
    fromIso = fromParam
    toIso = toParam
  } else {
    const days = Math.max(1, Math.min(365, daysParam ? parseInt(daysParam, 10) || 30 : 30))
    const now = new Date()
    const past = new Date(now.getTime() - days * 86400_000)
    fromIso = past.toISOString().slice(0, 10)
    toIso = now.toISOString().slice(0, 10)
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mag_prices_detailed')
    .select('date, subcategory, category_group, price_avg, total_kgs, head_count')
    .gte('date', fromIso)
    .lte('date', toIso)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'db_error', message: error.message } },
      { status: 500 },
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        range: { from: fromIso, to: toIso },
        series: [],
        note: 'No data yet — mag_prices_detailed cron runs Lun-Vie 15:30 ART. Once seeded, the index populates daily.',
      },
      timestamp: new Date().toISOString(),
    })
  }

  // Group by date
  const byDate = new Map<
    string,
    Array<{ price_avg: number | null; total_kgs: number | null; head_count: number | null }>
  >()
  for (const row of data) {
    const date = row.date as string
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push({
      price_avg: row.price_avg as number | null,
      total_kgs: row.total_kgs as number | null,
      head_count: row.head_count as number | null,
    })
  }

  const series = Array.from(byDate.entries())
    .map(([date, rows]) => {
      let weightedSum = 0
      let totalKgs = 0
      let totalHead = 0
      for (const r of rows) {
        if (r.price_avg === null || r.total_kgs === null) continue
        weightedSum += r.price_avg * r.total_kgs
        totalKgs += r.total_kgs
        if (r.head_count !== null) totalHead += r.head_count
      }
      const index = totalKgs > 0 ? weightedSum / totalKgs : null
      return {
        date,
        memola_index: index !== null ? Number(index.toFixed(2)) : null,
        kg_total: totalKgs,
        cabezas: totalHead,
        sub_categorias: rows.length,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const valid = series.filter((s): s is typeof s & { memola_index: number } => s.memola_index !== null)
  const values = valid.map((s) => s.memola_index)
  const stats = values.length
    ? {
        count: values.length,
        latest: values[values.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)),
      }
    : null

  const response = NextResponse.json({
    success: true,
    data: {
      methodology:
        'Composite = SUM(price_avg × total_kgs) / SUM(total_kgs) across the 16 MAG sub-categories per day. Pondera por mix real de faena, no novillos solos como INMAG.',
      range: { from: fromIso, to: toIso },
      series,
      stats,
      fuente: 'consignatarias.com.ar — derivado de MAG haciinfo000502',
    },
    timestamp: new Date().toISOString(),
  })
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')
  if (auth) setQuotaHeaders(response, auth)
  return response
}
