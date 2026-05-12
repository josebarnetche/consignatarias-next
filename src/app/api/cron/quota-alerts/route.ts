import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getMonthlyUsage, getUserPlan, PLAN_LIMITS } from '@/lib/api-keys'
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

  if (cronSecret !== envSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  // Pull active keys that have NOT been alerted this month yet
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, prefix, quota_alert_month')
    .is('revoked_at', null)

  if (error) {
    console.error('quota-alerts: failed to list keys', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const results = {
    scanned: 0,
    skipped_already_alerted: 0,
    skipped_under_threshold: 0,
    skipped_no_plan: 0,
    sent: 0,
    errors: [] as Array<{ keyId: string; error: string }>,
  }

  for (const k of keys ?? []) {
    results.scanned++

    if (k.quota_alert_month === currentMonth) {
      results.skipped_already_alerted++
      continue
    }

    const plan = await getUserPlan(k.user_id)
    if (!plan) {
      results.skipped_no_plan++
      continue
    }

    const limit = PLAN_LIMITS[plan].monthlyQuota
    const used = await getMonthlyUsage(k.id)
    if (used < THRESHOLD * limit) {
      results.skipped_under_threshold++
      continue
    }

    // Resolve user email
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('email')
      .eq('user_id', k.user_id)
      .maybeSingle()

    if (!sub?.email) {
      results.errors.push({ keyId: k.id, error: 'no_email' })
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
      results.errors.push({ keyId: k.id, error: sendResult.error ?? 'send_failed' })
      continue
    }

    await supabase
      .from('api_keys')
      .update({ quota_alert_month: currentMonth })
      .eq('id', k.id)

    results.sent++
  }

  return NextResponse.json({
    ok: true,
    currentMonth,
    threshold: THRESHOLD,
    ...results,
  })
}

// GET variant for manual cron triggers from browsers (also requires secret)
export const GET = POST
