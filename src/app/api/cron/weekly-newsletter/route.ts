import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendWeeklyNewsletter } from '@/lib/email'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/**
 * Weekly newsletter — sends featured PRO remates to all newsletter subscribers.
 * Triggered by GitHub Actions cron (Mondays 10:00 ART) or manually via admin.
 * Auth: requires ADMIN_SECRET as Bearer token or ?secret= query param.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    || req.nextUrl.searchParams.get('secret')

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const auctions = rematesData as Auction[]

  // Get date range for next 7 days
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const todayStr = today.toISOString().slice(0, 10)
  const nextWeekStr = nextWeek.toISOString().slice(0, 10)

  // Format week range for email subject
  const formatShortDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  const weekRange = `${formatShortDate(today)} - ${formatShortDate(nextWeek)}`

  // Get upcoming auctions
  const upcomingAuctions = auctions
    .filter(a => a.date >= todayStr && a.date <= nextWeekStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Get PRO/featured consignatarias
  const { data: proConsignatarias } = await supabase
    .from('consignatarias')
    .select('canonical_slug, display_name, featured')
    .or('featured.eq.true')

  const { data: proSubscriptions } = await supabase
    .from('subscriptions')
    .select('entity_slug')
    .eq('entity_type', 'consignataria')
    .in('status', ['active', 'past_due'])

  // Build set of PRO slugs
  const proSlugs = new Set<string>()
  proConsignatarias?.forEach(c => {
    if (c.featured) proSlugs.add(c.canonical_slug)
  })
  proSubscriptions?.forEach(s => proSlugs.add(s.entity_slug))

  // Separate PRO and regular auctions
  const proAuctions = upcomingAuctions.filter(a => proSlugs.has(a.consignatariaSlug))
  const regularAuctions = upcomingAuctions.filter(a => !proSlugs.has(a.consignatariaSlug))

  // Featured remates: all PRO + top 5 regular (by date)
  const featuredRemates = [
    ...proAuctions.map(a => ({
      title: a.title,
      date: a.date,
      time: a.time,
      location: a.location || '',
      consignataria: a.consignatariaName,
      slug: a.consignatariaSlug,
      heads: a.estimatedHeads,
      isPro: true,
    })),
    ...regularAuctions.slice(0, Math.max(0, 10 - proAuctions.length)).map(a => ({
      title: a.title,
      date: a.date,
      time: a.time,
      location: a.location || '',
      consignataria: a.consignatariaName,
      slug: a.consignatariaSlug,
      heads: a.estimatedHeads,
      isPro: false,
    })),
  ].slice(0, 10) // Max 10 featured

  if (featuredRemates.length === 0) {
    return NextResponse.json({ message: 'No hay remates para la próxima semana', sent: 0 })
  }

  // Get newsletter subscribers
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active')

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: 'No hay suscriptores activos', sent: 0 })
  }

  // Send emails
  let sent = 0
  const errors: string[] = []

  for (const sub of subscribers) {
    try {
      await sendWeeklyNewsletter(
        sub.email,
        featuredRemates,
        upcomingAuctions.length,
        weekRange,
      )
      sent++
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      errors.push(`${sub.email}: ${err}`)
    }
  }

  return NextResponse.json({
    message: `Newsletter enviado: ${sent}/${subscribers.length}`,
    sent,
    total: subscribers.length,
    weekRange,
    featuredCount: featuredRemates.length,
    proCount: proAuctions.length,
    totalRemates: upcomingAuctions.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
