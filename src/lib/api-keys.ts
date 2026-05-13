import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from './supabase-server'

/**
 * Enterprise API key system.
 *
 * Key format: `cnsg_{env}_{32 hex chars}`  (40-ish chars total)
 * Prefix (stored, visible): first 14 chars → `cnsg_live_a1b2`
 * Secret (never stored): the full string
 * Hash (stored): HMAC-SHA256(secret, API_KEY_PEPPER)
 */

const PREFIX_VISIBLE_LEN = 14
const SECRET_BYTES = 24 // → 48 hex chars

export type Plan = 'starter' | 'growth' | 'scale'

export interface PlanLimits {
  monthlyQuota: number
  rateLimitPerMin: number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: { monthlyQuota: 1_000, rateLimitPerMin: 30 },
  growth: { monthlyQuota: 50_000, rateLimitPerMin: 300 },
  scale: { monthlyQuota: 5_000_000, rateLimitPerMin: 5_000 },
}

function getPepper(): string {
  const pepper = process.env.API_KEY_PEPPER
  if (!pepper) {
    throw new Error('API_KEY_PEPPER env var is required')
  }
  return pepper
}

export function hashSecret(secret: string): string {
  return createHmac('sha256', getPepper()).update(secret).digest('hex')
}

export interface GeneratedKey {
  full: string // shown ONCE to the user
  prefix: string // stored for display
  hash: string // stored for verification
  environment: 'live' | 'test'
}

export function generateApiKey(environment: 'live' | 'test' = 'live'): GeneratedKey {
  const secret = randomBytes(SECRET_BYTES).toString('hex')
  const full = `cnsg_${environment}_${secret}`
  return {
    full,
    prefix: full.slice(0, PREFIX_VISIBLE_LEN),
    hash: hashSecret(full),
    environment,
  }
}

export interface VerifiedKey {
  id: string
  userId: string
  prefix: string
  environment: 'live' | 'test'
  allowedIps: string[]
}

/**
 * Parse a Bearer header, verify the key against api_keys, return the row.
 * Returns null on any failure (no leak about why).
 */
export async function verifyApiKey(authHeader: string | null): Promise<VerifiedKey | null> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null
  const raw = authHeader.slice(7).trim()
  if (!raw.startsWith('cnsg_')) return null
  if (raw.length < PREFIX_VISIBLE_LEN + 8) return null

  const prefix = raw.slice(0, PREFIX_VISIBLE_LEN)
  const admin = createAdminClient()

  const { data: row, error } = await admin
    .from('api_keys')
    .select('id, user_id, prefix, hash, environment, allowed_ips, revoked_at')
    .eq('prefix', prefix)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !row) return null

  // Constant-time compare
  const computed = hashSecret(raw)
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(row.hash, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return {
    id: row.id,
    userId: row.user_id,
    prefix: row.prefix,
    environment: row.environment as 'live' | 'test',
    allowedIps: (row.allowed_ips ?? []) as string[],
  }
}

/**
 * @deprecated use getUserCurrentPeriodUsage. Kept for legacy callers
 * (e.g. /cuenta/api-keys per-key display).
 */
export async function getMonthlyUsage(apiKeyId: string): Promise<number> {
  const admin = createAdminClient()
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const isoDate = monthStart.toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('api_usage_daily')
    .select('request_count')
    .eq('api_key_id', apiKeyId)
    .gte('date', isoDate)

  if (error || !data) return 0
  return data.reduce((sum, r) => sum + (r.request_count ?? 0), 0)
}

const BILLING_PERIOD_DAYS = 28

/**
 * Compute the current billing period for an Enterprise tier, anchored to
 * api_tier_activated_at. Returns ISO date strings (date-only, no time).
 *
 * Periods are 28 days each: [activated_at + N×28d, activated_at + (N+1)×28d).
 * If activated_at is null, defaults to a 28-day window ending today.
 */
export function currentPeriod(
  activatedAtIso: string | null,
): { start: string; end: string; daysIntoPeriod: number; daysRemaining: number } {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)

  if (!activatedAtIso) {
    const start = new Date(now.getTime() - BILLING_PERIOD_DAYS * 86400_000)
    return {
      start: start.toISOString().slice(0, 10),
      end: todayIso,
      daysIntoPeriod: BILLING_PERIOD_DAYS,
      daysRemaining: 0,
    }
  }

  const anchor = new Date(activatedAtIso)
  const diffMs = now.getTime() - anchor.getTime()
  const periodMs = BILLING_PERIOD_DAYS * 86400_000
  const cycleN = Math.max(0, Math.floor(diffMs / periodMs))
  const periodStart = new Date(anchor.getTime() + cycleN * periodMs)
  const periodEnd = new Date(periodStart.getTime() + periodMs)
  const daysIntoPeriod = Math.floor((now.getTime() - periodStart.getTime()) / 86400_000)
  const daysRemaining = Math.max(0, BILLING_PERIOD_DAYS - daysIntoPeriod)

  return {
    start: periodStart.toISOString().slice(0, 10),
    end: periodEnd.toISOString().slice(0, 10),
    daysIntoPeriod,
    daysRemaining,
  }
}

/**
 * Sum request_count across ALL active keys owned by userId within the
 * current 28-day billing period. Uses the user's api_tier_activated_at
 * as the period anchor (read in the same call so callers don't need to).
 */
export async function getUserCurrentPeriodUsage(userId: string): Promise<{
  used: number
  period: ReturnType<typeof currentPeriod>
}> {
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('api_tier_activated_at')
    .eq('user_id', userId)
    .maybeSingle()

  const period = currentPeriod(
    (sub?.api_tier_activated_at as string | null | undefined) ?? null,
  )

  const { data: keys } = await admin
    .from('api_keys')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (!keys || keys.length === 0) return { used: 0, period }

  const keyIds = keys.map((k) => k.id as string)

  const { data, error } = await admin
    .from('api_usage_daily')
    .select('request_count')
    .in('api_key_id', keyIds)
    .gte('date', period.start)
    .lt('date', period.end)

  if (error || !data) return { used: 0, period }
  const used = data.reduce((sum, r) => sum + (r.request_count ?? 0), 0)
  return { used, period }
}

export async function incrementUsage(apiKeyId: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('increment_api_usage', { p_key_id: apiKeyId })
  if (error) {
    console.error('increment_api_usage failed', error)
    return 0
  }
  return data as number
}

/**
 * Returns the user's Enterprise API tier, or null if they have no API access.
 * Reads user_subscriptions.api_tier (independent of tier = PRO Usuario).
 */
export async function getUserPlan(userId: string): Promise<Plan | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_subscriptions')
    .select('api_tier')
    .eq('user_id', userId)
    .maybeSingle()
  const t = data?.api_tier as string | undefined
  if (t === 'starter' || t === 'growth' || t === 'scale') return t
  return null
}

export async function hasApiAccess(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)) !== null
}
