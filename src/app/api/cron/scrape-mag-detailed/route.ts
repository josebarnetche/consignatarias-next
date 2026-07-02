import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily fetch of MAG's data: (1) headline INMAG (haciinfo000011) into
 * mag_inmag_history; (2) detailed 16-sub-category board (haciinfo000502)
 * into mag_prices_detailed.
 *
 * Two fetches, one cron. Keeps both tables current going forward
 * after the one-shot backfill.
 *
 * Auth: x-cron-secret header or ?secret= query param.
 * Optional ?date=YYYY-MM-DD to backfill a specific date (default: today).
 */

const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const URL_BASE_DETAILED = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502'
const URL_BASE_INMAG = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011'
const URL_DOLAR_BLUE = 'https://dolarapi.com/v1/dolares/blue'

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

interface InmagRow {
  date: string
  head_count: number | null
  total_amount: number | null
  inmag_value: number | null
  inmag_calculated: boolean
  variation: number | null
}

function parseInmag(html: string): InmagRow[] {
  const rowRegex =
    /<TR[^>]*>\s*<TD[^>]*>(?:[A-Za-zñÑáéíóú&;]+\s*)?(\d{2})\/(\d{2})\/(\d{4})<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>(?:\s*<TD[^>]*>([^<]*)<\/TD>)?/gi

  const rows: InmagRow[] = []
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    const [, dd, mm, yyyy, headStr, importeStr, inmagStr, varStr] = match
    const date = `${yyyy}-${mm}-${dd}`
    const head_count = parseInteger(headStr)
    const total_amount = parseNumber(importeStr)

    const rawInmag = inmagStr.trim()
    let inmag_value: number | null = null
    let inmag_calculated = true
    if (rawInmag.includes('*') || rawInmag.startsWith('-')) {
      inmag_calculated = false
    } else {
      const v = parseNumber(rawInmag)
      inmag_value = v
      if (v === null) inmag_calculated = false
    }

    let variation: number | null = null
    if (varStr && varStr.trim() && !varStr.includes('*')) {
      const v = parseNumber(varStr)
      if (v !== null) variation = v
    }

    rows.push({ date, head_count, total_amount, inmag_value, inmag_calculated, variation })
  }
  return rows
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
  // Fail CLOSED in every environment (was only enforced when NODE_ENV==='production').
  if (!authorizeCron(req)) {
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

  const supabase = requireServiceClient()
  const result = {
    date: targetDateIso,
    detailed_upserted: 0,
    inmag_upserted: 0,
    usd_upserted: 0,
    errors: [] as string[],
  }

  // 1. Detailed 16 sub-categories (haciinfo000502)
  try {
    const urlDetailed =
      `${URL_BASE_DETAILED}?txtFECHAINI=${encodeURIComponent(targetDateMag)}` +
      `&txtFECHAFIN=${encodeURIComponent(targetDateMag)}&LISTADO=SI`
    const res = await fetch(urlDetailed, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const rows = parsePage(html, targetDateIso)

    if (rows.length > 0) {
      const { error } = await supabase
        .from('mag_prices_detailed')
        .upsert(rows, { onConflict: 'date,subcategory' })
      if (error) result.errors.push(`detailed upsert: ${error.message}`)
      else result.detailed_upserted = rows.length
    }
  } catch (err) {
    result.errors.push(
      `detailed fetch: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  // 2. Headline INMAG row (haciinfo000011) for the same date — keeps
  //    mag_inmag_history current going forward after the one-shot backfill.
  try {
    const urlInmag =
      `${URL_BASE_INMAG}?txtFECHAINI=${encodeURIComponent(targetDateMag)}` +
      `&txtFECHAFIN=${encodeURIComponent(targetDateMag)}&CP=&LISTADO=SI`
    const res = await fetch(urlInmag, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const inmagRows = parseInmag(html)
    if (inmagRows.length > 0) {
      const { error } = await supabase
        .from('mag_inmag_history')
        .upsert(inmagRows, { onConflict: 'date' })
      if (error) result.errors.push(`inmag upsert: ${error.message}`)
      else result.inmag_upserted = inmagRows.length
    }
  } catch (err) {
    result.errors.push(
      `inmag fetch: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  // 3. USD blue today (dolarapi live endpoint) → usd_blue_history.
  //    Today's date only; the historical backfill runs separately.
  try {
    const res = await fetch(URL_DOLAR_BLUE, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { compra?: number; venta?: number }
    if (typeof json.venta === 'number' || typeof json.compra === 'number') {
      const { error } = await supabase.from('usd_blue_history').upsert(
        [
          {
            date: targetDateIso,
            compra: typeof json.compra === 'number' ? json.compra : null,
            venta: typeof json.venta === 'number' ? json.venta : null,
          },
        ],
        { onConflict: 'date' },
      )
      if (error) result.errors.push(`usd upsert: ${error.message}`)
      else result.usd_upserted = 1
    }
  } catch (err) {
    result.errors.push(
      `usd fetch: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  const allEmpty =
    result.detailed_upserted === 0 &&
    result.inmag_upserted === 0 &&
    result.usd_upserted === 0
  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
    ...(allEmpty
      ? { note: 'No data — likely a non-trading day (MAG operates martes/miércoles/viernes).' }
      : {}),
  })
}

export const GET = POST
