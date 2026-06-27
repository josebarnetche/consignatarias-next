import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import { logEvent } from '@/lib/ops'
import { sendSellZoneAlert } from '@/lib/email'
import { computeSellZone, CAT_LABEL, type AlertCat } from '@/lib/market/sell-zone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/sell-zone-alerts
 *
 * Motor de la alerta de venta (FASE 1), con gatillo TRUST-FIRST. Corre 1×/día hábil:
 *  - Calcula la señal (computeSellZone, INMAG en USD reales).
 *  - Avisa SOLO cuando `alertWorthy` (zona alta del año Y girando a la baja —no en
 *    plena tendencia alcista). El backtest 2015-2026 mostró que el percentil solo
 *    sobre-dispara "vendé" en bulls (446 avisos, precio igual subía); la conjunción
 *    recorta ~84% de esos falsos y los restantes precedieron caídas (~-3% a 60d).
 *  - Si NO es alertWorthy, re-arma a los ya avisados para el próximo ingreso.
 *
 * Dedupe en la fila: last_sent_zone='alerted' + last_sent_at. No re-manda el mismo
 * episodio, ni más de una vez cada 14 días.
 *
 * Auth: authorizeCron. Preview: ?test=tu@email.com manda una muestra y no toca la DB.
 */
const REAFFIRM_DAYS = 14
const LATCH = 'alerted'

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sig = await computeSellZone(now)

  // ── Preview: manda una muestra a ?test= y sale. ──
  const testEmail = req.nextUrl.searchParams.get('test')
  if (testEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({ error: 'test debe ser un email válido' }, { status: 400 })
    }
    const r = await sendSellZoneAlert(testEmail, {
      categoriaLabel: 'novillo',
      pct30: sig.pct30,
      pct365: sig.pct365,
      trend: sig.trend,
      inmagUsdHoy: sig.inmagUsdHoy,
    })
    return NextResponse.json({ test: true, signal: sig, sent_to: testEmail, send_result: r })
  }

  const supabase = requireServiceClient()
  const results = { signal: sig, candidates: 0, sent: 0, rearmed: 0, errors: [] as string[] }

  // ── No es momento de alerta → re-armar los latcheados y salir. ──
  if (!sig.alertWorthy) {
    const { data: rearmed } = await supabase
      .from('sell_zone_alerts')
      .update({ last_sent_zone: 'cleared' })
      .eq('status', 'active')
      .eq('last_sent_zone', LATCH)
      .select('id')
    results.rearmed = rearmed?.length ?? 0
    logEvent({ eventType: 'cron_finished', status: 'ok', route: '/api/cron/sell-zone-alerts', metadata: { ...results } })
    return NextResponse.json({ success: true, message: `Sin alerta (zona ${sig.zone}, ${sig.trend}). Re-armados ${results.rearmed}.`, ...results })
  }

  // ── alertWorthy → avisar a quienes no fueron avisados de este episodio. ──
  const cutoff = new Date(now.getTime() - REAFFIRM_DAYS * 86400_000).toISOString()
  const { data: alerts, error } = await supabase
    .from('sell_zone_alerts')
    .select('id, email, categoria, last_sent_zone, last_sent_at')
    .eq('status', 'active')

  if (error) {
    console.error('[sell-zone-alerts] fetch error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const candidates = (alerts ?? []).filter(
    (a) => a.last_sent_zone !== LATCH || !a.last_sent_at || a.last_sent_at < cutoff,
  )
  results.candidates = candidates.length

  for (const a of candidates) {
    try {
      const label = CAT_LABEL[a.categoria as AlertCat] ?? a.categoria
      const r = await sendSellZoneAlert(a.email, {
        categoriaLabel: label,
        pct30: sig.pct30,
        pct365: sig.pct365,
        trend: sig.trend,
        inmagUsdHoy: sig.inmagUsdHoy,
      })
      if (r.success) {
        await supabase
          .from('sell_zone_alerts')
          .update({ last_sent_zone: LATCH, last_sent_at: now.toISOString() })
          .eq('id', a.id)
        results.sent++
      } else {
        results.errors.push(`${a.email}: ${r.error}`)
      }
    } catch (err) {
      results.errors.push(`${a.email}: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  logEvent({ eventType: 'cron_finished', status: results.errors.length ? 'error' : 'ok', route: '/api/cron/sell-zone-alerts', metadata: { ...results } })
  return NextResponse.json({ success: true, message: `Zona alta y girando. Enviados ${results.sent}/${results.candidates}.`, ...results })
}
