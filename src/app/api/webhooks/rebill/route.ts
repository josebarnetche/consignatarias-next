import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { event, data } = payload

    const service = createServiceClient()

    switch (event) {
      case 'subscription.created':
      case 'payment.success': {
        const { subscription_id, customer_id, plan_id, metadata } = data
        const entitySlug = metadata?.entitySlug
        const entityType = metadata?.entityType

        if (!entitySlug || !entityType) break

        // Determine plan name from plan_id
        const planName =
          plan_id === process.env.REBILL_PRO_PLAN_ID
            ? 'pro'
            : plan_id === process.env.REBILL_FRIGO_PLAN_ID
              ? 'frigo_pro'
              : 'pro'

        // Calculate period end (30 days from now)
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        await service
          .from('subscriptions')
          .upsert(
            {
              entity_type: entityType,
              entity_slug: entitySlug,
              plan_name: planName,
              rebill_subscription_id: subscription_id,
              rebill_customer_id: customer_id,
              status: 'active',
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'entity_type,entity_slug' }
          )

        // Mark consignataria as featured when subscription is active
        if (entityType === 'consignataria') {
          await service
            .from('consignatarias')
            .update({ featured: true })
            .eq('canonical_slug', entitySlug)
        }

        break
      }

      case 'payment.failure': {
        const { subscription_id } = data

        if (!subscription_id) break

        await service
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('rebill_subscription_id', subscription_id)

        break
      }

      case 'subscription.cancelled': {
        const { subscription_id } = data

        if (!subscription_id) break

        // Get entity info before updating
        const { data: sub } = await service
          .from('subscriptions')
          .select('entity_type, entity_slug')
          .eq('rebill_subscription_id', subscription_id)
          .single()

        await service
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('rebill_subscription_id', subscription_id)

        // Remove featured flag on cancellation
        if (sub?.entity_type === 'consignataria') {
          await service
            .from('consignatarias')
            .update({ featured: false })
            .eq('slug', sub.entity_slug)
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
