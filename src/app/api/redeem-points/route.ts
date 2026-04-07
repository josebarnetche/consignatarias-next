import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { calculateProfilePoints, PRO_MONTH_THRESHOLD } from '@/lib/points'

/**
 * POST /api/redeem-points
 * 
 * Redeems 4,500 points for 1 month of PRO (early adopter bonus).
 * One redemption per user lifetime.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = createServiceClient()

    // Get user's consignataria
    const { data: consignataria } = await service
      .from('consignatarias')
      .select('canonical_slug, display_name, cuit, phone, email, whatsapp, website, description, logo_url')
      .eq('claimed_by_email', user.email!)
      .single()

    if (!consignataria) {
      return NextResponse.json(
        { error: 'No tenés un perfil de consignataria verificado' },
        { status: 400 }
      )
    }

    // Check if already redeemed
    const { data: existingRedemption } = await service
      .from('point_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingRedemption) {
      return NextResponse.json(
        { error: 'Ya canjeaste tu mes PRO gratis' },
        { status: 409 }
      )
    }

    // Get DTE count
    const { count: dteCount } = await service
      .from('user_dtes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get remate count
    const { count: remateCount } = await service
      .from('consignataria_auctions')
      .select('*', { count: 'exact', head: true })
      .eq('consignataria_slug', consignataria.canonical_slug)

    // Get results count
    const { count: resultsCount } = await service
      .from('auction_results')
      .select('*', { count: 'exact', head: true })
      .eq('submitted_by', user.id)

    // Calculate points
    const { total } = calculateProfilePoints({
      cuit: consignataria.cuit,
      phone: consignataria.phone,
      email: consignataria.email,
      whatsapp: consignataria.whatsapp,
      website: consignataria.website,
      description: consignataria.description,
      logo: consignataria.logo_url,
      dteCount: dteCount ?? 0,
      remateCount: remateCount ?? 0,
      hasResults: (resultsCount ?? 0) > 0,
    })

    if (total < PRO_MONTH_THRESHOLD) {
      return NextResponse.json(
        { 
          error: `Te faltan ${PRO_MONTH_THRESHOLD - total} puntos`,
          current: total,
          required: PRO_MONTH_THRESHOLD 
        },
        { status: 400 }
      )
    }

    // Calculate PRO expiration (1 month from now)
    const proExpiresAt = new Date()
    proExpiresAt.setMonth(proExpiresAt.getMonth() + 1)

    // Record the redemption
    const { error: redemptionError } = await service
      .from('point_redemptions')
      .insert({
        user_id: user.id,
        consignataria_slug: consignataria.canonical_slug,
        points_redeemed: PRO_MONTH_THRESHOLD,
        pro_expires_at: proExpiresAt.toISOString(),
      })

    if (redemptionError) {
      console.error('Redemption insert error:', redemptionError)
      return NextResponse.json(
        { error: 'Error al procesar el canje' },
        { status: 500 }
      )
    }

    // Create/update subscription record for PRO access
    const { error: subError } = await service
      .from('subscriptions')
      .upsert({
        entity_type: 'consignataria',
        entity_slug: consignataria.canonical_slug,
        plan_name: 'PRO (Puntos)',
        status: 'active',
        current_period_end: proExpiresAt.toISOString(),
        rebill_subscription_id: `points_${user.id}_${Date.now()}`,
      }, {
        onConflict: 'entity_type,entity_slug'
      })

    if (subError) {
      console.error('Subscription upsert error:', subError)
      // Don't fail - redemption is recorded, subscription can be fixed
    }

    // Log the transaction (non-blocking, ignore errors)
    service
      .from('point_transactions')
      .insert({
        user_id: user.id,
        consignataria_slug: consignataria.canonical_slug,
        action: 'REDEEM_PRO_MONTH',
        points: -PRO_MONTH_THRESHOLD,
      })
      .then(() => {}) // Fire and forget

    return NextResponse.json({
      success: true,
      message: '¡Felicitaciones! Tu mes PRO gratis está activo.',
      expiresAt: proExpiresAt.toISOString(),
      consignataria: consignataria.display_name,
    })

  } catch (error) {
    console.error('Redeem points error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
