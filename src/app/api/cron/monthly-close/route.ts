import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMonthlyClose } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Monthly close — on the 1st of each month, emails subscribers the previous
 * month's average INMAG (the number producers use to settle rural-lease canon).
 * Triggered by GitHub Actions cron (1st of month) or manually via workflow_dispatch.
 * Auth: ADMIN_SECRET as Bearer token or ?secret= query param.
 * Self-logs each run to cron_runs (visible in /admin/ops) with the sent count.
 *
 * Optional ?month=YYYY-MM overrides which month to close (for backfill/testing).
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const outcome = await trackCron('monthly-close', async () => {
    const supabase = requireServiceClient()

    // ── Resolve the month to close ──
    const override = req.nextUrl.searchParams.get('month') // "YYYY-MM"
    const now = new Date()
    let year: number, monthIdx: number
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
    const prev = new Date(year, monthIdx - 1, 1)
    const prevStart = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`
    const prevEnd = `${new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate())}`

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const monthLabel = capitalize(new Date(year, monthIdx, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))
    const prevMonthLabel = capitalize(prev.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))

    async function monthStats(start: string, end: string) {
      const { data } = await supabase
        .from('mag_inmag_history')
        .select('inmag_value')
        .gte('date', start)
        .lte('date', end)
        .not('inmag_value', 'is', null)
      const vals = (data || []).map((r) => Number(r.inmag_value)).filter((n) => n > 0)
      if (!vals.length) return null
      return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals), ruedas: vals.length }
    }

    const stats = await monthStats(monthStart, monthEnd)
    if (!stats) {
      return { message: `Sin datos de INMAG para ${monthLabel}`, metadata: { message: `Sin datos de INMAG para ${monthLabel}`, sent: 0 } }
    }
    const prevStats = await monthStats(prevStart, prevEnd)

    const payload = {
      monthLabel, avg: stats.avg, min: stats.min, max: stats.max, ruedas: stats.ruedas,
      prevMonthLabel, prevAvg: prevStats?.avg ?? null,
    }

    // ── Test mode ──
    const testEmail = req.nextUrl.searchParams.get('test')
    if (testEmail) {
      await sendMonthlyClose(testEmail, payload)
      return { message: `Test enviado a ${testEmail}`, metadata: { message: `Test enviado a ${testEmail}`, avg: Math.round(stats.avg), test: true } }
    }

    // ── Recipients ──
    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .select('email, lease_kg_ha, lease_hectareas')
      .eq('status', 'active')
      .in('source', [...SEGMENT_SOURCES.monthlyClose])

    if (!subscribers || subscribers.length === 0) {
      return { message: 'Sin suscriptores activos', metadata: { message: 'Sin suscriptores activos', sent: 0, monthLabel, avg: Math.round(stats.avg) } }
    }

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
        await new Promise((r) => setTimeout(r, 500))
      } catch (err) {
        errors.push(`${sub.email}: ${err}`)
      }
    }

    return {
      status: errors.length > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Cierre ${monthLabel} enviado: ${sent}/${subscribers.length}`,
      metadata: {
        message: `Cierre ${monthLabel} enviado: ${sent}/${subscribers.length}`,
        monthLabel, avg: Math.round(stats.avg), min: Math.round(stats.min), max: Math.round(stats.max),
        ruedas: stats.ruedas, sent, total: subscribers.length, skipped,
        errors: errors.length ? errors : undefined,
      },
    }
  })

  return NextResponse.json(outcome.metadata ?? { ok: true })
}
