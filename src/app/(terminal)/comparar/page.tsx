import { Metadata } from 'next'
import CompararClient from './CompararClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { createServiceClient } from '@/lib/supabase'

// ISR: regenerate hourly, cache between requests
export const revalidate = false // Cost optimization: static at build time

export const metadata: Metadata = {
  title: 'Comparar Consignatarias',
  description: 'Compará consignatarias de hacienda lado a lado. Remates programados, provincias de operación, tipos de remate y más.',
  openGraph: {
    title: 'Comparar Consignatarias',
    description: 'Herramienta de comparación de consignatarias ganaderas.',
    url: 'https://www.consignatarias.com.ar/comparar',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/comparar',
  },
}

export default async function CompararPage() {
  const profiles = getAllProfiles()
  const auctions = rematesData as Auction[]
  const today = new Date().toISOString().slice(0, 10)

  // Fetch verified status from Supabase (may be null during static generation)
  const supabase = createServiceClient()
  let verifiedMap = new Map<string, boolean>()
  
  if (supabase) {
    const { data: verifiedData } = await supabase
      .from('consignatarias')
      .select('canonical_slug, verified')
    
    verifiedMap = new Map(
      (verifiedData || []).map(c => [c.canonical_slug, c.verified === true])
    )
  }

  // Build consignataria stats
  const consignatariaStats = profiles.map(profile => {
    const profileAuctions = auctions.filter(a => 
      a.consignatariaSlug === profile.canonicalSlug || 
      a.consignatariaName === profile.displayName
    )
    const upcoming = profileAuctions
      .filter(a => a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    const next = upcoming[0] ?? null
    const provincias = [...new Set(profileAuctions.map(a => a.province))]
    const tipos = [...new Set(profileAuctions.map(a => a.type))]
    // Cadencia REALIZADA: remates ya ocurridos en los últimos 6 meses —
    // disjunto de "próximos" (el índice retiene ~6 meses hacia atrás).
    // NO usamos cabezas: es dato no verificado.
    const seisMesesAtras = new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10)
    const remates6m = profileAuctions.filter(a => a.date >= seisMesesAtras && a.date < today).length

    return {
      slug: profile.canonicalSlug,
      name: profile.displayName,
      totalRemates: profileAuctions.length,
      upcomingRemates: upcoming.length,
      remates6m,
      nextDate: next?.date ?? null,
      nextLocation: next?.location ?? null,
      provincias,
      tipos,
      verified: verifiedMap.get(profile.canonicalSlug) || false,
    }
  }).filter(c => c.totalRemates > 0)
    .sort((a, b) => b.totalRemates - a.totalRemates)

  return (
    <>
      <SectionBreadcrumbSchema section="comparar" sectionName="Comparar" />
      <WebApplicationSchema
        name="Comparar Consignatarias"
        description="Herramienta para comparar consignatarias de hacienda lado a lado: remates, provincias, tipos y más."
        url="https://www.consignatarias.com.ar/comparar"
        applicationCategory="UtilityApplication"
        features={[
          'Comparación lado a lado',
          'Hasta 3 consignatarias',
          'Total de remates',
          'Provincias de operación',
          'Tipos de remate',
        ]}
      />
      <CompararClient consignatarias={consignatariaStats} />
    </>
  )
}
