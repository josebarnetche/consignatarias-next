/**
 * IP-based rate limiter for anonymous API access (sliding window, in-memory).
 *
 * Only applies to requests WITHOUT an `Authorization: Bearer cnsg_...` header.
 * Authenticated Enterprise calls bypass this entirely and are gated by the
 * authenticate() helper in lib/api-auth.ts:
 *   - Starter:  30 req/min, 1.000 req/mes
 *   - Growth:  300 req/min, 50.000 req/mes
 *   - Scale: 5.000 req/min, up to 5M req/mes
 *
 * Anonymous: 1 req/min (this file's FREE_TIER).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (works for single instance, use Redis for multi-instance)
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Requests allowed per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

const FREE_TIER: RateLimitConfig = { limit: 1, windowSeconds: 60 }
const PRO_TIER: RateLimitConfig = { limit: 100, windowSeconds: 60 }

/**
 * Check rate limit for an identifier (IP or API key)
 */
export function checkRateLimit(
  identifier: string,
  tier: 'free' | 'pro' = 'free'
): RateLimitResult {
  const config = tier === 'pro' ? PRO_TIER : FREE_TIER
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  
  const entry = store.get(identifier)
  
  // No entry or window expired — create new window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    store.set(identifier, { count: 1, resetAt })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    }
  }
  
  // Within window — check limit
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }
  
  // Increment counter
  entry.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientId(request: Request): string {
  // Vercel provides real IP in x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  // Fallback headers
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  
  // Last resort
  return 'unknown'
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())
}
