import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

/**
 * Authorizes a cron request.
 *
 * Accepts the shared secret via the `Authorization: Bearer` or `x-cron-secret`
 * HEADER only. The `?secret=` query channel was removed — secrets in URLs leak
 * into access logs, Referer headers, and CDN logs. All GitHub Actions workflows
 * and Vercel crons already send the secret via header.
 *
 * Matches against **CRON_SECRET** (the secret the data crons use, known-good in
 * GitHub + Vercel) OR the legacy **ADMIN_SECRET**, using a constant-time
 * comparison so the secret can't be recovered via response-timing.
 *
 * Fails CLOSED: no provided secret, or no configured secret → false.
 */
export function authorizeCron(req: NextRequest): boolean {
  // .trim() already strips trailing CR/LF and surrounding whitespace.
  const clean = (s: string | null | undefined) => (s ?? '').trim()
  const provided = clean(
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.headers.get('x-cron-secret'),
  )
  if (!provided) return false
  const cron = clean(process.env.CRON_SECRET)
  const admin = clean(process.env.ADMIN_SECRET)
  return (
    (!!cron && safeEqual(provided, cron)) ||
    (!!admin && safeEqual(provided, admin))
  )
}

/** Constant-time string compare that doesn't early-return on length. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Compare against self to keep timing independent of the length mismatch.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}
