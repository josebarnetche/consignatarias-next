import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { MapPin, Calendar, Building2 } from 'lucide-react'
import AuctionCard from '@/components/remates/auction-card'

const auctions = rematesData as Auction[]

// Normalize city name for URL (lowercase, no accents, spaces to hyphens)
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Get display name from slug
function getDisplayName(slug: string, cities: string[]): string | null {
  for (const city of cities) {
    if (normalizeCity(city) === slug) {
      return city
    }
  }
  return null
}

// Get all unique cities from auctions
function getAllCities(): string[] {
  const cities = auctions
    .map(a => a.location)
    .filter((loc): loc is string => !!loc)
  
  // Dedupe by normalized name, keeping the first (likely most common) format
  const seen = new Map<string, string>()
  for (const city of cities) {
    const normalized = normalizeCity(city)
    if (!seen.has(normalized)) {
      seen.set(normalized, city)
    }
  }
  
  return Array.from(seen.values())
}

// Get auctions for a city
function getAuctionsForCity(citySlug: string): Auction[] {
  return auctions.filter(a => {
    if (!a.location) return false
    return normalizeCity(a.location) === citySlug
  })
}

export async function generateStaticParams() {
  const cities = getAllCities()
  return cities.map(city => ({
    ciudad: normalizeCity(city)
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ ciudad: string }> }): Promise<Metadata> {
  const { ciudad } = await params
  const cities = getAllCities()
  const displayName = getDisplayName(ciudad, cities)
  
  if (!displayName) {
    return { title: 'Ciudad no encontrada' }
  }

  // Extract just the city name (before comma)
  const cityOnly = displayName.split(',')[0].trim()
  const cityAuctions = getAuctionsForCity(ciudad)
  const upcomingCount = cityAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length

  return {
    title: `Remates de Hacienda en ${cityOnly} — ${upcomingCount} Próximos | Consignatarias.com.ar`,
    description: `Calendario de remates de hacienda en ${displayName}. ${upcomingCount} remates próximos. Invernada, cría, reproductores y más.`,
    keywords: [`remates ${cityOnly.toLowerCase()}`, `remates hacienda ${cityOnly.toLowerCase()}`, `ganado ${cityOnly.toLowerCase()}`, 'remates ganaderos'],
    openGraph: {
      title: `Remates en ${cityOnly}`,
      description: `${upcomingCount} remates de hacienda próximos en ${displayName}`,
      url: `https://www.consignatarias.com.ar/remates/ciudad/${ciudad}`,
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/ciudad/${ciudad}`,
    },
  }
}

export default async function CityRematesPage({ params }: { params: Promise<{ ciudad: string }> }) {
  const { ciudad } = await params
  const cities = getAllCities()
  const displayName = getDisplayName(ciudad, cities)

  if (!displayName) {
    notFound()
  }

  const cityOnly = displayName.split(',')[0].trim()
  const province = displayName.split(',')[1]?.trim() || ''
  const cityAuctions = getAuctionsForCity(ciudad)
  
  const today = new Date().toISOString().slice(0, 10)
  const upcomingAuctions = cityAuctions
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const pastAuctions = cityAuctions
    .filter(a => a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  const consignatarias = [...new Set(cityAuctions.map(a => a.consignatariaName))]
  const types = [...new Set(cityAuctions.map(a => a.type).filter(Boolean))]

  const faqItems = [
    {
      question: `¿Cuántos remates hay en ${cityOnly}?`,
      answer: `Actualmente hay ${upcomingAuctions.length} remates próximos programados en ${displayName}. El total histórico es de ${cityAuctions.length} remates registrados.`
    },
    {
      question: `¿Qué tipos de remates se hacen en ${cityOnly}?`,
      answer: `En ${cityOnly} se realizan remates de: ${types.join(', ') || 'diversos tipos'}. Los más comunes son invernada y cría.`
    },
    {
      question: `¿Qué consignatarias operan en ${cityOnly}?`,
      answer: `${consignatarias.length} consignatarias realizan remates en ${cityOnly}: ${consignatarias.slice(0, 5).join(', ')}${consignatarias.length > 5 ? ' y más.' : '.'}`
    }
  ]

  return (
    <>
      <SectionBreadcrumbSchema 
        section={`remates/ciudad/${ciudad}`} 
        sectionName={`Remates en ${cityOnly}`} 
      />
      <FAQPageSchema items={faqItems} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span>/</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span>/</span>
          {province && (
            <>
              <Link href={`/remates/${normalizeCity(province)}`} className="hover:text-zinc-300">{province}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-zinc-300">{cityOnly}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2 flex items-center gap-3">
            <MapPin className="w-7 h-7 text-amber-500" />
            Remates en {cityOnly}
          </h1>
          <p className="text-zinc-400">
            {upcomingAuctions.length} remates próximos en {displayName}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 text-center">
            <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-100 text-lg font-bold">{upcomingAuctions.length}</p>
            <p className="text-zinc-500 text-xs">Próximos</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 text-center">
            <Building2 className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-100 text-lg font-bold">{consignatarias.length}</p>
            <p className="text-zinc-500 text-xs">Consignatarias</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 text-center">
            <MapPin className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-100 text-lg font-bold">{cityAuctions.length}</p>
            <p className="text-zinc-500 text-xs">Total histórico</p>
          </div>
        </div>

        {/* Upcoming Auctions */}
        {upcomingAuctions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Próximos remates en {cityOnly}
            </h2>
            <div className="space-y-3">
              {upcomingAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </section>
        )}

        {/* Past Auctions */}
        {pastAuctions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Remates anteriores
            </h2>
            <div className="space-y-3 opacity-60">
              {pastAuctions.map((auction) => (
                <AuctionCard key={`past-${auction.id}`} auction={auction} />
              ))}
            </div>
          </section>
        )}

        {/* No auctions state */}
        {cityAuctions.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No hay remates registrados en {displayName}</p>
            <Link href="/remates" className="text-amber-500 hover:text-amber-400 text-sm mt-2 inline-block">
              Ver todos los remates →
            </Link>
          </div>
        )}

        {/* FAQ */}
        <section className="border-t border-zinc-800 pt-8 mt-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Preguntas frecuentes sobre remates en {cityOnly}
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details key={i} className="group">
                <summary className="text-zinc-300 cursor-pointer hover:text-zinc-100 text-sm">
                  {item.question}
                </summary>
                <p className="text-zinc-500 text-sm mt-2 pl-4">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Related cities in same province */}
        {province && (
          <section className="border-t border-zinc-800 pt-8 mt-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Más remates en {province}
            </h2>
            
            {/* Province link */}
            <Link
              href={`/remates/${normalizeCity(province)}`}
              className="flex items-center justify-between w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors mb-4"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span className="text-amber-400 font-medium">Ver todos los remates en {province}</span>
              </div>
              <span className="text-amber-500">→</span>
            </Link>
            
            {/* Other cities in province */}
            <div className="flex flex-wrap gap-2">
              {cities
                .filter(c => c.includes(province) && normalizeCity(c) !== ciudad)
                .slice(0, 10)
                .map(c => {
                  const cSlug = normalizeCity(c)
                  const cName = c.split(',')[0].trim()
                  return (
                    <Link
                      key={cSlug}
                      href={`/remates/ciudad/${cSlug}`}
                      className="text-xs text-zinc-400 hover:text-amber-500 border border-zinc-800 rounded px-2 py-1"
                    >
                      {cName}
                    </Link>
                  )
                })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
