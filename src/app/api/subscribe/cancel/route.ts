import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { cancelSubscription } from '@/lib/rebill'

export const dynamic = 'force-dynamic'

interface CancelBody {
  subscriptionId?: string
}

/**
 * POST /api/subscribe/cancel
 *
 * Cancela la suscripción PRO del usuario logueado.
 * Recibe { subscriptionId } y valida que pertenezca al user actual.
 * Llama a Rebill para cancelar y actualiza user_subscriptions.
 *
 * El access PRO se mantiene hasta current_period_end (el webhook ya bajó tier
 * a 'free' cuando llegue subscription.cancelled — esto es la disparada manual).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: CancelBody = await request.json().catch(() => ({}))
    const { subscriptionId } = body
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId requerido' }, { status: 400 })
    }

    // Verify the subscription belongs to this user
    const service = requireServiceClient()
    const { data: sub } = await service
      .from('user_subscriptions')
      .select('user_id, rebill_subscription_id, status')
      .eq('rebill_subscription_id', subscriptionId)
      .maybeSingle()

    if (!sub || sub.user_id !== user.id) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    if (sub.status === 'cancelled') {
      return NextResponse.json({ ok: true, already: true })
    }

    // Cancel in Rebill
    await cancelSubscription(subscriptionId)

    // Mark as cancelled in our DB immediately (acceso sigue hasta period_end vía webhook)
    await service
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('rebill_subscription_id', subscriptionId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[subscribe/cancel]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
