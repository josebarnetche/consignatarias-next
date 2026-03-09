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
    .select('display_name, canonical_slug, verified')
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

  return (
    <DashboardClient
      email={user.email!}
      consignataria={consignataria}
      claims={claims || []}
      auctions={auctions}
    />
  )
}
