import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getUserCurrentPeriodUsage, getUserPlan, PLAN_LIMITS } from '@/lib/api-keys'
import { sendQuotaAlert } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const THRESHOLD = 0.8 // 80%

/**
 * Daily cron: scan active API keys, send 80% quota alert (once per month per key).
 * Auth: x-cron-secret header or ?secret= query param (matches CRON_SECRET env).
 * Schedule: GitHub Actions daily (see .github/workflows/quota-alerts.yml).
 */
export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\\r\\n$/, '').trim()

  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()

  // Pull active keys grouped by user — one alert per user per period,
  // not per key (a user with 5 keys gets one alert).
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, prefix, quota_alert_month')
    .is('revoked_at', null)

  if (error) {
    console.error('quota-alerts: failed to list keys', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Pick one representative key per user (the most-recent one, by id ordering)
  const oneKeyPerUser = new Map<string, typeof keys[number]>()
  for (const k of keys ?? []) {
    if (!oneKeyPerUser.has(k.user_id)) oneKeyPerUser.set(k.user_id, k)
  }

  const results = {
    scanned: 0,
    skipped_already_alerted: 0,
    skipped_under_threshold: 0,
    skipped_no_plan: 0,
    sent: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  }

  for (const [userId, k] of oneKeyPerUser) {
    results.scanned++

    const plan = await getUserPlan(userId)
    if (!plan) {
      results.skipped_no_plan++
      continue
    }

    const limit = PLAN_LIMITS[plan].monthlyQuota
    const { used, period } = await getUserCurrentPeriodUsage(userId)

    // Dedup: have we already alerted in this billing period?
    if (k.quota_alert_month === period.start) {
      results.skipped_already_alerted++
      continue
    }

    if (used < THRESHOLD * limit) {
      results.skipped_under_threshold++
      continue
    }

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.email) {
      results.errors.push({ userId, error: 'no_email' })
      continue
    }

    const sendResult = await sendQuotaAlert({
      to: sub.email,
      keyName: k.name,
      prefix: k.prefix,
      plan,
      used,
      limit,
    })

    if (!sendResult.success) {
      results.errors.push({ userId, error: sendResult.error ?? 'send_failed' })
      continue
    }

    // Mark this period's alert on ALL of this user's active keys so the
    // dedup works regardless of which key we pick next time.
    await supabase
      .from('api_keys')
      .update({ quota_alert_month: period.start })
      .eq('user_id', userId)
      .is('revoked_at', null)

    results.sent++
  }

  return NextResponse.json({
    ok: true,
    threshold: THRESHOLD,
    period_anchored: '28-day billing period from api_tier_activated_at',
    ...results,
  })
}

// GET variant for manual cron triggers from browsers (also requires secret)
export const GET = POST
