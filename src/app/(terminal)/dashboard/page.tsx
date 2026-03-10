import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import rematesData from '@/lib/data/remates.json'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mi Panel — Consignatarias.com.ar',
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()

  // Get user's claims
  const { data: claims } = await service
    .from('consignataria_claims')
    .select('*, consignatarias(display_name, canonical_slug)')
    .eq('claimant_email', user.email!)
    .order('created_at', { ascending: false })

  // Get user's verified consignataria (if any)
  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug, verified, phone, email, website, description, whatsapp')
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
  if (consignataria) {
    const { count } = await service
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('entity_slug', consignataria.canonical_slug)
      .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    viewCount = count ?? 0
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

  return (
    <DashboardClient
      email={user.email!}
      consignataria={consignataria}
      claims={claims || []}
      scrapedAuctions={scrapedAuctions}
      ownerAuctions={ownerAuctions}
      auctionResults={auctionResults || []}
      viewCount={viewCount}
      completedFields={completedFields}
      subscription={subscription}
      frigorifico={frigorifico}
      frigoClaims={frigoClaims || []}
    />
  )
}
