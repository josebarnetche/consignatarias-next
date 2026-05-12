import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasAuthHeader } from '@/lib/api-auth'
import { getMonthlyUsage, PLAN_LIMITS } from '@/lib/api-keys'
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

function startOfNextMonthIso(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const next = new Date(Date.UTC(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1))
  return next.toISOString().slice(0, 10)
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
        monthly_used: used,
        monthly_remaining: remaining,
        percent_consumed: percent,
        resets_on: startOfNextMonthIso(),
      },
      sla: SLA_BY_PLAN[auth.plan],
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
    // Sum usage across user's active keys for the current month
    const { data: keys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .is('revoked_at', null)

    const usagePerKey = await Promise.all(
      (keys ?? []).map(async (k) => getMonthlyUsage(k.id)),
    )
    const totalUsed = usagePerKey.reduce((s, v) => s + v, 0)
    const plan = apiTier as 'starter' | 'growth' | 'scale'
    const limits = PLAN_LIMITS[plan]
    const remaining = Math.max(0, limits.monthlyQuota - totalUsed)
    apiBlock = {
      plan,
      limits: {
        monthly_quota: limits.monthlyQuota,
        rate_limit_per_minute: limits.rateLimitPerMin,
      },
      usage: {
        monthly_used: totalUsed,
        monthly_remaining: remaining,
        percent_consumed: Math.round((totalUsed / limits.monthlyQuota) * 100),
        resets_on: startOfNextMonthIso(),
      },
      active_keys: keys?.length ?? 0,
      sla: SLA_BY_PLAN[plan],
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
