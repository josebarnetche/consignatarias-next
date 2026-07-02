import { NextRequest, NextResponse } from 'next/server'
import {
  getUserCurrentPeriodUsage,
  getUserPlan,
  incrementUsage,
  PLAN_LIMITS,
  verifyApiKey,
  type VerifiedKey,
  type Plan,
} from './api-keys'

const UPGRADE_PATH: Record<Plan, string> = {
  starter: '/enterprise?upgrade=growth&from=starter',
  growth: '/enterprise?upgrade=scale&from=growth',
  scale: '/enterprise', // already top
}

export interface AuthOk {
  ok: true
  key: VerifiedKey
  plan: Plan
  usedThisMonth: number
  remaining: number
  periodStart: string
  periodEnd: string
  daysRemaining: number
}

export interface AuthFail {
  ok: false
  response: NextResponse
}

export type AuthResult = AuthOk | AuthFail

/**
 * Verify a request's API key, enforce monthly quota, increment usage.
 * Returns either { ok: true, ... } or { ok: false, response }.
 *
 * Use as opt-in: free endpoints can call this and fall back to unauthenticated
 * access when there's no Authorization header. Strict endpoints can require
 * auth by treating "no header" as 401.
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get('authorization')

  if (!header) {
    return {
      ok: false,
      response: errorResponse(
        'auth_required',
        'API key required. Get one at https://www.consignatarias.com.ar/cuenta/api-keys (requires an Enterprise plan).',
        401,
      ),
    }
  }

  const key = await verifyApiKey(header)
  if (!key) {
    return {
      ok: false,
      response: errorResponse('invalid_key', 'Invalid or revoked API key', 401),
    }
  }

  // Enforce the per-key IP allowlist. It was stored on the key but never
  // checked, so the advertised allowlist was a no-op and keys worked from any
  // IP. Empty allowlist = no restriction (backwards compatible).
  if (key.allowedIps.length > 0) {
    const requestIp = getRequestIp(req)
    if (!requestIp || !key.allowedIps.includes(requestIp)) {
      return {
        ok: false,
        response: errorResponse(
          'ip_not_allowed',
          'This API key is restricted to an IP allowlist that does not include your address.',
          403,
        ),
      }
    }
  }

  const plan = await getUserPlan(key.userId)
  if (!plan) {
    return {
      ok: false,
      response: errorResponse(
        'no_api_access',
        'This account does not have an active Enterprise plan. Upgrade at /enterprise.',
        403,
      ),
    }
  }
  const limits = PLAN_LIMITS[plan]
  // User-level aggregation (across all of this user's keys) within the
  // current 28-day billing period anchored to api_tier_activated_at.
  const { used, period } = await getUserCurrentPeriodUsage(key.userId)

  if (used >= limits.monthlyQuota) {
    const upgradePath = UPGRADE_PATH[plan]
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'quota_exceeded',
            message: `Cupo de ${limits.monthlyQuota.toLocaleString('en-US')} req del período ${period.start}…${period.end} agotado. Renueva el ${period.end} o upgradeá tu plan.`,
            current_plan: plan,
            quota: limits.monthlyQuota,
            used,
            period_start: period.start,
            period_end: period.end,
            days_until_reset: period.daysRemaining,
            upgrade_url: `https://www.consignatarias.com.ar${upgradePath}`,
          },
        },
        { status: 429 },
      ),
    }
  }

  // Best-effort increment — non-blocking failure shouldn't deny access.
  await incrementUsage(key.id)
  const usedAfter = used + 1

  return {
    ok: true,
    key,
    plan,
    usedThisMonth: usedAfter,
    remaining: Math.max(0, limits.monthlyQuota - usedAfter),
    periodStart: period.start,
    periodEnd: period.end,
    daysRemaining: period.daysRemaining,
  }
}

export function setQuotaHeaders(res: NextResponse, auth: AuthOk) {
  const limits = PLAN_LIMITS[auth.plan]
  res.headers.set('X-RateLimit-Plan', auth.plan)
  res.headers.set('X-RateLimit-Limit', limits.monthlyQuota.toString())
  res.headers.set('X-RateLimit-Remaining', auth.remaining.toString())
  res.headers.set('X-RateLimit-Period-End', auth.periodEnd)
  res.headers.set('X-RateLimit-Days-Until-Reset', auth.daysRemaining.toString())
}

export function hasAuthHeader(req: NextRequest): boolean {
  return !!req.headers.get('authorization')
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  )
}

/** Client IP from proxy headers (Vercel prepends the real client IP). */
function getRequestIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || null
}
