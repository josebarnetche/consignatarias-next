import { Metadata } from 'next'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import ConsignatariasDirectoryClient from './ConsignatariasDirectoryClient'

export const metadata: Metadata = {
  title: 'Directorio de Consignatarias de Hacienda Argentina',
  description: 'Directorio completo de 73 consignatarias de hacienda en Argentina. Calendario de remates, provincias, contacto. Ordená por cantidad de remates o nombre.',
  keywords: [
    'consignatarias argentina',
    'consignatarias de hacienda',
    'directorio consignatarias',
    'remates ganaderos',
  ],
  openGraph: {
    title: 'Directorio de 73 Consignatarias | Consignatarias.com.ar',
    description: 'Todas las consignatarias de hacienda en un solo directorio. Remates, provincias, contacto.',
    url: 'https://www.consignatarias.com.ar/consignatarias',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/consignatarias',
  },
}

export default function ConsignatariasDirectoryPage() {
  const auctions = rematesData as Auction[]
  const profiles = getAllProfiles()
  const today = new Date().toISOString().slice(0, 10)

  const entries = profiles.map(p => {
    const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
    const upcoming = pAuctions.filter(a => a.date >= today).length
    const provinces = [...new Set(pAuctions.map(a => a.province))]
    const types = [...new Set(pAuctions.map(a => a.type))]
    return {
      slug: p.canonicalSlug,
      displayName: p.displayName,
      auctionCount: pAuctions.length,
      upcoming,
      provinces,
      types,
    }
  }).sort((a, b) => b.auctionCount - a.auctionCount)

  return <ConsignatariasDirectoryClient entries={entries} />
}
