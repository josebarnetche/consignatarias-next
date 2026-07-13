import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
  // Fila de dedup insertada para este evento. Si el otorgamiento posterior falla,
  // la borramos en el catch para que el reintento de Rebill NO la vea como
  // "duplicate" y pueda re-procesar (si no, un cliente que pagó queda sin acceso).
  let dedupEventId: string | null = null
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature — FAIL CLOSED. The secret must be configured and
    // every payload must carry a valid signature. Previously this was gated on
    // `webhookSecret &&`, so an unset secret (new env / preview deploy / rotation)
    // silently disabled verification and let anyone forge subscription/payment
    // events and self-grant paid tiers via the service-role writes below.
    const signature = request.headers.get('x-rebill-signature')
      || request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.REBILL_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('REBILL_WEBHOOK_SECRET is not configured — rejecting webhook')
      return NextResponse.json({ error: 'not_configured' }, { status: 503 })
    }
    if (!verifySignature(rawBody, signature, webhookSecret)) {
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
    // Dedup insertado OK: a partir de acá, si algo falla hay que revertirlo (catch).
    dedupEventId = eventId

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

        // Conversión (la plata): registrar subscription_paid en el ledger de
        // value_events — SOLO en el PRIMER cobro de cada suscripción. Rebill
        // dispara payment.success también en las renovaciones mensuales; sin este
        // dedup, cada mes sumaba 100 al value-index por el mismo cliente
        // (conversiones infladas en renovaciones). Best-effort: nunca frena el
        // otorgamiento de entitlement.
        {
          const entitySlug: string | null =
            metadata?.entitySlug ?? metadata?.userId ?? null
          const entityType: string =
            metadata?.entityType ?? (kind && String(kind).startsWith('enterprise') ? 'global' : 'consignataria')
          // ¿Ya registramos la conversión de ESTA suscripción? (renovación → skip)
          let alreadyCounted = false
          if (subscription_id) {
            const { count } = await service
              .from('value_events')
              .select('id', { count: 'exact', head: true })
              .eq('event', 'subscription_paid')
              .filter('meta->>subscription_id', 'eq', String(subscription_id))
            alreadyCounted = (count ?? 0) > 0
          }
          if (!alreadyCounted) {
            const { error } = await service
              .from('value_events')
              .insert({
                event: 'subscription_paid',
                weight: 100,
                entity_type: entityType,
                entity_slug: entitySlug ? String(entitySlug).slice(0, 200) : null,
                source: 'direct',
                path: null,
                meta: { kind: kind ?? null, subscription_id: subscription_id ?? null, plan_id: plan_id ?? null },
              })
            if (error) console.error('value_event subscription_paid insert error:', error.message)
          }
        }

        // Branch 1b — Enterprise API subscription (Starter for now)
        if (kind === 'enterprise_starter_subscription' || kind === 'enterprise_subscription') {
          const userId = metadata?.userId
          const customerEmail = metadata?.customerEmail
          const claimedTier = metadata?.api_tier as 'starter' | 'growth' | 'scale' | undefined
          const planDerivedTier = plan_id ? PLAN_ID_TO_API_TIER[plan_id] : undefined
          // Preferimos plan_id si el env REBILL_*_PLAN_ID está configurado (planes
          // estables). PERO los payment-links se crean POR-CHECKOUT para llevar el
          // userId en metadata → el price/plan_id es dinámico (cada link genera un
          // `plp_` nuevo) y no se puede pre-configurar. Por eso el fallback es
          // metadata.api_tier, que es SEGURO:
          //  - el payment-link se crea 100% server-side con REBILL_SECRET_KEY (el
          //    cliente NO puede crear un link ni forjar su metadata);
          //  - el webhook verifica la firma (REBILL_WEBHOOK_SECRET);
          //  - el checkout self-serve sólo emite Starter (createEnterpriseStarterLink
          //    hardcodea el tier); Growth/Scale son links que creamos a mano en la
          //    venta. metadata.api_tier siempre lo pone nuestro server.
          if (planDerivedTier && claimedTier && planDerivedTier !== claimedTier) {
            console.warn(
              `Rebill webhook: metadata.api_tier (${claimedTier}) != plan_id-derived (${planDerivedTier}) para plan ${plan_id}. Uso plan_id.`,
            )
          }
          const VALID_TIERS: ReadonlyArray<'starter' | 'growth' | 'scale'> = ['starter', 'growth', 'scale']
          const apiTier: 'starter' | 'growth' | 'scale' | undefined =
            planDerivedTier ?? (claimedTier && VALID_TIERS.includes(claimedTier) ? claimedTier : undefined)
          if (!apiTier) {
            console.error(
              `Rebill webhook: sin plan_id mapeable (${plan_id}) ni metadata.api_tier válido (${claimedTier}). No se otorga acceso.`,
            )
            break
          }
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

          // El perfil es estático (revalidate=false) → sin esto, el PRO recién se vería
          // en el próximo deploy. Revalidamos on-demand para que el hero PRO (logo
          // destacado + video del último remate) aparezca al instante de suscribirse.
          try {
            const cslug = getCanonicalSlug(entitySlug) || entitySlug
            revalidatePath(`/consignatarias/${cslug}`)
            // La landing /go (QR/flyers) también es estática → sin esto el QR seguiría
            // mostrando FREE tras pagar. Se revalida junto con el perfil.
            revalidatePath(`/go/${cslug}`)
          } catch (err) {
            console.error('revalidatePath consignataria PRO (activación) failed:', err)
          }

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

        if (entityType === 'frigorifico') {
          // El plan PRO ya está otorgado por el upsert de subscriptions (getFrigorifico
          // PlanStatus lo lee), así que la vitrina de carne se habilita aunque no exista
          // fila de perfil. Si el frigorífico reclamó, prendemos también featured.
          await service
            .from('frigorifico_profiles')
            .update({ featured: true })
            .eq('cuit', entitySlug)
          // El perfil es estático → revalidar para que la vitrina + RFQ aparezcan ya.
          try {
            revalidatePath(`/frigorificos/${entitySlug}`)
          } catch (err) {
            console.error('revalidatePath frigorifico PRO (activación) failed:', err)
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
          // Gracia hasta fin de mes: marcamos status='cancelled' pero NO tocamos
          // current_period_end. El helper period-aware (getConsignatariaPlanStatus /
          // getFeaturedSlugs) honra una sub cancelada mientras el período pagado siga
          // vigente, y recién ahí cae a FREE. Rebill cancela inmediato y no manda evento
          // al vencer, así que el flip lo hace el rebuild diario del scraper (~24h).
          await service
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('rebill_subscription_id', subscription_id)

          if (entSub.entity_type === 'consignataria') {
            // featured=false a propósito: la permanencia PRO durante la gracia la gobierna
            // current_period_end de la sub, no el flag manual (que sería PRO para siempre).
            await service
              .from('consignatarias')
              .update({ featured: false })
              .eq('canonical_slug', entSub.entity_slug)
            // Revalidar perfil + landing /go para que dejen de mostrar el hero PRO al instante.
            try {
              const cslug = getCanonicalSlug(entSub.entity_slug) || entSub.entity_slug
              revalidatePath(`/consignatarias/${cslug}`)
              revalidatePath(`/go/${cslug}`)
            } catch (err) {
              console.error('revalidatePath consignataria (cancelación) failed:', err)
            }
          }

          if (entSub.entity_type === 'frigorifico') {
            // Misma gracia que consignataria: featured=false, pero el helper honra la
            // sub cancelada hasta current_period_end (la vitrina sigue hasta fin de mes).
            await service
              .from('frigorifico_profiles')
              .update({ featured: false })
              .eq('cuit', entSub.entity_slug)
            try {
              revalidatePath(`/frigorificos/${entSub.entity_slug}`)
            } catch (err) {
              console.error('revalidatePath frigorifico (cancelación) failed:', err)
            }
          }
        } else {
          // Try matching as PRO Usuario subscription first
          const { data: proRows } = await service
            .from('user_subscriptions')
            .update({
              // Keep tier='pro' on cancel — access is honored until current_period_end
              // (getCurrentSession gates on the period). Setting tier='free' here dropped
              // access the instant the user cancelled, even though they paid the month.
              status: 'cancelled',
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
    // Revertir el dedup: si ya lo habíamos marcado como procesado pero el
    // otorgamiento falló, borrar la fila para que el retry re-procese (si no,
    // el evento queda "procesado" sin haber otorgado el acceso al que pagó).
    if (dedupEventId) {
      try {
        await requireServiceClient()
          .from('processed_webhook_events')
          .delete()
          .eq('event_id', dedupEventId)
          .eq('source', 'rebill')
      } catch (rollbackErr) {
        console.error('Webhook dedup rollback failed:', rollbackErr)
      }
    }
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'internal_error', message },
      { status: 500 },
    )
  }
}
