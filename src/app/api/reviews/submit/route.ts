import { NextRequest, NextResponse } from 'next/server'
import { submitReview } from '@/lib/dal/reviews'
import { getClientId } from '@/lib/rate-limit'
import { enforceRateLimit, rateLimitedResponse } from '@/lib/rate-limit-db'
import { logEvent } from '@/lib/ops'

export const runtime = 'nodejs'

/**
 * POST /api/reviews/submit
 *
 * Public anonymous endpoint. Inserts a review with status='pending'. Admin
 * must approve before it shows publicly. Guards: (1) the durable per-IP rate
 * limit below — this route is NOT in the middleware allowlist and the
 * in-memory limiter is per-instance, so neither bounded abuse across the
 * fleet; (2) the unique (slug, email) constraint so one email = one review
 * per consignataria.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const requestId = crypto.randomUUID()

  const ipForLimit = getClientId(req)
  const rl = await enforceRateLimit({
    action: 'reviews_submit',
    identity: `ip:${ipForLimit}`,
    limit: 10,
    windowSeconds: 600,
  })
  if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    void logEvent({
      eventType: 'api_call',
      status: 'error',
      route: '/api/reviews/submit',
      statusCode: 400,
      latencyMs: Date.now() - t0,
      requestId,
      metadata: { reason: 'invalid_json' },
    })
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const submitterRole = typeof b.submitterRole === 'string' ? b.submitterRole : undefined
  const submitterProvincia = typeof b.submitterProvincia === 'string' ? b.submitterProvincia : undefined
  const validRoles = ['productor', 'asesor', 'comprador', 'otro']
  const role = submitterRole && validRoles.includes(submitterRole) ? submitterRole : undefined

  const ip = getClientId(req)

  const result = await submitReview({
    consignatariaSlug: String(b.consignatariaSlug ?? ''),
    submitterName: String(b.submitterName ?? ''),
    submitterEmail: String(b.submitterEmail ?? ''),
    submitterRole: role as 'productor' | 'asesor' | 'comprador' | 'otro' | undefined,
    submitterProvincia,
    rating: Number(b.rating),
    body: String(b.body ?? ''),
    ip,
  })

  if (!result.ok) {
    const statusCode = result.code === 'validation' || result.code === 'not_found' ? 400 : 500
    void logEvent({
      eventType: 'api_call',
      status: 'error',
      route: '/api/reviews/submit',
      statusCode,
      latencyMs: Date.now() - t0,
      requestId,
      metadata: { error_code: result.code, slug: b.consignatariaSlug },
    })
    return NextResponse.json(
      { ok: false, error: result.code, message: result.message },
      { status: statusCode },
    )
  }

  void logEvent({
    eventType: 'api_call',
    status: 'ok',
    route: '/api/reviews/submit',
    statusCode: 200,
    latencyMs: Date.now() - t0,
    requestId,
    metadata: { slug: b.consignatariaSlug, updated: result.updated, reviewId: result.reviewId },
  })

  return NextResponse.json({
    ok: true,
    reviewId: result.reviewId,
    updated: result.updated,
    message: result.updated
      ? 'Tu reseña fue actualizada y queda pendiente de revisión.'
      : 'Tu reseña fue recibida y queda pendiente de revisión.',
  })
}
