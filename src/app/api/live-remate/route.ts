import { NextResponse } from 'next/server'
import { getLiveRemate } from '@/lib/live-remate'

export const dynamic = 'force-dynamic'

/**
 * GET /api/live-remate — polling público para <LiveRemateTicker>.
 *
 * Devuelve la sesión de remate en vivo (si hay) + lotes recientes + promedios
 * corrientes por categoría, leídos de live_remate_* (que llena el worker off-Vercel).
 * Soft-fails a {active:false}. Cache-Control: no-store.
 */
export async function GET() {
  const payload = await getLiveRemate()
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
