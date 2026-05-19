import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { approveReview } from '@/lib/dal/reviews'
import { logEvent } from '@/lib/ops'

type Props = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Props) {
  const t0 = Date.now()
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const ok = await approveReview(id, auth.email ?? 'admin')

  void logEvent({
    eventType: 'api_call',
    status: ok ? 'ok' : 'error',
    route: '/api/admin/reviews/[id]/approve',
    statusCode: ok ? 200 : 500,
    latencyMs: Date.now() - t0,
    userId: auth.userId ?? null,
    metadata: { reviewId: id },
  })

  if (!ok) return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
