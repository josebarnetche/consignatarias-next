import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasAuthHeader } from '@/lib/api-auth'
import { getUserCurrentPeriodUsage, PLAN_LIMITS } from '@/lib/api-keys'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/account
 *
 * Self-service introspection for Enterprise API users. Accepts either:
 *   - Authorization: Bearer cnsg_live_...  (preferred, curl-friendly)
 *   - Session cookie                       (when called from logged-in browser)
 *
 * Returns plan, monthly quota, usage to date, remaining, reset date, and
 * key metadata (when called via Bearer).
 */

const SLA_BY_PLAN: Record<'starter' | 'growth' | 'scale', string> = {
  starter: '99.5%',
  growth: '99.8%',
  scale: '99.9%',
}

const UPGRADE_PATH: Record<'starter' | 'growth' | 'scale', string> = {
  starter: '/enterprise?upgrade=growth&from=starter',
  growth: '/enterprise?upgrade=scale&from=growth',
  scale: '/enterprise',
}

export async function GET(req: NextRequest) {
  // Path A: Bearer auth (the curl path)
  if (hasAuthHeader(req)) {
    const auth = await authenticate(req)
    if (!auth.ok) return auth.response

    const limits = PLAN_LIMITS[auth.plan]
    // `auth.usedThisMonth` was already incremented by authenticate(); subtract 1
    // for the read-only "where am I right now" view of the prior state.
    const used = Math.max(0, auth.usedThisMonth - 1)
    const remaining = Math.max(0, limits.monthlyQuota - used)
    const percent = Math.round((used / limits.monthlyQuota) * 100)

    return NextResponse.json({
      success: true,
      authenticated_via: 'api_key',
      key: {
        prefix: auth.key.prefix,
        environment: auth.key.environment,
      },
      plan: auth.plan,
      limits: {
        monthly_quota: limits.monthlyQuota,
        rate_limit_per_minute: limits.rateLimitPerMin,
      },
      usage: {
        period_used: used,
        period_remaining: remaining,
        percent_consumed: percent,
        period_start: auth.periodStart,
        period_end: auth.periodEnd,
        days_until_reset: auth.daysRemaining,
      },
      sla: SLA_BY_PLAN[auth.plan],
      upgrade_url: percent >= 80 ? `https://www.consignatarias.com.ar${UPGRADE_PATH[auth.plan]}` : null,
      docs: 'https://www.consignatarias.com.ar/api-docs',
      timestamp: new Date().toISOString(),
    })
  }

  // Path B: session cookie (browser logged-in user)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'unauthenticated',
          message: 'Provide Authorization: Bearer cnsg_live_... or log in via cookie.',
        },
      },
      { status: 401 },
    )
  }

  // Pull tier + api_tier from user_subscriptions
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier, api_tier, status, current_period_end, email')
    .eq('user_id', user.id)
    .maybeSingle()

  const apiTier = (sub?.api_tier as 'starter' | 'growth' | 'scale' | 'none' | undefined) ?? 'none'
  const hasApi = apiTier !== 'none'

  let apiBlock: Record<string, unknown> = { plan: 'none' }
  if (hasApi) {
    const plan = apiTier as 'starter' | 'growth' | 'scale'
    const limits = PLAN_LIMITS[plan]
    // 28-day billing period aggregation across all of this user's keys
    const { used: totalUsed, period } = await getUserCurrentPeriodUsage(user.id)
    const remaining = Math.max(0, limits.monthlyQuota - totalUsed)
    const percent = Math.round((totalUsed / limits.monthlyQuota) * 100)

    // Count active keys for display
    const { data: keys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .is('revoked_at', null)
    apiBlock = {
      plan,
      limits: {
        monthly_quota: limits.monthlyQuota,
        rate_limit_per_minute: limits.rateLimitPerMin,
      },
      usage: {
        period_used: totalUsed,
        period_remaining: remaining,
        percent_consumed: percent,
        period_start: period.start,
        period_end: period.end,
        days_until_reset: period.daysRemaining,
      },
      active_keys: keys?.length ?? 0,
      sla: SLA_BY_PLAN[plan],
      upgrade_url:
        percent >= 80 ? `https://www.consignatarias.com.ar${UPGRADE_PATH[plan]}` : null,
    }
  }

  return NextResponse.json({
    success: true,
    authenticated_via: 'session',
    user: {
      email: sub?.email ?? user.email ?? null,
      tier: sub?.tier ?? 'free',
    },
    enterprise: apiBlock,
    docs: 'https://www.consignatarias.com.ar/api-docs',
    timestamp: new Date().toISOString(),
  })
}
