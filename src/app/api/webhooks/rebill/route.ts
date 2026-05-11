import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

// Verify Rebill webhook signature (HMAC-SHA256)
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature
    const signature = request.headers.get('x-rebill-signature') 
      || request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.REBILL_WEBHOOK_SECRET
    
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      console.error('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const payload = JSON.parse(rawBody)
    const { event, data } = payload

    const service = requireServiceClient()

    switch (event) {
      case 'subscription.created':
      case 'payment.success': {
        const { subscription_id, customer_id, plan_id, metadata } = data
        const kind = metadata?.kind

        // Branch 1 — user PRO subscription (productor / contador / broker)
        if (kind === 'user_pro_subscription') {
          const userId = metadata?.userId
          const customerEmail = metadata?.customerEmail
          if (!userId) break

          const periodEnd = new Date()
          periodEnd.setDate(periodEnd.getDate() + 30)

          await service
            .from('user_subscriptions')
            .upsert(
              {
                user_id: userId,
                email: customerEmail || '',
                tier: 'pro',
                rebill_subscription_id: subscription_id,
                rebill_customer_id: customer_id,
                status: 'active',
                current_period_end: periodEnd.toISOString(),
                upgraded_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )

          break
        }

        // Branch 2 — entity subscription (consignataria / frigorifico) — legacy
        const entitySlug = metadata?.entitySlug
        const entityType = metadata?.entityType
        if (!entitySlug || !entityType) break

        const planName =
          plan_id === process.env.REBILL_PRO_PLAN_ID
            ? 'pro'
            : plan_id === process.env.REBILL_FRIGO_PLAN_ID
              ? 'frigo_pro'
              : 'pro'

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

        // Try entity table first
        const { data: entSub } = await service
          .from('subscriptions')
          .select('id')
          .eq('rebill_subscription_id', subscription_id)
          .maybeSingle()

        if (entSub) {
          await service
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('rebill_subscription_id', subscription_id)
        } else {
          await service
            .from('user_subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('rebill_subscription_id', subscription_id)
        }

        break
      }

      case 'subscription.cancelled': {
        const { subscription_id } = data
        if (!subscription_id) break

        // Try entity table first
        const { data: entSub } = await service
          .from('subscriptions')
          .select('entity_type, entity_slug')
          .eq('rebill_subscription_id', subscription_id)
          .maybeSingle()

        if (entSub) {
          await service
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('rebill_subscription_id', subscription_id)

          if (entSub.entity_type === 'consignataria') {
            await service
              .from('consignatarias')
              .update({ featured: false })
              .eq('canonical_slug', entSub.entity_slug)
          }
        } else {
          // User subscription cancelled — drop back to free
          await service
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              tier: 'free',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('rebill_subscription_id', subscription_id)
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
