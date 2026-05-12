import { createClient } from '@supabase/supabase-js'

/**
 * Public read-only client. Uses anon key so it works at build time + at
 * runtime without service role. Targets RLS-public tables only.
 */
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface DailyInmag {
  date: string
  inmag: number | null
  inmag_calculated: boolean
  head_count: number | null
}

export interface DailyUsd {
  date: string
  venta: number | null
}

export interface CombinedDay {
  date: string
  inmag: number | null
  inmag_usd: number | null // INMAG / USD blue venta
  head_count: number | null
}

export async function fetchInmagSeries(fromIso: string, toIso: string): Promise<DailyInmag[]> {
  const admin = publicClient()
  const { data } = await admin
    .from('mag_inmag_history')
    .select('date, inmag_value, inmag_calculated, head_count')
    .gte('date', fromIso)
    .lte('date', toIso)
    .order('date', { ascending: true })

  return (data ?? []).map((r) => ({
    date: r.date as string,
    inmag: (r.inmag_value as number | null) ?? null,
    inmag_calculated: r.inmag_calculated as boolean,
    head_count: (r.head_count as number | null) ?? null,
  }))
}

export async function fetchUsdSeries(fromIso: string, toIso: string): Promise<DailyUsd[]> {
  const admin = publicClient()
  const { data } = await admin
    .from('usd_blue_history')
    .select('date, venta')
    .gte('date', fromIso)
    .lte('date', toIso)
    .order('date', { ascending: true })

  return (data ?? []).map((r) => ({
    date: r.date as string,
    venta: (r.venta as number | null) ?? null,
  }))
}

/**
 * Joined daily series: INMAG ARS + USD blue + INMAG / USD (real dollar price).
 * Forward-fills USD value when the cattle market trades but the USD didn't
 * post that day (rare). Skips rows where INMAG was not calculated.
 */
export async function fetchInmagUsdJoined(fromIso: string, toIso: string): Promise<CombinedDay[]> {
  const [inmag, usd] = await Promise.all([
    fetchInmagSeries(fromIso, toIso),
    fetchUsdSeries(fromIso, toIso),
  ])

  // Build USD lookup with forward-fill
  const usdByDate = new Map<string, number>()
  let lastUsd: number | null = null
  for (const u of usd) {
    if (u.venta !== null) lastUsd = u.venta
    if (lastUsd !== null) usdByDate.set(u.date, lastUsd)
  }
  // For inmag dates without matching usd row but with a prior usd, lookup last
  // known USD. Simple linear scan since series are sorted.
  let usdCursor = 0
  let lastKnownUsd: number | null = null
  const result: CombinedDay[] = []
  for (const day of inmag) {
    while (usdCursor < usd.length && usd[usdCursor].date <= day.date) {
      if (usd[usdCursor].venta !== null) lastKnownUsd = usd[usdCursor].venta
      usdCursor++
    }
    const v = day.inmag
    const u = lastKnownUsd
    result.push({
      date: day.date,
      inmag: v,
      inmag_usd: v !== null && u !== null && u > 0 ? v / u : null,
      head_count: day.head_count,
    })
  }
  return result
}

/**
 * Aggregate a daily series to monthly averages (year+month grouped).
 * Skips months with too few datapoints (default: minimum 5).
 */
export function aggregateMonthly<T extends { date: string }>(
  rows: T[],
  pickValue: (r: T) => number | null,
  minPoints = 5,
): Array<{ year: number; month: number; value: number; count: number }> {
  const buckets = new Map<string, number[]>()
  for (const r of rows) {
    const v = pickValue(r)
    if (v === null || !Number.isFinite(v)) continue
    const key = r.date.slice(0, 7) // YYYY-MM
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(v)
  }
  const out: Array<{ year: number; month: number; value: number; count: number }> = []
  for (const [key, vals] of buckets.entries()) {
    if (vals.length < minPoints) continue
    const [yStr, mStr] = key.split('-')
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length
    out.push({ year: parseInt(yStr, 10), month: parseInt(mStr, 10), value: avg, count: vals.length })
  }
  out.sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  )
  return out
}

/** Compute z-score per year (across that year's 12 monthly values). */
export function withYearZScores<T extends { year: number; value: number }>(
  rows: T[],
): Array<T & { zScore: number }> {
  const byYear = new Map<number, number[]>()
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, [])
    byYear.get(r.year)!.push(r.value)
  }
  const stats = new Map<number, { mean: number; std: number }>()
  for (const [year, vals] of byYear) {
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance =
      vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, vals.length - 1)
    stats.set(year, { mean, std: Math.sqrt(variance) || 1 })
  }
  return rows.map((r) => {
    const s = stats.get(r.year)!
    return { ...r, zScore: (r.value - s.mean) / s.std }
  })
}

/** Percentile (0–100) of a value within an array of numbers. */
export function percentileOf(value: number, sample: number[]): number {
  if (sample.length === 0) return 50
  const sorted = [...sample].sort((a, b) => a - b)
  let count = 0
  for (const v of sorted) if (v <= value) count++
  return Math.round((count / sorted.length) * 100)
}
