import { Metadata } from 'next'
import CompararClient from './CompararClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Comparar Consignatarias | Consignatarias.com.ar',
  description: 'Compará consignatarias de hacienda lado a lado. Remates programados, provincias de operación, tipos de remate y más.',
  openGraph: {
    title: 'Comparar Consignatarias | Consignatarias.com.ar',
    description: 'Herramienta de comparación de consignatarias ganaderas.',
    url: 'https://www.consignatarias.com.ar/comparar',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/comparar',
  },
}

export default function CompararPage() {
  const profiles = getAllProfiles()
  const auctions = rematesData as Auction[]
  const today = new Date().toISOString().slice(0, 10)

  // Build consignataria stats
  const consignatariaStats = profiles.map(profile => {
    const profileAuctions = auctions.filter(a => 
      a.consignatariaSlug === profile.canonicalSlug || 
      a.consignatariaName === profile.displayName
    )
    const upcoming = profileAuctions.filter(a => a.date >= today)
    const provincias = [...new Set(profileAuctions.map(a => a.province))]
    const tipos = [...new Set(profileAuctions.map(a => a.type))]
    const totalCabezas = profileAuctions.reduce((s, a) => s + (a.estimatedHeads || 0), 0)

    return {
      slug: profile.canonicalSlug,
      name: profile.displayName,
      totalRemates: profileAuctions.length,
      upcomingRemates: upcoming.length,
      provincias,
      tipos,
      totalCabezas,
      verified: false, // TODO: fetch from Supabase consignatarias table
    }
  }).filter(c => c.totalRemates > 0)
    .sort((a, b) => b.totalRemates - a.totalRemates)

  return (
    <>
      <SectionBreadcrumbSchema section="comparar" sectionName="Comparar" />
      <CompararClient consignatarias={consignatariaStats} />
    </>
  )
}
