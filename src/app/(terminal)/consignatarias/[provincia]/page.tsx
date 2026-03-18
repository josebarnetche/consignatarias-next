import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'

/* ------------------------------------------------------------------ */
/*  PROVINCE SLUG MAP                                                   */
/* ------------------------------------------------------------------ */

const PROVINCE_MAP: Record<string, string> = {
  'buenos-aires': 'BUENOS AIRES',
  'chaco': 'CHACO',
  'cordoba': 'CORDOBA',
  'corrientes': 'CORRIENTES',
  'entre-rios': 'ENTRE RIOS',
  'formosa': 'FORMOSA',
  'la-pampa': 'LA PAMPA',
  'misiones': 'MISIONES',
  'neuquen': 'NEUQUEN',
  'san-luis': 'SAN LUIS',
  'santa-fe': 'SANTA FE',
  'santiago-del-estero': 'SANTIAGO DEL ESTERO',
  'tucuman': 'TUCUMAN',
}

const PROVINCE_DISPLAY: Record<string, string> = {
  'buenos-aires': 'Buenos Aires',
  'chaco': 'Chaco',
  'cordoba': 'Córdoba',
  'corrientes': 'Corrientes',
  'entre-rios': 'Entre Ríos',
  'formosa': 'Formosa',
  'la-pampa': 'La Pampa',
  'misiones': 'Misiones',
  'neuquen': 'Neuquén',
  'san-luis': 'San Luis',
  'santa-fe': 'Santa Fe',
  'santiago-del-estero': 'Santiago del Estero',
  'tucuman': 'Tucumán',
}

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                       */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  const auctions = rematesData as Auction[]
  const provincesWithAuctions = new Set(auctions.map(a => a.province))
  
  return Object.entries(PROVINCE_MAP)
    .filter(([, name]) => provincesWithAuctions.has(name))
    .map(([slug]) => ({ provincia: slug }))
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                            */
/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ provincia: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provincia } = await params
  const provinceName = PROVINCE_MAP[provincia]
  const provinceDisplay = PROVINCE_DISPLAY[provincia]
  
  if (!provinceName) {
    return { title: 'Provincia no encontrada' }
  }

  const auctions = rematesData as Auction[]
  const profiles = getAllProfiles()
  
  // Get consignatarias operating in this province
  const consignatariasInProvince = profiles.filter(p => {
    const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
    return pAuctions.some(a => a.province === provinceName)
  })
  
  const count = consignatariasInProvince.length

  return {
    title: `Consignatarias en ${provinceDisplay} | ${count} Consignatarias de Hacienda`,
    description: `Directorio de ${count} consignatarias de hacienda operando en ${provinceDisplay}. Calendario de remates ganaderos, perfiles completos y próximos remates en la provincia.`,
    keywords: [
      `consignatarias ${provinceDisplay.toLowerCase()}`,
      `consignatarias de hacienda ${provinceDisplay.toLowerCase()}`,
      `remates ganaderos ${provinceDisplay.toLowerCase()}`,
      `consignatarios ${provinceDisplay.toLowerCase()}`,
      `ferias ganaderas ${provinceDisplay.toLowerCase()}`,
      `subastas ganaderas ${provinceDisplay.toLowerCase()}`,
    ],
    openGraph: {
      title: `Consignatarias en ${provinceDisplay} | ${count} en Directorio`,
      description: `Directorio de ${count} consignatarias de hacienda con actividad en ${provinceDisplay}. Calendario de remates y perfiles completos.`,
      url: `https://www.consignatarias.com.ar/consignatarias/${provincia}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${provincia}`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  ITEM LIST SCHEMA                                                    */
/* ------------------------------------------------------------------ */

function ProvinceConsignatariasSchema({ 
  entries, 
  provinceDisplay 
}: { 
  entries: Array<{ slug: string; displayName: string; auctionCount: number }>
  provinceDisplay: string 
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Consignatarias de Hacienda en ${provinceDisplay}`,
    description: `Directorio de ${entries.length} consignatarias operando en ${provinceDisplay}`,
    numberOfItems: entries.length,
    itemListElement: entries.slice(0, 10).map((c, index) => ({
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

/* ------------------------------------------------------------------ */
/*  PAGE COMPONENT                                                      */
/* ------------------------------------------------------------------ */

export default async function ConsignatariasByProvincePage({ params }: PageProps) {
  const { provincia } = await params
  const provinceName = PROVINCE_MAP[provincia]
  const provinceDisplay = PROVINCE_DISPLAY[provincia]
  
  if (!provinceName) {
    notFound()
  }

  const auctions = rematesData as Auction[]
  const profiles = getAllProfiles()
  const today = new Date().toISOString().slice(0, 10)

  // Get consignatarias operating in this province with stats
  const entries = profiles
    .map(p => {
      const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
      const provinceAuctions = pAuctions.filter(a => a.province === provinceName)
      const upcoming = provinceAuctions.filter(a => a.date >= today).length
      const types = [...new Set(provinceAuctions.map(a => a.type))]
      return {
        slug: p.canonicalSlug,
        displayName: p.displayName,
        auctionCount: provinceAuctions.length,
        upcoming,
        types,
      }
    })
    .filter(e => e.auctionCount > 0)
    .sort((a, b) => b.auctionCount - a.auctionCount)

  const totalRemates = entries.reduce((sum, e) => sum + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((sum, e) => sum + e.upcoming, 0)

  // Get other provinces for navigation
  const otherProvinces = Object.entries(PROVINCE_DISPLAY)
    .filter(([slug]) => slug !== provincia)
    .sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Consignatarias', url: 'https://www.consignatarias.com.ar/consignatarias' },
          { name: provinceDisplay, url: `https://www.consignatarias.com.ar/consignatarias/${provincia}` },
        ]}
      />
      <ProvinceConsignatariasSchema entries={entries} provinceDisplay={provinceDisplay} />

      <section className="px-4 pt-4 pb-2 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/consignatarias" className="hover:text-zinc-300">Consignatarias</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{provinceDisplay}</span>
        </nav>

        {/* Header */}
        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Consignatarias de Hacienda en {provinceDisplay}
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
          Directorio de <strong className="text-zinc-200">{entries.length} consignatarias</strong> con 
          actividad en {provinceDisplay}. En total hay <strong className="text-zinc-200">{totalRemates} remates</strong> programados 
          en la provincia{totalUpcoming > 0 && <>, de los cuales <strong className="text-zinc-200">{totalUpcoming}</strong> son próximos</>}.
        </p>
        <p className="text-zinc-500 text-xs mb-6">
          Cada consignataria opera en múltiples localidades. Hacé clic en cualquiera para ver su 
          calendario completo de remates, provincias de operación y más información.
        </p>
      </section>

      {/* Consignatarias List */}
      <section className="px-4 pb-4 max-w-4xl">
        <div className="grid gap-3">
          {entries.map((c) => (
            <Link
              key={c.slug}
              href={`/consignatarias/${c.slug}`}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
            >
              <div>
                <div className="text-zinc-100 font-medium">{c.displayName}</div>
                <div className="text-zinc-500 text-sm">
                  {c.auctionCount} remates en {provinceDisplay}
                  {c.upcoming > 0 && <span className="text-emerald-400"> · {c.upcoming} próximos</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                {c.types.slice(0, 3).map(type => (
                  <span
                    key={type}
                    className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400 capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Other Provinces */}
      <section className="px-4 pb-8 max-w-4xl">
        <h2 className="text-zinc-400 text-sm font-medium mb-3">Otras provincias</h2>
        <div className="flex flex-wrap gap-2">
          {otherProvinces.map(([slug, name]) => (
            <Link
              key={slug}
              href={`/consignatarias/${slug}`}
              className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            >
              {name}
            </Link>
          ))}
        </div>
      </section>

      {/* Link to remates in province */}
      <section className="px-4 pb-8 max-w-4xl">
        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
          <h3 className="text-zinc-200 font-medium mb-2">Ver remates en {provinceDisplay}</h3>
          <p className="text-zinc-500 text-sm mb-3">
            También podés ver el calendario completo de remates programados en esta provincia.
          </p>
          <Link
            href={`/remates/${provincia}`}
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            Ver remates en {provinceDisplay} →
          </Link>
        </div>
      </section>
    </>
  )
}
