import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendPostRemateResultsRequest } from '@/lib/email'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/**
 * POST /api/cron/post-remate-outreach
 * 
 * Sends outreach emails to consignatarias ~3 hours after their remate ends,
 * asking them to share their results/averages.
 * 
 * Run this hourly via Vercel Cron or GitHub Actions.
 */

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Server runs in UTC; auction times are ART (UTC-3). Derive today's date + the
  // current hour in America/Argentina/Buenos_Aires so "after the auction" timing is
  // correct (getHours() returned the UTC hour → outreach fired ~3h off).
  const artParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now)
  const artPart = (t: string) => artParts.find((p) => p.type === t)?.value ?? ''
  const today = `${artPart('year')}-${artPart('month')}-${artPart('day')}`
  const currentHour = parseInt(artPart('hour'), 10)

  // Get all auctions for today
  const todayAuctions = (rematesData as Auction[]).filter(a => a.date === today)

  if (todayAuctions.length === 0) {
    return NextResponse.json({ 
      message: 'No auctions today',
      date: today,
      sent: 0 
    })
  }

  // Get consignataria emails from Supabase
  const supabase = requireServiceClient()
  const { data: consignatarias } = await supabase
    .from('consignatarias')
    .select('canonical_slug, email, display_name')
    .not('email', 'is', null)

  const emailMap = new Map<string, { email: string; displayName: string }>()
  consignatarias?.forEach(c => {
    if (c.email && c.canonical_slug) {
      emailMap.set(c.canonical_slug, { 
        email: c.email, 
        displayName: c.display_name || c.canonical_slug 
      })
    }
  })

  // Find auctions that ended approximately 3 hours ago
  // Auction times are typically in format "10:00" or "10:30"
  // We consider an auction "ended" if:
  // - It has a time AND current time is 3+ hours after start
  // - OR it doesn't have a time AND current hour is >= 18 (6 PM, assuming ended)

  const results: Array<{
    consignataria: string
    email: string
    status: 'sent' | 'skipped' | 'error'
    reason?: string
  }> = []

  // Same-day dedup by slug (don't email the same consignataria twice in one day)
  const { data: sentToday } = await supabase
    .from('outreach_log')
    .select('consignataria_slug')
    .eq('type', 'post_remate_results')
    .gte('sent_at', `${today}T00:00:00`)

  const alreadySent = new Set(sentToday?.map(r => r.consignataria_slug) || [])

  // 30-day rate-limit per recipient address. Hitting the same info@ inbox
  // every week with identical copy converts at 0%. Cap to once per 30 days
  // per email so we either reach a different contact or pause and switch
  // channel (WhatsApp) for the stale ones.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const { data: sentRecently } = await supabase
    .from('outreach_log')
    .select('email_sent_to')
    .eq('type', 'post_remate_results')
    .gte('sent_at', thirtyDaysAgo)

  const recentEmails = new Set(
    (sentRecently || [])
      .map(r => r.email_sent_to?.toLowerCase())
      .filter((e): e is string => !!e),
  )

  for (const auction of todayAuctions) {
    const slug = auction.consignatariaSlug
    
    // Skip if already sent today
    if (alreadySent.has(slug)) {
      results.push({
        consignataria: slug,
        email: '',
        status: 'skipped',
        reason: 'Already sent today'
      })
      continue
    }

    // Check if auction has ended (~3 hours ago)
    let hasEnded = false
    
    if (auction.time) {
      // Parse time like "10:00" or "10:30"
      const [hours] = auction.time.split(':').map(Number)
      const auctionStartHour = hours
      // Assume auctions last ~2 hours, so ended = start + 2, plus 3h buffer = start + 5h
      // We want to send 3h after end, so roughly start + 5h
      hasEnded = currentHour >= (auctionStartHour + 5)
    } else {
      // No time specified - assume daytime auction, send after 6 PM
      hasEnded = currentHour >= 18
    }

    if (!hasEnded) {
      results.push({
        consignataria: slug,
        email: '',
        status: 'skipped',
        reason: `Auction not ended yet (time: ${auction.time || 'N/A'}, current: ${currentHour}:00)`
      })
      continue
    }

    // Get email for this consignataria
    const contactInfo = emailMap.get(slug)
    
    if (!contactInfo?.email) {
      results.push({
        consignataria: slug,
        email: '',
        status: 'skipped',
        reason: 'No email on file'
      })
      continue
    }

    // 30-day rate-limit per recipient address
    if (recentEmails.has(contactInfo.email.toLowerCase())) {
      results.push({
        consignataria: slug,
        email: contactInfo.email,
        status: 'skipped',
        reason: 'Rate-limited (already emailed in last 30 days)'
      })
      continue
    }

    // Send the email
    const result = await sendPostRemateResultsRequest({
      to: contactInfo.email,
      consignatariaName: contactInfo.displayName,
      slug,
      location: auction.location || auction.province || 'Argentina',
      remateDate: auction.date,
      remateTitle: auction.title,
    })

    if (result.success) {
      // Log the send
      try {
        await supabase.from('outreach_log').insert({
          type: 'post_remate_results',
          consignataria_slug: slug,
          email_sent_to: contactInfo.email,
          auction_date: auction.date,
          auction_title: auction.title,
        })
      } catch {
        // Don't fail if logging fails
      }

      alreadySent.add(slug) // Prevent duplicates within this run
      recentEmails.add(contactInfo.email.toLowerCase()) // Same for rate-limit set

      results.push({
        consignataria: slug,
        email: contactInfo.email,
        status: 'sent'
      })
    } else {
      results.push({
        consignataria: slug,
        email: contactInfo.email,
        status: 'error',
        reason: result.error
      })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    date: today,
    currentHour,
    totalAuctions: todayAuctions.length,
    sent,
    skipped,
    errors,
    results
  })
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
