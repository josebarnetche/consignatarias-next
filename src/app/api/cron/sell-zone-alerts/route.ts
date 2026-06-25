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
 * Motor de la alerta personalizada de zona de venta (FASE 1). Corre 1×/día hábil:
 *  - Calcula la señal del mercado (computeSellZone, INMAG en USD reales).
 *  - Si está en ZONA DE VENTA (verdict==='vender'), avisa por mail a cada
 *    suscriptor activo que todavía no fue avisado de ESTE episodio.
 *  - Si NO está en zona de venta, re-arma a los que ya habían sido avisados
 *    (los saca del latch 'vender') para que el próximo ingreso vuelva a disparar.
 *
 * Dedupe en la propia fila: last_sent_zone + last_sent_at. No se re-manda la misma
 * zona, ni más de una vez cada 14 días aunque el mercado siga arriba.
 *
 * Auth: authorizeCron (CRON_SECRET / ADMIN_SECRET).
 * Dry-run/preview: ?test=tu@email.com → manda UN mail de muestra con la señal de
 *   hoy a esa dirección y no toca la DB.
 */
const REAFFIRM_DAYS = 14

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sig = await computeSellZone(now)

  // ── Modo preview: manda una muestra a la dirección de ?test= y sale. ──
  const testEmail = req.nextUrl.searchParams.get('test')
  if (testEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({ error: 'test debe ser un email válido' }, { status: 400 })
    }
    const r = await sendSellZoneAlert(testEmail, {
      categoriaLabel: 'novillo',
      pct30: sig.pct30,
      pct365: sig.pct365,
      inmagUsdHoy: sig.inmagUsdHoy,
    })
    return NextResponse.json({ test: true, signal: sig, sent_to: testEmail, send_result: r })
  }

  const supabase = requireServiceClient()
  const results = { signal: sig, candidates: 0, sent: 0, rearmed: 0, errors: [] as string[] }

  // ── Mercado NO en zona de venta → re-armar los latcheados y salir. ──
  if (sig.verdict !== 'vender') {
    const { data: rearmed } = await supabase
      .from('sell_zone_alerts')
      .update({ last_sent_zone: sig.verdict })
      .eq('status', 'active')
      .eq('last_sent_zone', 'vender')
      .select('id')
    results.rearmed = rearmed?.length ?? 0
    logEvent({ eventType: 'cron_finished', status: 'ok', route: '/api/cron/sell-zone-alerts', metadata: { ...results } })
    return NextResponse.json({ success: true, message: `Sin zona de venta (${sig.verdict}). Re-armados ${results.rearmed}.`, ...results })
  }

  // ── Zona de venta → avisar a quienes no fueron avisados de este episodio. ──
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
    (a) => a.last_sent_zone !== 'vender' || !a.last_sent_at || a.last_sent_at < cutoff,
  )
  results.candidates = candidates.length

  for (const a of candidates) {
    try {
      const label = CAT_LABEL[a.categoria as AlertCat] ?? a.categoria
      const r = await sendSellZoneAlert(a.email, {
        categoriaLabel: label,
        pct30: sig.pct30,
        pct365: sig.pct365,
        inmagUsdHoy: sig.inmagUsdHoy,
      })
      if (r.success) {
        await supabase
          .from('sell_zone_alerts')
          .update({ last_sent_zone: 'vender', last_sent_at: now.toISOString() })
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
  return NextResponse.json({ success: true, message: `Zona de venta. Enviados ${results.sent}/${results.candidates}.`, ...results })
}
