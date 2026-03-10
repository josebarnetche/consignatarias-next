import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import rematesData from '@/lib/data/remates.json'

export const metadata = {
  title: 'Mi Panel — Consignatarias.com.ar',
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

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

  // Get upcoming auctions for this consignataria
  const today = new Date().toISOString().slice(0, 10)
  const auctions = consignataria
    ? (rematesData as { consignatariaSlug: string; date: string; title: string; location: string; time: string | null }[])
        .filter(r => r.consignatariaSlug === consignataria.canonical_slug && r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)
    : []

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
      auctions={auctions}
      auctionResults={auctionResults || []}
      viewCount={viewCount}
      completedFields={completedFields}
    />
  )
}
