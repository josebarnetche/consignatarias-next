import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { rejectReview } from '@/lib/dal/reviews'
import { logEvent } from '@/lib/ops'

type Props = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Props) {
  const t0 = Date.now()
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { id } = await params
  let body: { reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const reason = (body.reason ?? '').trim()
  if (reason.length < 5) {
    return NextResponse.json(
      { ok: false, error: 'reason_too_short', message: 'El motivo debe tener al menos 5 caracteres.' },
      { status: 400 },
    )
  }

  const ok = await rejectReview(id, auth.email ?? 'admin', reason)

  void logEvent({
    eventType: 'api_call',
    status: ok ? 'ok' : 'error',
    route: '/api/admin/reviews/[id]/reject',
    statusCode: ok ? 200 : 500,
    latencyMs: Date.now() - t0,
    userId: auth.userId ?? null,
    metadata: { reviewId: id, reason },
  })

  if (!ok) return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
