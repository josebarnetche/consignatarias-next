import { NextResponse } from 'next/server'
import { fetchInmagSeries } from '@/lib/charts/data'

// Reads the session cookie + the DB → must render dynamically.
export const dynamic = 'force-dynamic'

/**
 * GET /api/market/inmag-export
 *
 * PRO-only CSV export of the FULL INMAG daily series (2015 → today), pulled
 * from mag_inmag_history. The on-page charts/tables show only the recent
 * window (free + indexable); the complete decade-long dataset is a PRO asset.
 */
export async function GET() {
  // PRO Usuario retirado (2026-07): el histórico completo del INMAG es GRATIS.
  const today = new Date().toISOString().slice(0, 10)
  const rows = await fetchInmagSeries('2015-01-01', today)
  const clean = rows.filter((r) => r.inmag !== null)

  const header = 'fecha,inmag_ars_kg_vivo,cabezas'
  const body = clean
    .map((r) => `${r.date},${r.inmag},${r.head_count ?? ''}`)
    .join('\n')
  const csv = `${header}\n${body}\n`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inmag-historico-completo-${today}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
