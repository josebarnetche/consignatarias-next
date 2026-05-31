import type { NextRequest } from 'next/server'

/**
 * Authorizes a cron request.
 *
 * Accepts the shared secret via `Authorization: Bearer`, `x-cron-secret` header,
 * or `?secret=` query. Matches against **CRON_SECRET** (the secret the data crons
 * use and that is known-good in GitHub + Vercel) OR the legacy **ADMIN_SECRET**.
 *
 * Why: the email crons (weekly-newsletter, faena-newsletter, monthly-close) used
 * to require ADMIN_SECRET only, while every working data cron uses CRON_SECRET.
 * If ADMIN_SECRET was unset/mismatched the email crons 401'd silently and never
 * sent. Accepting either secret aligns them with the proven path.
 */
export function authorizeCron(req: NextRequest): boolean {
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\r\n$/, '').trim()
  const provided = clean(
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.headers.get('x-cron-secret') ||
      req.nextUrl.searchParams.get('secret'),
  )
  if (!provided) return false
  const cron = clean(process.env.CRON_SECRET)
  const admin = clean(process.env.ADMIN_SECRET)
  return (!!cron && provided === cron) || (!!admin && provided === admin)
}
