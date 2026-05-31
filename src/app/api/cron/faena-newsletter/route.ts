import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendFaenaNewsletter } from '@/lib/email'
import { getFaenaStats, formatFaenaDate } from '@/lib/faena-api'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'

/**
 * Faena Newsletter — sends monthly cattle slaughter stats to subscribers from
 * /frigorificos (faena segment). GitHub Actions cron (1st of month) or manual.
 * Auth: ADMIN_SECRET as Bearer token or ?secret= query param.
 * Self-logs each run to cron_runs (visible in /admin/ops) with the sent count.
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const outcome = await trackCron('faena-newsletter', async () => {
    const stats = await getFaenaStats()
    if (!stats) {
      return {
        status: 'error' as const,
        message: 'API datos.gob.ar no respondió',
        metadata: { _status: 502, error: 'No se pudieron obtener datos de faena', sent: 0 },
      }
    }

    const supabase = requireServiceClient()
    const { data: faenaSubscribers } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .in('source', [...SEGMENT_SOURCES.faena])

    if (!faenaSubscribers || faenaSubscribers.length === 0) {
      return { message: 'No hay suscriptores de faena', metadata: { message: 'No hay suscriptores de faena', sent: 0 } }
    }

    const currentMonth = formatFaenaDate(stats.current.date)
    const { toSend, skipped } = capForFreePlan(faenaSubscribers)
    let sent = 0
    const errors: string[] = []

    for (const sub of toSend) {
      try {
        const result = await sendFaenaNewsletter({
          to: sub.email,
          currentMonth,
          cabezas: stats.current.cabezas,
          monthlyChange: stats.monthlyChange,
          yearlyChange: stats.yearlyChange,
          total12Months: stats.total12Months,
        })
        if (result.success) sent++
        else errors.push(`${sub.email}: ${result.error}`)
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        errors.push(`${sub.email}: ${err}`)
      }
    }

    return {
      status: errors.length > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Faena newsletter enviado: ${sent}/${faenaSubscribers.length}`,
      metadata: {
        message: `Faena newsletter enviado: ${sent}/${faenaSubscribers.length}`,
        sent,
        total: faenaSubscribers.length,
        skipped,
        month: currentMonth,
        errors: errors.length > 0 ? errors : undefined,
      },
    }
  })

  const meta = { ...(outcome.metadata ?? {}) } as Record<string, unknown>
  const status = typeof meta._status === 'number' ? (meta._status as number) : 200
  delete meta._status
  return NextResponse.json(meta, { status })
}

// GET for health check
export async function GET() {
  const stats = await getFaenaStats()
  if (!stats) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch faena data' }, { status: 502 })
  }
  return NextResponse.json({
    status: 'ok',
    lastData: formatFaenaDate(stats.current.date),
    cabezas: stats.current.cabezas,
    endpoint: '/api/cron/faena-newsletter',
    method: 'POST',
    auth: 'Bearer ADMIN_SECRET or ?secret=ADMIN_SECRET',
  })
}
