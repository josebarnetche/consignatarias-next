import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily fetch of MAG's detailed 16-sub-category board (haciinfo000502).
 * Upserts one row per (date, subcategory) into mag_prices_detailed.
 *
 * Auth: x-cron-secret header or ?secret= query param.
 *
 * Optional ?date=DD/MM/YYYY to backfill a specific date.
 * Default: today.
 */

const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const URL_BASE = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502'

/**
 * Subcategory → { group, threshold } mapping. group is the canonical
 * category our public API speaks; threshold encodes the weight bucket.
 */
const SUBCAT_MAP: Record<string, { group: string; threshold: string | null }> = {
  'NOVILLOS Esp.Joven + 430': { group: 'novillos', threshold: 'esp_joven_plus_430' },
  'NOVILLOS Regular h 430': { group: 'novillos', threshold: 'regular_h_430' },
  'NOVILLOS Regular + 430': { group: 'novillos', threshold: 'regular_plus_430' },
  'NOVILLITOS Esp. h 390': { group: 'novillitos', threshold: 'esp_h_390' },
  'NOVILLITOS Esp. + 390': { group: 'novillitos', threshold: 'esp_plus_390' },
  'NOVILLITOS Regular': { group: 'novillitos', threshold: 'regular' },
  'VAQUILLONAS Esp. h 390': { group: 'vaquillonas', threshold: 'esp_h_390' },
  'VAQUILLONAS Esp. + 390': { group: 'vaquillonas', threshold: 'esp_plus_390' },
  'VAQUILLONAS Regular': { group: 'vaquillonas', threshold: 'regular' },
  'VACAS Esp.Joven h 430': { group: 'vacas', threshold: 'esp_joven_h_430' },
  'VACAS Esp.Joven + 430': { group: 'vacas', threshold: 'esp_joven_plus_430' },
  'VACAS Regular': { group: 'vacas', threshold: 'regular' },
  'VACAS Conserva Buena': { group: 'vacas', threshold: 'conserva_buena' },
  'VACAS Conserva Inferior': { group: 'vacas', threshold: 'conserva_inferior' },
  'TOROS Esp.': { group: 'toros', threshold: 'esp' },
  'TOROS Regular': { group: 'toros', threshold: 'regular' },
  'MEJ Esp. h 430': { group: 'mej', threshold: 'esp_h_430' },
  'MEJ Regular': { group: 'mej', threshold: 'regular' },
}

function normalizeSubcat(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function ddmmyyyy(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getUTCFullYear()}`
}

function parseNumber(s: string): number | null {
  const cleaned = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(/,/g, '.')
  const v = parseFloat(cleaned)
  return Number.isFinite(v) ? v : null
}

function parseInteger(s: string): number | null {
  const cleaned = s.replace(/[^\d-]/g, '')
  const v = parseInt(cleaned, 10)
  return Number.isFinite(v) ? v : null
}

interface ParsedRow {
  date: string
  subcategory: string
  category_group: string
  weight_threshold: string | null
  price_min: number | null
  price_max: number | null
  price_avg: number | null
  price_median: number | null
  head_count: number | null
  total_amount: number | null
  total_kgs: number | null
  kg_avg: number | null
}

function parsePage(html: string, isoDate: string): ParsedRow[] {
  // Capture rows where first TD is a subcat label and the next 8 TDs are numeric
  const rowRegex =
    /<TR[^>]*>\s*<TD[^>]*>\s*([^<]+?)\s*<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>/gi

  const rows: ParsedRow[] = []
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    const [
      ,
      label,
      minS,
      maxS,
      avgS,
      medS,
      headS,
      importeS,
      kgsS,
      kgAvgS,
    ] = match

    const subcategory = normalizeSubcat(label)
    const map = SUBCAT_MAP[subcategory]
    if (!map) continue // skip header/footer/unknown rows

    rows.push({
      date: isoDate,
      subcategory,
      category_group: map.group,
      weight_threshold: map.threshold,
      price_min: parseNumber(minS),
      price_max: parseNumber(maxS),
      price_avg: parseNumber(avgS),
      price_median: parseNumber(medS),
      head_count: parseInteger(headS),
      total_amount: parseNumber(importeS),
      total_kgs: parseNumber(kgsS),
      kg_avg: parseNumber(kgAvgS),
    })
  }
  return rows
}

export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\\r\\n$/, '').trim()
  if (cronSecret !== envSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date') // YYYY-MM-DD optional

  let targetDateIso: string
  let targetDateMag: string
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'invalid_date_format' }, { status: 400 })
    }
    targetDateIso = dateParam
    const [y, m, d] = dateParam.split('-')
    targetDateMag = `${d}/${m}/${y}`
  } else {
    const now = new Date()
    targetDateIso = now.toISOString().slice(0, 10)
    targetDateMag = ddmmyyyy(now)
  }

  const url =
    `${URL_BASE}?txtFECHAINI=${encodeURIComponent(targetDateMag)}` +
    `&txtFECHAFIN=${encodeURIComponent(targetDateMag)}&LISTADO=SI`

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    return NextResponse.json(
      { error: 'mag_fetch_failed', status: res.status, url },
      { status: 502 },
    )
  }
  const html = await res.text()
  const rows = parsePage(html, targetDateIso)

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      date: targetDateIso,
      rows_parsed: 0,
      note: 'No data rows — likely a non-trading day (MAG operates martes/miércoles/viernes).',
    })
  }

  const supabase = requireServiceClient()
  const { error } = await supabase
    .from('mag_prices_detailed')
    .upsert(rows, { onConflict: 'date,subcategory' })

  if (error) {
    return NextResponse.json(
      { error: 'upsert_failed', message: error.message, parsed: rows.length },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    date: targetDateIso,
    rows_upserted: rows.length,
    subcategories: rows.map((r) => r.subcategory),
  })
}

export const GET = POST
