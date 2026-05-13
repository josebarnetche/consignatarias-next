import { NextRequest, NextResponse } from 'next/server'
import {
  getMonthlyUsage,
  getUserPlan,
  incrementUsage,
  PLAN_LIMITS,
  verifyApiKey,
  type VerifiedKey,
  type Plan,
} from './api-keys'

export interface AuthOk {
  ok: true
  key: VerifiedKey
  plan: Plan
  usedThisMonth: number
  remaining: number
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

  const key = await verifyApiKey(header)
  if (!key) {
    return {
      ok: false,
      response: errorResponse('invalid_key', 'Invalid or revoked API key', 401),
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
  const used = await getMonthlyUsage(key.id)

  if (used >= limits.monthlyQuota) {
    return {
      ok: false,
      response: errorResponse(
        'quota_exceeded',
        `Monthly quota of ${limits.monthlyQuota} requests reached. Upgrade your plan at /enterprise.`,
        429,
      ),
    }
  }

  // Best-effort increment — non-blocking failure shouldn't deny access.
  // The RPC's return value is today-only; we keep the monthly aggregate by
  // adding 1 to the pre-call monthly count.
  await incrementUsage(key.id)
  const usedAfter = used + 1

  return {
    ok: true,
    key,
    plan,
    usedThisMonth: usedAfter,
    remaining: Math.max(0, limits.monthlyQuota - usedAfter),
  }
}

export function setQuotaHeaders(res: NextResponse, auth: AuthOk) {
  const limits = PLAN_LIMITS[auth.plan]
  res.headers.set('X-RateLimit-Plan', auth.plan)
  res.headers.set('X-RateLimit-Limit', limits.monthlyQuota.toString())
  res.headers.set('X-RateLimit-Remaining', auth.remaining.toString())
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
