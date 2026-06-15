import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendEnterpriseWelcome, sendConsignatariaProWelcome } from '@/lib/email'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
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

    // Idempotency: dedup events. Rebill may retry on transient failures,
    // and we never want to double-process. Prefer a stable id from the
    // payload; fall back to a tuple hash if none is present.
    const eventId: string =
      payload?.id
      || payload?.event_id
      || payload?.event?.id
      || data?.id
      || `${event}|${data?.subscription_id ?? ''}|${payload?.timestamp ?? ''}`

    const { error: dedupError } = await service
      .from('processed_webhook_events')
      .insert({
        event_id: eventId,
        source: 'rebill',
        event_type: event ?? 'unknown',
      })

    if (dedupError) {
      // 23505 = unique_violation → already processed; ack and stop.
      // Postgrest surfaces the code at top-level for insert conflicts.
      const code = (dedupError as { code?: string }).code
      if (code === '23505') {
        return NextResponse.json({ received: true, ignored: 'duplicate' })
      }
      // Any other dedup-table error: bubble up so Rebill retries.
      console.error('Webhook dedup insert error:', dedupError)
      return NextResponse.json(
        { error: 'internal_error', message: 'dedup_failed' },
        { status: 500 },
      )
    }

    // Server-side plan_id → api_tier map. Trust the plan_id reference
    // from Rebill, never the metadata.api_tier claim (attacker-controlled
    // if their account is compromised at signup).
    const PLAN_ID_TO_API_TIER: Record<string, 'starter' | 'growth' | 'scale'> = {}
    if (process.env.REBILL_STARTER_PLAN_ID)
      PLAN_ID_TO_API_TIER[process.env.REBILL_STARTER_PLAN_ID] = 'starter'
    if (process.env.REBILL_GROWTH_PLAN_ID)
      PLAN_ID_TO_API_TIER[process.env.REBILL_GROWTH_PLAN_ID] = 'growth'
    if (process.env.REBILL_SCALE_PLAN_ID)
      PLAN_ID_TO_API_TIER[process.env.REBILL_SCALE_PLAN_ID] = 'scale'

    switch (event) {
      case 'subscription.created':
      case 'payment.success': {
        const { subscription_id, customer_id, plan_id, metadata } = data
        const kind = metadata?.kind

        // Branch 1b — Enterprise API subscription (Starter for now)
        if (kind === 'enterprise_starter_subscription' || kind === 'enterprise_subscription') {
          const userId = metadata?.userId
          const customerEmail = metadata?.customerEmail
          const claimedTier = metadata?.api_tier as 'starter' | 'growth' | 'scale' | undefined
          const planDerivedTier = plan_id ? PLAN_ID_TO_API_TIER[plan_id] : undefined
          // plan_id is the source of truth; metadata is informational only.
          if (planDerivedTier && claimedTier && planDerivedTier !== claimedTier) {
            console.warn(
              `Rebill webhook: metadata.api_tier (${claimedTier}) disagrees with plan_id-derived tier (${planDerivedTier}) for plan ${plan_id}. Using plan_id.`,
            )
          }
          const apiTier: 'starter' | 'growth' | 'scale' =
            planDerivedTier ?? claimedTier ?? 'starter'
          if (!userId) break

          // Read existing email/tier so we don't overwrite PRO Usuario state
          const { data: existing } = await service
            .from('user_subscriptions')
            .select('email, tier')
            .eq('user_id', userId)
            .maybeSingle()

          await service
            .from('user_subscriptions')
            .upsert(
              {
                user_id: userId,
                email: existing?.email || customerEmail || '',
                tier: existing?.tier ?? 'free',
                api_tier: apiTier,
                rebill_enterprise_subscription_id: subscription_id,
                rebill_customer_id: customer_id,
                api_tier_activated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' },
            )

          // Welcome email (best-effort, non-blocking failure)
          if (customerEmail) {
            try {
              await sendEnterpriseWelcome({
                to: customerEmail,
                plan: apiTier as 'starter' | 'growth' | 'scale',
              })
            } catch (err) {
              console.error('Enterprise welcome email failed:', err)
            }
          }

          break
        }

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

          // Welcome email (best-effort, non-blocking). Tier=pro is already granted
          // by the subscriptions upsert above; this just confirms it to the firm.
          const welcomeTo = metadata?.customerEmail
          if (welcomeTo) {
            try {
              const profile = getProfile(getCanonicalSlug(entitySlug) || entitySlug)
              await sendConsignatariaProWelcome(
                welcomeTo,
                profile?.displayName || entitySlug,
                entitySlug,
              )
            } catch (err) {
              console.error('Consignataria welcome email failed:', err)
            }
          }
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
          // Try user PRO Usuario first, then Enterprise
          const updates = { status: 'past_due', updated_at: new Date().toISOString() }
          const { data: proRow } = await service
            .from('user_subscriptions')
            .update(updates)
            .eq('rebill_subscription_id', subscription_id)
            .select('user_id')
          if (!proRow || proRow.length === 0) {
            await service
              .from('user_subscriptions')
              .update(updates)
              .eq('rebill_enterprise_subscription_id', subscription_id)
          }
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
          // Try matching as PRO Usuario subscription first
          const { data: proRows } = await service
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              tier: 'free',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('rebill_subscription_id', subscription_id)
            .select('user_id')

          if (!proRows || proRows.length === 0) {
            // Enterprise subscription cancelled — drop api_tier to none,
            // keep tier untouched (user could still be PRO Usuario)
            await service
              .from('user_subscriptions')
              .update({
                api_tier: 'none',
                api_tier_cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('rebill_enterprise_subscription_id', subscription_id)
          }
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    // Return 500 so Rebill retries — silent 200s mask real failures and
    // we end up with partially-applied subscription state.
    console.error('Webhook error:', err)
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'internal_error', message },
      { status: 500 },
    )
  }
}
