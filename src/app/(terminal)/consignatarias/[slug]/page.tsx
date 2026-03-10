import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import {
  getAllCanonicalSlugs,
  getCanonicalSlug,
  getProfile,
  getAuctionsForProfile,
} from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile } from '@/lib/dal/consignatarias'
import { getEntityTier } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase'
import { BreadcrumbSchema, LocalBusinessSchema, EventSchema } from '@/components/seo/JsonLd'
import ConsignatariaProfileClient from './ConsignatariaProfileClient'

const auctions = rematesData as Auction[]

/* ------------------------------------------------------------------ */
/*  AUCTION RESULTS from Supabase                                      */
/* ------------------------------------------------------------------ */

export interface AuctionResult {
  id: number
  auction_date: string
  auction_title: string
  total_heads_sold: number | null
  average_price: number | null
  max_price: number | null
  location: string | null
}

async function fetchAuctionResults(slug: string): Promise<AuctionResult[]> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('auction_results')
      .select('id, auction_date, auction_title, total_heads_sold, average_price, max_price, location')
      .eq('consignataria_slug', slug)
      .order('auction_date', { ascending: false })
      .limit(20)

    return (data as AuctionResult[]) || []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS  (~70 pages)                                         */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllCanonicalSlugs().map(slug => ({ slug }))
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const upcoming = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length
  const provinces = [...new Set(profileAuctions.map(a => a.province))]

  const title = `${profile.displayName} — Calendario de Remates`
  const description = `Calendario completo de remates ganaderos de ${profile.displayName}. ${profileAuctions.length} remates programados${upcoming > 0 ? `, ${upcoming} próximos` : ''}. ${provinces.join(', ')}.`

  return {
    title,
    description,
    openGraph: {
      title: `${profile.displayName} | Consignatarias.com.ar`,
      description,
      url: `https://www.consignatarias.com.ar/consignatarias/${canonical}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${canonical}`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function ConsignatariaProfilePage({ params }: Props) {
  const { slug } = await params

  // Unknown slug → 404
  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  // Non-canonical slug → 301 redirect
  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}`)
  }

  const enrichedProfile = await getConsignatariaProfile(canonical)
  if (!enrichedProfile) notFound()

  const [tier, auctionResults] = await Promise.all([
    getEntityTier('consignataria', canonical),
    fetchAuctionResults(canonical),
  ])

  const profileAuctions = getAuctionsForProfile(auctions, canonical)

  // Derive location info from auctions
  const provinces = [...new Set(profileAuctions.map(a => a.province).filter(Boolean))]
  const primaryProvince = enrichedProfile.province || provinces[0] || 'Argentina'
  const cities = [...new Set(profileAuctions.map(a => (a.location || '').split(',')[0].trim()).filter(Boolean))]
  const primaryCity = enrichedProfile.location || cities[0] || ''

  // Next upcoming auctions for structured data
  const today = new Date().toISOString().slice(0, 10)
  const upcomingAuctions = profileAuctions
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  return (
    <>
      {/* Structured Data */}
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Consignatarias', url: 'https://www.consignatarias.com.ar/consignatarias' },
          { name: enrichedProfile.displayName, url: `https://www.consignatarias.com.ar/consignatarias/${canonical}` },
        ]}
      />
      <LocalBusinessSchema
        name={enrichedProfile.displayName}
        description={enrichedProfile.description || `Consignataria de hacienda. ${profileAuctions.length} remates programados en ${provinces.join(', ')}.`}
        address={{
          addressLocality: primaryCity,
          addressRegion: primaryProvince,
        }}
        url={`https://www.consignatarias.com.ar/consignatarias/${canonical}`}
      />
      {upcomingAuctions.map(auction => (
        <EventSchema
          key={auction.id}
          name={auction.title}
          description={auction.description}
          startDate={auction.time ? `${auction.date}T${auction.time}:00-03:00` : auction.date}
          location={{
            name: (auction.location || '').split(',')[0].trim() || primaryCity,
            address: auction.location || primaryCity,
          }}
          organizer={enrichedProfile.displayName}
          url={`https://www.consignatarias.com.ar/consignatarias/${canonical}`}
        />
      ))}

      <ConsignatariaProfileClient
        profile={enrichedProfile}
        auctions={profileAuctions}
        tier={tier}
        auctionResults={auctionResults}
      />
    </>
  )
}
