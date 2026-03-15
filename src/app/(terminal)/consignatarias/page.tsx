import { Metadata } from 'next'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import ConsignatariasDirectoryClient from './ConsignatariasDirectoryClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

const profiles = getAllProfiles()
const totalConsignatarias = profiles.length

export const metadata: Metadata = {
  title: `Consignatarias de Hacienda Argentina 2026 | Directorio Completo (${totalConsignatarias})`,
  description: `Directorio de ${totalConsignatarias} consignatarias de hacienda en Argentina. Calendario de remates ganaderos, provincias de operación, tipos de remate. Datos actualizados 2026.`,
  keywords: [
    'consignatarias argentina',
    'consignatarias de hacienda',
    'consignatarias de hacienda argentina',
    'directorio consignatarias',
    'remates ganaderos argentina',
    'calendario remates ganaderos',
    'subastas ganaderas',
    'consignatario de hacienda',
    'remates de hacienda',
    'ferias ganaderas argentina',
  ],
  openGraph: {
    title: `Consignatarias de Hacienda Argentina | ${totalConsignatarias} en Directorio`,
    description: `Directorio completo de consignatarias de hacienda con calendario de remates ganaderos. ${totalConsignatarias} consignatarias activas en Argentina.`,
    url: 'https://www.consignatarias.com.ar/consignatarias',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/consignatarias',
  },
}

// Generate ItemList schema for consignatarias
function ConsignatariasItemListSchema({ entries }: { entries: Array<{ slug: string; displayName: string; auctionCount: number }> }) {
  const topItems = entries.slice(0, 10)
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Consignatarias de Hacienda Argentina',
    description: `Directorio de ${totalConsignatarias} consignatarias de hacienda con actividad en Argentina`,
    numberOfItems: totalConsignatarias,
    itemListElement: topItems.map((c, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        '@id': `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
        name: c.displayName,
        url: `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function ConsignatariasDirectoryPage() {
  const auctions = rematesData as Auction[]
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

  // Calculate stats for intro
  const totalRemates = entries.reduce((sum, e) => sum + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((sum, e) => sum + e.upcoming, 0)

  return (
    <>
      <SectionBreadcrumbSchema section="consignatarias" sectionName="Consignatarias" />
      <ConsignatariasItemListSchema entries={entries} />
      
      {/* SEO-optimized intro section */}
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-4xl">
        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Directorio de Consignatarias de Hacienda en Argentina
        </h1>
        <p className="mb-3">
          Listado completo de <strong className="text-zinc-200">{totalConsignatarias} consignatarias de hacienda</strong> con 
          actividad en Argentina. Actualmente hay <strong className="text-zinc-200">{totalRemates} remates programados</strong> en 
          el sistema, con <strong className="text-zinc-200">{totalUpcoming} próximos</strong> a realizarse.
        </p>
        <p className="text-zinc-500 text-xs">
          Cada consignataria tiene un perfil dedicado con calendario anual de remates, distribución por tipo 
          (general, especial, invernada, reproductores), provincias de operación y cronograma completo. 
          Datos actualizados diariamente desde fuentes públicas.
        </p>
      </section>
      
      <ConsignatariasDirectoryClient entries={entries} />
    </>
  )
}
