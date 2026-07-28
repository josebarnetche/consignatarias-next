import { NextRequest, NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron-auth'
import { notificarDemandas } from '@/lib/demanda'
import { logEvent } from '@/lib/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/cron/demanda-matching — pase del growth engine tras el scrape diario.
 * Por cada demanda de compra activa: matchea remates programados nuevos (no
 * notificados antes) y avisa al comprador por email y/o webhook. Idempotente
 * vía demanda_notificaciones. Auth: CRON_SECRET (authorizeCron).
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const started = Date.now()
  try {
    const stats = await notificarDemandas()
    logEvent({
      eventType: 'cron_finished',
      status: 'ok',
      route: '/api/cron/demanda-matching',
      latencyMs: Date.now() - started,
      metadata: { ...stats },
    })
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    logEvent({
      eventType: 'cron_finished',
      status: 'error',
      route: '/api/cron/demanda-matching',
      latencyMs: Date.now() - started,
      metadata: { error: msg },
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
