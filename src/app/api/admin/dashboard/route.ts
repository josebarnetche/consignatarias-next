import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const service = requireServiceClient()

  // Run all queries in parallel
  const [
    claimsRes,
    frigoClaimsRes,
    consigRes,
    subsRes,
    viewsRes,
    views30dRes,
    views7dRes,
    viewsByEntityRes,
    recentClaimsRes,
    recentFrigoClaimsRes,
    usersRes,
  ] = await Promise.all([
    // Consignataria claims by status
    service.from('consignataria_claims').select('status', { count: 'exact', head: false }),
    // Frigorifico claims by status
    service.from('frigorifico_claims').select('status', { count: 'exact', head: false }),
    // Consignatarias stats
    service.from('consignatarias').select('canonical_slug, verified, claimed_at, featured'),
    // Subscriptions
    service.from('subscriptions').select('entity_type, entity_slug, plan_name, status, current_period_end, created_at'),
    // Total profile views
    service.from('profile_views').select('*', { count: 'exact', head: true }),
    // Views last 30 days
    service.from('profile_views').select('*', { count: 'exact', head: true })
      .gte('viewed_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    // Views last 7 days
    service.from('profile_views').select('*', { count: 'exact', head: true })
      .gte('viewed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    // Top viewed entities (last 30d)
    service.rpc('get_top_viewed_entities', { days_back: 30 }).limit(10),
    // Recent consignataria claims (last 5)
    service.from('consignataria_claims')
      .select('id, consignataria_slug, claimant_email, claimant_name, status, created_at, consignatarias(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    // Recent frigorifico claims (last 5)
    service.from('frigorifico_claims')
      .select('id, frigorifico_name, claimant_email, claimant_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    // Total users
    service.from('user_roles').select('role', { count: 'exact', head: false }),
  ])

  // Process claims data
  const claims = claimsRes.data || []
  const claimsByStatus = {
    pending: claims.filter((c: { status: string }) => c.status === 'pending').length,
    approved: claims.filter((c: { status: string }) => c.status === 'approved').length,
    rejected: claims.filter((c: { status: string }) => c.status === 'rejected').length,
    total: claims.length,
  }

  const frigoClaims = frigoClaimsRes.data || []
  const frigoClaimsByStatus = {
    pending: frigoClaims.filter((c: { status: string }) => c.status === 'pending').length,
    approved: frigoClaims.filter((c: { status: string }) => c.status === 'approved').length,
    rejected: frigoClaims.filter((c: { status: string }) => c.status === 'rejected').length,
    total: frigoClaims.length,
  }

  // Process consignatarias data
  const consignatarias = consigRes.data || []
  const totalConsignatarias = consignatarias.length
  const verifiedConsignatarias = consignatarias.filter((c: { verified: boolean }) => c.verified).length
  const adminFeatured = consignatarias.filter((c: { featured: boolean }) => c.featured).length

  // Process subscriptions
  const subscriptions = subsRes.data || []
  const activeSubs = subscriptions.filter((s: { status: string }) => s.status === 'active')
  const paidSubs = activeSubs.filter((s: { plan_name: string }) => !s.plan_name.toLowerCase().includes('bonificad'))

  // Bonified = subscriptions marked bonificad + admin-featured without any subscription
  const bonifiedSubSlugs = activeSubs
    .filter((s: { plan_name: string }) => s.plan_name.toLowerCase().includes('bonificad'))
    .map((s: { entity_slug: string }) => s.entity_slug)
  const activeSubSlugs = new Set(activeSubs.map((s: { entity_slug: string }) => s.entity_slug))
  const adminOnlyFeatured = consignatarias
    .filter((c: { featured: boolean; canonical_slug: string }) => c.featured && !activeSubSlugs.has(c.canonical_slug))
    .map((c: { canonical_slug: string }) => c.canonical_slug)
  const totalBonified = bonifiedSubSlugs.length + adminOnlyFeatured.length

  // Total PRO = paid subs + bonified subs + admin-featured without sub
  const totalProSlugs = new Set([
    ...activeSubs.map((s: { entity_slug: string }) => s.entity_slug),
    ...consignatarias.filter((c: { featured: boolean }) => c.featured).map((c: { canonical_slug: string }) => c.canonical_slug),
  ])

  // MRR calculation — PRO = 45000 ARS/mes, Frigo = 35000 ARS/mes
  const PRO_PRICE = 45000
  const FRIGO_PRICE = 35000
  const mrr = paidSubs.reduce((acc: number, s: { entity_type: string }) => {
    return acc + (s.entity_type === 'frigorifico' ? FRIGO_PRICE : PRO_PRICE)
  }, 0)

  // Process views
  const totalViews = viewsRes.count || 0
  const views30d = views30dRes.count || 0
  const views7d = views7dRes.count || 0

  // Top viewed (may fail if RPC doesn't exist yet — graceful fallback)
  const topViewed = viewsByEntityRes.data || []

  // Users
  const users = usersRes.data || []
  const admins = users.filter((u: { role: string }) => u.role === 'admin').length
  const owners = users.filter((u: { role: string }) => u.role === 'owner').length

  return NextResponse.json({
    // Revenue
    revenue: {
      mrr,
      mrrFormatted: `$${mrr.toLocaleString('es-AR')}`,
      paidSubscriptions: paidSubs.length,
      bonifiedSubscriptions: totalBonified,
      totalPro: totalProSlugs.size,
      allSubscriptions: subscriptions.length,
      proRate: totalConsignatarias > 0
        ? Math.round((totalProSlugs.size / totalConsignatarias) * 100)
        : 0,
    },
    // CRM / Claims
    claims: {
      consignatarias: claimsByStatus,
      frigorificos: frigoClaimsByStatus,
      recentConsignatarias: recentClaimsRes.data || [],
      recentFrigorificos: recentFrigoClaimsRes.data || [],
    },
    // Profiles
    profiles: {
      totalConsignatarias,
      verifiedConsignatarias,
      adminFeatured,
      verificationRate: totalConsignatarias > 0
        ? Math.round((verifiedConsignatarias / totalConsignatarias) * 100)
        : 0,
    },
    // Engagement
    engagement: {
      totalViews,
      views30d,
      views7d,
      topViewed,
    },
    // Users
    users: {
      total: users.length,
      admins,
      owners,
    },
    // Subscriptions detail
    subscriptions: subscriptions.map((s: Record<string, unknown>) => ({
      entityType: s.entity_type,
      entitySlug: s.entity_slug,
      planName: s.plan_name,
      status: s.status,
      periodEnd: s.current_period_end,
      createdAt: s.created_at,
    })),
  })
}
