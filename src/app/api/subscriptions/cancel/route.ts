import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { cancelSubscription } from '@/lib/rebill'

export async function POST() {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const service = requireServiceClient()

  // Find the user's consignataria
  const { data: consignataria } = await service
    .from('consignatarias')
    .select('canonical_slug')
    .eq('claimed_by_email', auth.email!)
    .single()

  if (!consignataria) {
    return NextResponse.json({ error: 'No consignataria encontrada' }, { status: 404 })
  }

  // Find active subscription
  const { data: subscription } = await service
    .from('subscriptions')
    .select('rebill_subscription_id, status')
    .eq('entity_type', 'consignataria')
    .eq('entity_slug', consignataria.canonical_slug)
    .in('status', ['active', 'past_due'])
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'No hay suscripcion activa' }, { status: 404 })
  }

  // Cancel in Rebill
  try {
    await cancelSubscription(subscription.rebill_subscription_id)
  } catch (err) {
    console.error('Rebill cancel error:', err)
    // Continue to update local status even if Rebill fails
  }

  // Update local status
  await service
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('entity_type', 'consignataria')
    .eq('entity_slug', consignataria.canonical_slug)

  // Remove featured flag
  await service
    .from('consignatarias')
    .update({ featured: false })
    .eq('canonical_slug', consignataria.canonical_slug)

  return NextResponse.json({ ok: true })
}
