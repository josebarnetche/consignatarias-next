import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getUserCurrentPeriodUsage, getUserPlan, PLAN_LIMITS } from '@/lib/api-keys'
import { sendTrialNudge } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Free-credits invites are a 30-day trial anchored to api_tier_activated_at.
const TRIAL_DAYS = 30
const DAY_MS = 86400_000

/**
 * Daily cron: nudge free-credits trial users 7 and 3 days before their
 * 30-day trial ends. Subtle, usage-aware; showcases the full API + Growth.
 * Does NOT pause access — access continues past the trial end untouched.
 * Each of the two nudges fires once (dedup via user_subscriptions columns).
 *
 * Auth: x-cron-secret header or ?secret= query param (matches CRON_SECRET env).
 * Schedule: GitHub Actions daily (see .github/workflows/trial-nudges.yml).
 */
export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\\r\\n$/, '').trim()

  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()

  // Trial population = redeemed free-credits invites.
  const { data: invites, error } = await supabase
    .from('pending_api_invites')
    .select('redeemed_user_id')
    .eq('free_credits', true)
    .not('redeemed_user_id', 'is', null)

  if (error) {
    console.error('trial-nudges: failed to list invites', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const results = {
    scanned: 0,
    skipped_no_plan: 0,
    skipped_no_activation: 0,
    skipped_out_of_window: 0,
    skipped_already_sent: 0,
    sent_7d: 0,
    sent_3d: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  }

  const now = Date.now()
  const seen = new Set<string>()

  for (const inv of invites ?? []) {
    const userId = inv.redeemed_user_id as string
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    results.scanned++

    const plan = await getUserPlan(userId)
    if (!plan) {
      results.skipped_no_plan++
      continue
    }

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('email, api_tier_activated_at, trial_nudge_7d_at, trial_nudge_3d_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.api_tier_activated_at) {
      results.skipped_no_activation++
      continue
    }
    if (!sub.email) {
      results.errors.push({ userId, error: 'no_email' })
      continue
    }

    const trialEndsMs = new Date(sub.api_tier_activated_at).getTime() + TRIAL_DAYS * DAY_MS
    const daysLeft = Math.ceil((trialEndsMs - now) / DAY_MS)
    const trialEndsAtIso = new Date(trialEndsMs).toISOString()

    // Which nudge, if any? 3-day window takes precedence over 7-day.
    let phase: 7 | 3 | null = null
    if (daysLeft <= 3 && daysLeft >= 0 && !sub.trial_nudge_3d_at) phase = 3
    else if (daysLeft <= 7 && daysLeft > 3 && !sub.trial_nudge_7d_at) phase = 7

    if (!phase) {
      if (
        (daysLeft <= 3 && sub.trial_nudge_3d_at) ||
        (daysLeft <= 7 && daysLeft > 3 && sub.trial_nudge_7d_at)
      ) {
        results.skipped_already_sent++
      } else {
        results.skipped_out_of_window++
      }
      continue
    }

    const limit = PLAN_LIMITS[plan].monthlyQuota
    const { used } = await getUserCurrentPeriodUsage(userId)

    const sendResult = await sendTrialNudge({
      to: sub.email,
      daysLeft: phase,
      used,
      limit,
      plan,
      trialEndsAtIso,
    })

    if (!sendResult.success) {
      results.errors.push({ userId, error: sendResult.error ?? 'send_failed' })
      continue
    }

    const col = phase === 3 ? 'trial_nudge_3d_at' : 'trial_nudge_7d_at'
    await supabase
      .from('user_subscriptions')
      .update({ [col]: new Date().toISOString() })
      .eq('user_id', userId)

    if (phase === 3) results.sent_3d++
    else results.sent_7d++
  }

  return NextResponse.json({
    ok: true,
    trial_days: TRIAL_DAYS,
    note: 'No access is paused; nudges only.',
    ...results,
  })
}

// GET variant for manual cron triggers from browsers (also requires secret)
export const GET = POST
