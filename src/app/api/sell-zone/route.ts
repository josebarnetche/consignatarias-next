import { NextResponse } from 'next/server'
import { computeSellZone } from '@/lib/market/sell-zone'

export const runtime = 'nodejs'
// Revalida cada hora: la señal sólo cambia con el cierre diario del INMAG.
export const revalidate = 3600

/**
 * GET /api/sell-zone
 *
 * Señal pública de "zona de venta" del mercado (INMAG en USD reales): percentiles
 * de 30 y 365 días + veredicto. Alimenta el SellZoneBadge — el semáforo de venta
 * on-site, la versión gratis y diaria del aviso por mail. Cacheada en el edge.
 */
export async function GET() {
  try {
    const sig = await computeSellZone()
    return NextResponse.json(
      { success: true, ...sig },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (err) {
    console.error('[api/sell-zone] error:', err)
    return NextResponse.json({ success: false, error: 'No disponible' }, { status: 500 })
  }
}
