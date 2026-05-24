import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMonthlyClose } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Monthly close — on the 1st of each month, emails subscribers the previous
 * month's average INMAG (the number producers use to settle rural-lease canon).
 * Triggered by GitHub Actions cron (1st of month) or manually via workflow_dispatch.
 * Auth: ADMIN_SECRET as Bearer token or ?secret= query param.
 *
 * Optional ?month=YYYY-MM overrides which month to close (for backfill/testing).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    || req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = requireServiceClient()

  // ── Resolve the month to close ──────────────────────────────────
  // Default: the calendar month before today (cron runs on the 1st).
  const override = req.nextUrl.searchParams.get('month') // "YYYY-MM"
  const now = new Date()
  let year: number, monthIdx: number // monthIdx: 0-11 of the month being closed
  if (override && /^\d{4}-\d{2}$/.test(override)) {
    year = parseInt(override.slice(0, 4), 10)
    monthIdx = parseInt(override.slice(5, 7), 10) - 1
  } else {
    const closed = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    year = closed.getFullYear()
    monthIdx = closed.getMonth()
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${year}-${pad(monthIdx + 1)}-01`
  const monthEnd = `${new Date(year, monthIdx + 1, 0).getFullYear()}-${pad(monthIdx + 1)}-${pad(new Date(year, monthIdx + 1, 0).getDate())}`
  // Month before, for the change %
  const prev = new Date(year, monthIdx - 1, 1)
  const prevStart = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`
  const prevEnd = `${new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate())}`

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const monthLabel = capitalize(new Date(year, monthIdx, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))
  const prevMonthLabel = capitalize(prev.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))

  // ── Compute the average from mag_inmag_history ──────────────────
  async function monthStats(start: string, end: string) {
    const { data } = await supabase
      .from('mag_inmag_history')
      .select('inmag_value')
      .gte('date', start)
      .lte('date', end)
      .not('inmag_value', 'is', null)
    const vals = (data || []).map((r) => Number(r.inmag_value)).filter((n) => n > 0)
    if (!vals.length) return null
    return {
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      ruedas: vals.length,
    }
  }

  const stats = await monthStats(monthStart, monthEnd)
  if (!stats) {
    return NextResponse.json({ message: `Sin datos de INMAG para ${monthLabel}`, sent: 0 }, { status: 200 })
  }
  const prevStats = await monthStats(prevStart, prevEnd)

  const payload = {
    monthLabel,
    avg: stats.avg,
    min: stats.min,
    max: stats.max,
    ruedas: stats.ruedas,
    prevMonthLabel,
    prevAvg: prevStats?.avg ?? null,
  }

  // ── Test mode: ?test=email sends only to that address (no subscribers) ──
  const testEmail = req.nextUrl.searchParams.get('test')
  if (testEmail) {
    await sendMonthlyClose(testEmail, payload)
    return NextResponse.json({ message: `Test enviado a ${testEmail}`, ...payload, avg: Math.round(stats.avg) })
  }

  // ── Recipients: all active subscribers ──────────────────────────
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email, lease_kg_ha, lease_hectareas')
    .eq('status', 'active')
    .in('source', [...SEGMENT_SOURCES.monthlyClose])

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: 'Sin suscriptores activos', sent: 0, monthLabel, avg: stats.avg })
  }

  // ── Send ────────────────────────────────────────────────────────
  const { toSend, skipped } = capForFreePlan(subscribers)
  let sent = 0
  const errors: string[] = []
  for (const sub of toSend) {
    try {
      const lease = (sub.lease_kg_ha && sub.lease_hectareas)
        ? { kgHa: Number(sub.lease_kg_ha), hectareas: Number(sub.lease_hectareas) }
        : null
      await sendMonthlyClose(sub.email, { ...payload, lease })
      sent++
      await new Promise((r) => setTimeout(r, 120)) // gentle rate-limit
    } catch (err) {
      errors.push(`${sub.email}: ${err}`)
    }
  }

  return NextResponse.json({
    message: `Cierre ${monthLabel} enviado: ${sent}/${subscribers.length}`,
    monthLabel,
    avg: Math.round(stats.avg),
    min: Math.round(stats.min),
    max: Math.round(stats.max),
    ruedas: stats.ruedas,
    sent,
    total: subscribers.length,
    skipped, // diferidos por tope del plan free de Resend
    errors: errors.length ? errors : undefined,
  })
}
