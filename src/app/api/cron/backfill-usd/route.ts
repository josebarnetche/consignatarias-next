import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * One-shot USD blue history backfill from argentinadatos.com.
 * Daily cotization 2011→today, ~5600 rows. Upserts into usd_blue_history.
 *
 * Auth: x-cron-secret or ?secret=.
 *
 * Optional ?from=YYYY-MM-DD to limit the backfill range (default: all).
 */

const SOURCE = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue'
const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'

interface UsdRow {
  date: string
  compra: number | null
  venta: number | null
}

export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\\r\\n$/, '').trim()
  if (cronSecret !== envSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const fromCutoff = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : null

  let raw: Array<{ fecha: string; compra: number; venta: number; casa: string }>
  try {
    const res = await fetch(SOURCE, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.json()
  } catch (err) {
    return NextResponse.json(
      { error: 'fetch_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 502 },
    )
  }

  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: 'unexpected_payload' }, { status: 502 })
  }

  // Dedupe by date — argentindatos sometimes has multiple rows per date
  const byDate = new Map<string, UsdRow>()
  for (const row of raw) {
    if (!row?.fecha || (row.casa && row.casa !== 'blue')) continue
    if (fromCutoff && row.fecha < fromCutoff) continue
    const date = row.fecha.slice(0, 10)
    const venta = typeof row.venta === 'number' ? row.venta : null
    const compra = typeof row.compra === 'number' ? row.compra : null
    if (venta === null && compra === null) continue
    byDate.set(date, { date, compra, venta })
  }

  const rows = Array.from(byDate.values())

  // Batched upsert — supabase-js handles arrays but very large arrays may chunk
  const supabase = requireServiceClient()
  const BATCH = 500
  let upserted = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('usd_blue_history')
      .upsert(chunk, { onConflict: 'date' })
    if (error) errors.push(`batch ${i}: ${error.message}`)
    else upserted += chunk.length
  }

  return NextResponse.json({
    ok: errors.length === 0,
    source: SOURCE,
    fetched: rows.length,
    upserted,
    range: {
      from: rows[0]?.date ?? null,
      to: rows[rows.length - 1]?.date ?? null,
    },
    errors,
  })
}

export const GET = POST
