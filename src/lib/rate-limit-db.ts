import { createServiceClient } from '@/lib/supabase'

/**
 * Durable, cross-instance rate limiter backed by Postgres (rate_limit_hits +
 * bump_rate_limit RPC, see migration 20260629_security_hardening.sql).
 *
 * The in-memory limiter in lib/rate-limit.ts is per-Lambda-instance and is
 * trivially bypassed on serverless by spreading requests across warm
 * instances. Use THIS for anything that must actually be bounded across the
 * fleet — especially unauthenticated endpoints that send email or write rows.
 *
 * Fixed-window counter: the window is `floor(now / windowSeconds)`. Fails OPEN
 * (allows the request) if the limiter backend is unavailable, so a transient DB
 * issue never takes down a public form — the abuse case is the cost, not
 * correctness.
 */
export interface RateLimitOptions {
  /** Logical name of the limited action, e.g. 'claims' or 'newsletter'. */
  action: string
  /** Caller identity within the action — an IP, email, or `${ip}:${email}`. */
  identity: string
  /** Max requests allowed per window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
}

export interface RateLimitVerdict {
  ok: boolean
  /** Seconds until the window resets (only meaningful when !ok). */
  retryAfter: number
}

export async function enforceRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitVerdict> {
  const { action, identity, limit, windowSeconds } = opts
  const service = createServiceClient()
  if (!service) return { ok: true, retryAfter: 0 } // fail open if unconfigured

  const nowSec = Math.floor(Date.now() / 1000)
  const windowIndex = Math.floor(nowSec / windowSeconds)
  const windowStart = new Date(windowIndex * windowSeconds * 1000).toISOString()
  const bucket = `${action}:${identity}`

  try {
    const { data, error } = await service.rpc('bump_rate_limit', {
      p_bucket: bucket,
      p_window_start: windowStart,
    })
    if (error) {
      console.error('[rate-limit-db] bump failed, failing open:', error.message)
      return { ok: true, retryAfter: 0 }
    }
    const count = (data as number) ?? 0
    if (count > limit) {
      const retryAfter = (windowIndex + 1) * windowSeconds - nowSec
      return { ok: false, retryAfter: Math.max(1, retryAfter) }
    }
    return { ok: true, retryAfter: 0 }
  } catch (e) {
    console.error('[rate-limit-db] unexpected error, failing open:', e)
    return { ok: true, retryAfter: 0 }
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Standard 429 body for a rate-limited request. */
export function rateLimitedResponse(retryAfter: number) {
  return Response.json(
    {
      success: false,
      error: {
        code: 'rate_limited',
        message: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.',
        retryAfter,
      },
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
