import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLivePayload } from '@/lib/admin/live'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/live — polling endpoint para <LiveActivityFeed>.
 *
 * Admin-gated igual que /api/admin/dashboard (requireAdmin). Devuelve el
 * modelo "EN VIVO" desde profile_views: counts 5m/1h/24h, últimas ~30 vistas
 * y top perfiles 24h. Cache-Control: no-store (siempre fresco).
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const payload = await getLivePayload(30)

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
