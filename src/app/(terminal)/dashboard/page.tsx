import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import ProductorDashboard from './ProductorDashboard'
import rematesData from '@/lib/data/remates.json'
import marketPrices from '@/lib/data/market-prices.json'

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

  // PRODUCTOR (la mayoría de los registros): sin perfil B2B reclamado ni claims
  // pendientes → panel de productor (hacienda + consignatarias seguidas + marcas),
  // no el flujo de reclamar consignataria/frigorífico.
  const isProductor = !consignataria && !frigorifico && !(claims?.length) && !(frigoClaims?.length)
  if (isProductor) {
    const hoy = new Date().toISOString().slice(0, 10)
    const [{ data: favs }, { data: ganado }, { count: marksCount }] = await Promise.all([
      service.from('user_favorites').select('consignataria_slug').eq('user_id', user.id),
      service.from('user_ganado').select('items').eq('user_id', user.id).maybeSingle(),
      service.from('remate_marks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const cats = marketPrices.categories as Record<string, { current: number }>
    const ganadoItems = Array.isArray(ganado?.items)
      ? (ganado!.items as { categoria: string; cabezas: number; peso: number }[])
      : []
    let herdValueArs: number | null = null
    let herdCabezas = 0
    if (ganadoItems.length > 0) {
      herdValueArs = 0
      for (const it of ganadoItems) {
        const precio = cats[it.categoria]?.current ?? marketPrices.inmag.current
        herdValueArs += (it.cabezas || 0) * (it.peso || 0) * precio
        herdCabezas += it.cabezas || 0
      }
    }

    const followedSlugs = new Set((favs ?? []).map((f) => f.consignataria_slug))
    const upcoming = (rematesData as { id: number; consignatariaSlug: string; consignatariaName: string; date: string; time: string | null; location: string; status: string }[])
      .filter((r) => r.date >= hoy && r.status === 'scheduled' && followedSlugs.has(r.consignatariaSlug))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        consignatariaName: r.consignatariaName,
        consignatariaSlug: r.consignatariaSlug,
        location: r.location,
      }))

    return (
      <ProductorDashboard
        email={user.email ?? ''}
        herdValueArs={herdValueArs}
        herdCabezas={herdCabezas}
        followedCount={followedSlugs.size}
        upcoming={upcoming}
        marksCount={marksCount ?? 0}
      />
    )
  }

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

    ownerAuctions = (data || []).map((a) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      location: a.location,
      province: a.province,
      type: a.type ?? 'general',
      main_category: a.main_category ?? 'mixto',
      estimated_heads: a.estimated_heads,
      description: a.description,
      catalog_url: a.catalog_url,
      youtube_url: a.youtube_url,
      status: a.status ?? 'scheduled',
    }))
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
  let leads: Array<{ id: number; name: string; phone: string | null; email: string | null; message: string | null; source: string | null; status: string | null; created_at: string }> = []
  if (consignataria) {
    try {
      const { count: leadCount } = await service
        .from('consignataria_leads')
        .select('*', { count: 'exact', head: true })
        .eq('consignataria_slug', consignataria.canonical_slug)
        .gte('created_at', thirtyDaysAgo)

      leadsCount = leadCount ?? 0

      // Bandeja de leads (últimos 50) — la captura ya existía, faltaba la gestión.
      const { data: leadRows } = await service
        .from('consignataria_leads')
        .select('id, name, phone, email, message, source, status, created_at')
        .eq('consignataria_slug', consignataria.canonical_slug)
        .order('created_at', { ascending: false })
        .limit(50)
      leads = leadRows ?? []
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
      leads={leads}
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
