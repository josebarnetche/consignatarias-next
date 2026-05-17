import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import rematesData from '@/lib/data/remates.json'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mi Panel',
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  if (!service) redirect('/login') // Supabase unavailable

  // Get user's claims
  const { data: claims } = await service
    .from('consignataria_claims')
    .select('*, consignatarias(display_name, canonical_slug)')
    .eq('claimant_email', user.email!)
    .order('created_at', { ascending: false })

  // Get user's verified consignataria (if any)
  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug, verified, phone, email, website, description, whatsapp, cuit, logo_url')
    .eq('claimed_by_email', user.email!)
    .single()

  // Get user's verified frigorifico (if any)
  const { data: frigorifico } = await service
    .from('frigorifico_profiles')
    .select('cuit, display_name, verified, phone, email, website, description')
    .eq('claimed_by_email', user.email!)
    .single()

  // Get user's frigorifico claims
  const { data: frigoClaims } = await service
    .from('frigorifico_claims')
    .select('*')
    .eq('claimant_email', user.email!)
    .order('created_at', { ascending: false })

  // Get upcoming scraped auctions for this consignataria
  const today = new Date().toISOString().slice(0, 10)
  const scrapedAuctions = consignataria
    ? (rematesData as { consignatariaSlug: string; date: string; title: string; location: string; time: string | null }[])
        .filter(r => r.consignatariaSlug === consignataria.canonical_slug && r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)
    : []

  // Get owner-managed auctions from Supabase
  let ownerAuctions: {
    id: number
    title: string
    date: string
    time: string | null
    location: string | null
    province: string | null
    type: string
    main_category: string
    estimated_heads: number | null
    description: string | null
    catalog_url: string | null
    youtube_url: string | null
    status: string
  }[] = []
  if (consignataria) {
    const { data } = await service
      .from('consignataria_auctions')
      .select('*')
      .eq('consignataria_slug', consignataria.canonical_slug)
      .order('date', { ascending: true })

    ownerAuctions = data || []
  }

  // Get submitted auction results
  const { data: auctionResults } = await service
    .from('auction_results')
    .select('id, auction_date, auction_title, total_heads_sold, average_price')
    .eq('submitted_by', user.id)
    .order('auction_date', { ascending: false })
    .limit(20)

  // Get profile views count (last 30 days)
  let viewCount = 0
  let whatsappClicks = 0
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  
  if (consignataria) {
    const { count } = await service
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('entity_slug', consignataria.canonical_slug)
      .gte('viewed_at', thirtyDaysAgo)

    viewCount = count ?? 0

    // Get WhatsApp clicks (last 30 days)
    try {
      const { count: waCount } = await service
        .from('whatsapp_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)
        .gte('clicked_at', thirtyDaysAgo)

      whatsappClicks = waCount ?? 0
    } catch {
      // Table may not exist yet
      whatsappClicks = 0
    }
  }

  // Get leads count (last 30 days)
  let leadsCount = 0
  if (consignataria) {
    try {
      const { count: leadCount } = await service
        .from('consignataria_leads')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)
        .gte('created_at', thirtyDaysAgo)

      leadsCount = leadCount ?? 0
    } catch {
      // Table may not exist yet
      leadsCount = 0
    }
  }

  // Get total remate watchers (demand signal)
  let totalWatchers = 0
  if (consignataria) {
    try {
      const { count: watcherCount } = await service
        .from('remate_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)

      totalWatchers = watcherCount ?? 0
    } catch {
      // Table may not exist yet
      totalWatchers = 0
    }
  }

  // Calculate percentile vs other consignatarias (for PRO dashboard)
  let viewPercentile = 0
  if (consignataria && viewCount > 0) {
    // Get view counts for all claimed consignatarias in last 30 days
    const { data: allViews } = await service
      .from('profile_views')
      .select('entity_slug')
      .eq('entity_type', 'consignataria')
      .gte('viewed_at', thirtyDaysAgo)
    
    if (allViews && allViews.length > 0) {
      // Count views per slug
      const viewsBySlug: Record<string, number> = {}
      for (const v of allViews) {
        viewsBySlug[v.entity_slug] = (viewsBySlug[v.entity_slug] || 0) + 1
      }
      
      // Calculate percentile
      const allCounts = Object.values(viewsBySlug).sort((a, b) => a - b)
      const myCount = viewCount
      const belowMe = allCounts.filter(c => c < myCount).length
      viewPercentile = Math.round((belowMe / allCounts.length) * 100)
    }
  }

  // Calculate provincial ranking (by number of remates)
  let provincialRank = { position: 0, total: 0, province: '' }
  if (consignataria) {
    // Get all auctions grouped by consignataria
    const allAuctions = rematesData as { consignatariaSlug: string; province: string }[]
    
    // Find this consignataria's province from their auctions
    const myAuctions = allAuctions.filter(a => 
      a.consignatariaSlug === consignataria.canonical_slug ||
      a.consignatariaSlug?.toLowerCase().includes(consignataria.canonical_slug.toLowerCase())
    )
    const myProvince = myAuctions[0]?.province || ''
    
    if (myProvince) {
      // Count remates per consignataria in this province
      const provinceAuctions = allAuctions.filter(a => a.province === myProvince)
      const remateCounts: Record<string, number> = {}
      
      for (const a of provinceAuctions) {
        if (a.consignatariaSlug) {
          remateCounts[a.consignatariaSlug] = (remateCounts[a.consignatariaSlug] || 0) + 1
        }
      }
      
      // Sort by count descending
      const sorted = Object.entries(remateCounts)
        .sort(([, a], [, b]) => b - a)
      
      const myPosition = sorted.findIndex(([slug]) => 
        slug === consignataria.canonical_slug ||
        slug.toLowerCase().includes(consignataria.canonical_slug.toLowerCase())
      )
      
      provincialRank = {
        position: myPosition >= 0 ? myPosition + 1 : 0,
        total: sorted.length,
        province: myProvince,
      }
    }
  }

  // Fetch subscription data
  let subscription = null
  if (consignataria) {
    const { data: sub } = await service
      .from('subscriptions')
      .select('plan_name, status, current_period_end, rebill_subscription_id')
      .eq('entity_type', 'consignataria')
      .eq('entity_slug', consignataria.canonical_slug)
      .in('status', ['active', 'past_due'])
      .single()

    subscription = sub
  }

  // Compute completed fields for onboarding checklist
  const completedFields = consignataria
    ? {
        phone: !!consignataria.phone,
        email: !!consignataria.email,
        website: !!consignataria.website,
        description: !!consignataria.description,
        whatsapp: !!consignataria.whatsapp,
      }
    : null

  // Get DTE count for this user
  let dteCount = 0
  const { count: userDteCount } = await service
    .from('user_dtes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  dteCount = userDteCount ?? 0

  // Check if user has already redeemed points for PRO
  let alreadyRedeemed = false
  try {
    const { data: pointRedemption } = await service
      .from('point_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    alreadyRedeemed = !!pointRedemption
  } catch {
    // Table may not exist yet - default to false
    alreadyRedeemed = false
  }

  return (
    <DashboardClient
      email={user.email!}
      consignataria={consignataria}
      claims={claims || []}
      scrapedAuctions={scrapedAuctions}
      ownerAuctions={ownerAuctions}
      auctionResults={auctionResults || []}
      viewCount={viewCount}
      whatsappClicks={whatsappClicks}
      leadsCount={leadsCount}
      totalWatchers={totalWatchers}
      viewPercentile={viewPercentile}
      provincialRank={provincialRank}
      completedFields={completedFields}
      subscription={subscription}
      frigorifico={frigorifico}
      frigoClaims={frigoClaims || []}
      dteCount={dteCount}
      alreadyRedeemed={alreadyRedeemed}
    />
  )
}
