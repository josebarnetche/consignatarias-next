import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — covers ~12-month chunk batch

/**
 * One-shot INMAG history backfill into `mag_inmag_history`.
 *
 * Hits MAG `haciinfo000011` in 6-month chunks, parses every daily row,
 * upserts into Supabase. Designed to be called multiple times — each
 * invocation processes one date window and reports back what it covered.
 *
 * Auth: x-cron-secret header or ?secret= query param (CRON_SECRET env).
 *
 * Params:
 *   ?from=YYYY-MM-DD  (default: 2015-01-01)
 *   ?to=YYYY-MM-DD    (default: today)
 *   ?months=N         (chunk size in months, default 6)
 *
 * Example:
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *     'https://www.consignatarias.com.ar/api/cron/backfill-inmag?from=2015-01-01&to=2026-05-12'
 */

const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const THROTTLE_MS = 2500

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface ParsedRow {
  date: string
  head_count: number | null
  total_amount: number | null
  inmag_value: number | null
  inmag_calculated: boolean
  variation: number | null
}

function parseChunk(html: string): ParsedRow[] {
  const rowRegex =
    /<TR[^>]*>\s*<TD[^>]*>(?:[A-Za-zñÑáéíóú&;]+\s*)?(\d{2})\/(\d{2})\/(\d{4})<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>(?:\s*<TD[^>]*>([^<]*)<\/TD>)?/gi

  const rows: ParsedRow[] = []
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    const [, dd, mm, yyyy, headStr, importeStr, inmagStr, varStr] = match
    const date = `${yyyy}-${mm}-${dd}`
    const head_count = parseInt(headStr.replace(/\./g, '').trim(), 10) || null
    const total_amount =
      parseFloat(importeStr.replace(/\./g, '').replace(/,/g, '.').trim()) || null

    const rawInmag = inmagStr.trim()
    let inmag_value: number | null = null
    let inmag_calculated = true
    if (rawInmag.includes('*') || rawInmag.startsWith('-')) {
      inmag_calculated = false
    } else {
      const parsed = parseFloat(
        rawInmag.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(/,/g, '.'),
      )
      inmag_value = Number.isFinite(parsed) ? parsed : null
      if (inmag_value === null) inmag_calculated = false
    }

    let variation: number | null = null
    if (varStr && varStr.trim() && !varStr.includes('*')) {
      const v = parseFloat(
        varStr
          .replace(/[^\d,.\-+%]/g, '')
          .replace(/%/g, '')
          .replace(/\./g, '')
          .replace(/,/g, '.'),
      )
      if (Number.isFinite(v)) variation = v
    }

    rows.push({ date, head_count, total_amount, inmag_value, inmag_calculated, variation })
  }
  return rows
}

async function fetchChunk(fromIso: string, toIso: string): Promise<ParsedRow[]> {
  const url =
    `https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011` +
    `?txtFECHAINI=${encodeURIComponent(ddmmyyyy(fromIso))}` +
    `&txtFECHAFIN=${encodeURIComponent(ddmmyyyy(toIso))}&CP=&LISTADO=SI`

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fromIso}..${toIso}`)
  const html = await res.text()
  return parseChunk(html)
}

export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\\r\\n$/, '').trim()
  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const monthsParam = searchParams.get('months')

  const startIso = fromParam ?? '2015-01-01'
  const endIso = toParam ?? todayIso()
  const chunkMonths = monthsParam ? Math.max(1, Math.min(12, parseInt(monthsParam, 10))) : 6

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
    return NextResponse.json({ error: 'invalid_date_format' }, { status: 400 })
  }
  if (startIso > endIso) {
    return NextResponse.json({ error: 'from_after_to' }, { status: 400 })
  }

  const supabase = requireServiceClient()
  const results = {
    range: { from: startIso, to: endIso, chunkMonths },
    chunks: 0,
    parsed: 0,
    upserted: 0,
    errors: [] as Array<{ window: string; error: string }>,
  }

  let cursor = startIso
  while (cursor <= endIso) {
    const next = addMonths(cursor, chunkMonths)
    const chunkEnd = next > endIso ? endIso : next
    results.chunks++

    let rows: ParsedRow[]
    try {
      rows = await fetchChunk(cursor, chunkEnd)
    } catch (err) {
      results.errors.push({
        window: `${cursor}..${chunkEnd}`,
        error: err instanceof Error ? err.message : 'fetch_failed',
      })
      cursor = next
      continue
    }
    results.parsed += rows.length

    if (rows.length) {
      const { error } = await supabase
        .from('mag_inmag_history')
        .upsert(rows, { onConflict: 'date' })
      if (error) {
        results.errors.push({
          window: `${cursor}..${chunkEnd}`,
          error: `upsert: ${error.message}`,
        })
      } else {
        results.upserted += rows.length
      }
    }

    cursor = next
    if (cursor <= endIso) await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }

  return NextResponse.json({ ok: true, ...results })
}

export const GET = POST
