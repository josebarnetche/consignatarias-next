import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendWeeklyNewsletter } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/**
 * Weekly newsletter — sends featured PRO remates to all newsletter subscribers.
 * Triggered by GitHub Actions cron (Mondays 10:00 ART) or manually via admin.
 * Auth: requires ADMIN_SECRET as Bearer token or ?secret= query param.
 * Self-logs each run to cron_runs (visible in /admin/ops) with the sent count.
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const outcome = await trackCron('weekly-newsletter', async () => {
    const supabase = requireServiceClient()
    const auctions = rematesData as Auction[]

    // Get date range for next 7 days
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const todayStr = today.toISOString().slice(0, 10)
    const nextWeekStr = nextWeek.toISOString().slice(0, 10)

    const formatShortDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
    const weekRange = `${formatShortDate(today)} - ${formatShortDate(nextWeek)}`

    const upcomingAuctions = auctions
      .filter(a => a.date >= todayStr && a.date <= nextWeekStr)
      .sort((a, b) => a.date.localeCompare(b.date))

    const { data: proConsignatarias } = await supabase
      .from('consignatarias')
      .select('canonical_slug, display_name, featured')
      .or('featured.eq.true')

    const { data: proSubscriptions } = await supabase
      .from('subscriptions')
      .select('entity_slug')
      .eq('entity_type', 'consignataria')
      .in('status', ['active', 'past_due'])

    const proSlugs = new Set<string>()
    proConsignatarias?.forEach(c => { if (c.featured) proSlugs.add(c.canonical_slug) })
    proSubscriptions?.forEach(s => proSlugs.add(s.entity_slug))

    const proAuctions = upcomingAuctions.filter(a => proSlugs.has(a.consignatariaSlug))
    const regularAuctions = upcomingAuctions.filter(a => !proSlugs.has(a.consignatariaSlug))

    const featuredRemates = [
      ...proAuctions.map(a => ({
        title: a.title, date: a.date, time: a.time, location: a.location || '',
        consignataria: a.consignatariaName, slug: a.consignatariaSlug, heads: a.estimatedHeads, isPro: true,
      })),
      ...regularAuctions.slice(0, Math.max(0, 10 - proAuctions.length)).map(a => ({
        title: a.title, date: a.date, time: a.time, location: a.location || '',
        consignataria: a.consignatariaName, slug: a.consignatariaSlug, heads: a.estimatedHeads, isPro: false,
      })),
    ].slice(0, 10)

    if (featuredRemates.length === 0) {
      return { message: 'No hay remates para la próxima semana', metadata: { message: 'No hay remates para la próxima semana', sent: 0 } }
    }

    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .in('source', [...SEGMENT_SOURCES.weekly])

    if (!subscribers || subscribers.length === 0) {
      return { message: 'No hay suscriptores activos', metadata: { message: 'No hay suscriptores activos', sent: 0 } }
    }

    const { toSend, skipped } = capForFreePlan(subscribers)
    let sent = 0
    const errors: string[] = []

    for (const sub of toSend) {
      try {
        await sendWeeklyNewsletter(sub.email, featuredRemates, upcomingAuctions.length, weekRange)
        sent++
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        errors.push(`${sub.email}: ${err}`)
      }
    }

    const body = {
      message: `Newsletter enviado: ${sent}/${subscribers.length}`,
      sent,
      total: subscribers.length,
      skipped,
      weekRange,
      featuredCount: featuredRemates.length,
      proCount: proAuctions.length,
      totalRemates: upcomingAuctions.length,
      errors: errors.length > 0 ? errors : undefined,
    }
    return {
      status: errors.length > 0 && sent === 0 ? 'error' : 'ok',
      message: body.message,
      metadata: { sent, total: subscribers.length, skipped, errors: errors.length },
    }
  })

  return NextResponse.json(outcome.metadata ?? { ok: true })
}
