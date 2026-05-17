import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import {
  isProvinceSlug,
  provinceMetadata,
  ProvinceView,
} from '../_views/ProvinceView'

import { mergedSlugStaticParams } from '../_views/sluglist'
import rematesData from '@/lib/data/remates.json'
import marketData from '@/lib/data/market-prices.json'
import type { Auction } from '@/lib/db/schema'
import {
  getAllCanonicalSlugs,
  getCanonicalSlug,
  getProfile,
  getAuctionsForProfile,
} from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile, getRelatedConsignatarias } from '@/lib/dal/consignatarias'
import { getEntityTier } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase'
import { BreadcrumbSchema, LocalBusinessSchema, EventSchema, VideoObjectSchema } from '@/components/seo/JsonLd'
import youtubeChannelsData from '@/lib/data/youtube-channels.json'
import consignatariaResources from '@/lib/data/consignataria-resources.json'
import { getProfileSEO } from '@/lib/data/profile-seo'
import ConsignatariaProfileClient from './ConsignatariaProfileClient'
import { MediosPagoSection } from '@/components/consignataria/MediosPagoSection'
import type { YouTubeChannelData } from './ConsignatariaProfileClient'
import type { ConsignatariaVideo } from '@/components/video/VideoGallery'

/* ------------------------------------------------------------------ */
/*  MAG ENTRY DATA from market-prices.json                             */
/* ------------------------------------------------------------------ */

export interface MagEntryData {
  magId: string
  totalCabezas: number
  entries: Array<{
    remitente: string
    localidad: string
    provincia: string
    cabezas: number
  }>
  period: string
}

// Cost optimization: static at build time (no ISR, rebuild on deploy)
export const revalidate = false
// Allow dynamic rendering for slugs not in generateStaticParams output.
// Profile slugs are merged in but Next 15 has a quirk with sibling
// generateStaticParams overlap — falling back to dynamic for safety.
export const dynamicParams = true

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

// Promise.race timeout helper — supabase calls in this page were hanging
// production renders 30+s. 4s cap forces a fast static-only fallback when
// the network leg misbehaves.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function fetchAuctionResults(slug: string): Promise<AuctionResult[]> {
  try {
    const service = createServiceClient()
    if (!service) return []

    const query = service
      .from('auction_results')
      .select('id, auction_date, auction_title, total_heads_sold, average_price, max_price, location')
      .eq('consignataria_slug', slug)
      .order('auction_date', { ascending: false })
      .limit(20)

    const { data } = await withTimeout(query as unknown as Promise<{ data: AuctionResult[] | null }>, 4000, { data: null })
    return (data as AuctionResult[]) || []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  VIDEO GALLERY from Supabase                                        */
/* ------------------------------------------------------------------ */

async function fetchConsignatariaVideos(slug: string): Promise<ConsignatariaVideo[]> {
  try {
    const service = createServiceClient()
    if (!service) return []

    const consigQuery = service
      .from('consignatarias')
      .select('id')
      .eq('slug', slug)
      .single()
    const { data: consignataria } = await withTimeout(
      consigQuery as unknown as Promise<{ data: { id: number } | null }>,
      4000,
      { data: null },
    )
    if (!consignataria) return []

    const videosQuery = service
      .from('consignataria_videos')
      .select('id, youtube_video_id, title, description, video_type, published_at, thumbnail_url, duration_seconds, view_count, is_featured')
      .eq('consignataria_id', consignataria.id)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(12)

    const { data: videos } = await withTimeout(
      videosQuery as unknown as Promise<{ data: ConsignatariaVideo[] | null }>,
      4000,
      { data: null },
    )
    return (videos as ConsignatariaVideo[]) || []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS  (~70 pages)                                         */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return mergedSlugStaticParams()
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  // Province branch — slug is a known argentine province
  if (isProvinceSlug(slug)) {
    const meta = await provinceMetadata(slug)
    return meta ?? {}
  }

  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const upcoming = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length
  const provinces = [...new Set(profileAuctions.map(a => a.province))]

  // Check for profile-specific SEO enhancements (top traffic profiles)
  const customSEO = getProfileSEO(canonical)

  const title = customSEO
    ? `${profile.displayName} — ${customSEO.titleSuffix}`
    : `${profile.displayName} — Calendario de Remates`

  const description = customSEO?.description
    || `Calendario completo de remates ganaderos de ${profile.displayName}. ${profileAuctions.length} remates programados${upcoming > 0 ? `, ${upcoming} próximos` : ''}. ${provinces.join(', ')}.`

  return {
    title,
    description,
    keywords: customSEO?.keywords,
    openGraph: {
      title: `${profile.displayName}`,
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

  // Province branch — render province directory view
  if (isProvinceSlug(slug)) {
    return <ProvinceView provincia={slug} />
  }

  // Unknown slug → 404
  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  // Non-canonical slug → 301 redirect
  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}`)
  }

  // Always render: fall back to the static (in-repo) profile when Supabase
  // is unavailable or slow. Avoids triggering notFound() at build time and
  // losing the prerendered HTML for the slug.
  const staticFallback = getProfile(canonical)
  if (!staticFallback) notFound()
  const enriched = await withTimeout(
    getConsignatariaProfile(canonical),
    4500,
    null,
  )
  const enrichedProfile =
    enriched ?? {
      ...staticFallback,
      verified: false,
      featured: false,
    }

  const [tier, auctionResults, videos, relatedConsignatarias] = await Promise.all([
    withTimeout(getEntityTier('consignataria', canonical), 3500, 'free' as const),
    fetchAuctionResults(canonical),
    fetchConsignatariaVideos(canonical),
    withTimeout(getRelatedConsignatarias(canonical, enrichedProfile.province, 4), 3500, []),
  ])

  // Merge scraped auctions + owner-created auctions from Supabase
  const scrapedAuctions = getAuctionsForProfile(auctions, canonical)

  let ownerAuctions: Auction[] = []
  try {
    const service2 = createServiceClient()
    if (!service2) throw new Error('Supabase not available')

    const ownerQuery = service2
      .from('consignataria_auctions')
      .select('*')
      .eq('consignataria_slug', canonical)
      .order('date', { ascending: true })
    const { data: dbAuctions } = await withTimeout(
      ownerQuery as unknown as Promise<{ data: Record<string, unknown>[] | null }>,
      3500,
      { data: null },
    )

    if (dbAuctions) {
      ownerAuctions = dbAuctions.map((a: Record<string, unknown>, idx: number) => ({
        id: 100000 + (a.id as number) + idx,
        title: a.title as string,
        consignatariaName: enrichedProfile.displayName,
        consignatariaSlug: canonical,
        date: (a.date as string).slice(0, 10),
        time: (a.time as string) || null,
        location: (a.location as string) || '',
        province: (a.province as string) || '',
        type: (a.type as Auction['type']) || 'general',
        mainCategory: (a.main_category as Auction['mainCategory']) || 'mixto',
        estimatedHeads: (a.estimated_heads as number) || null,
        description: (a.description as string) || '',
        youtubeUrl: (a.youtube_url as string) || null,
        catalogUrl: (a.catalog_url as string) || null,
        source: 'manual' as const,
        sourceUrl: null,
        status: (a.status as Auction['status']) || 'scheduled',
      }))
    }
  } catch {
    // Fallback to scraped only
  }

  // Deduplicate: if a scraped auction has same date+title, prefer scraped
  const scrapedKeys = new Set(scrapedAuctions.map(a => `${a.date}|${a.title.toLowerCase()}`))
  const uniqueOwner = ownerAuctions.filter(a => !scrapedKeys.has(`${a.date}|${a.title.toLowerCase()}`))
  const profileAuctions = [...scrapedAuctions, ...uniqueOwner]
    .sort((a, b) => a.date.localeCompare(b.date))

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
      {/* VideoObject schema for auctions with live streaming */}
      {upcomingAuctions
        .filter(a => a.youtubeUrl)
        .slice(0, 3)
        .map(auction => {
          const videoId = auction.youtubeUrl?.match(/(?:v=|youtu\.be\/|\/live\/)([a-zA-Z0-9_-]{11})/)?.[1]
          return (
            <VideoObjectSchema
              key={`video-${auction.id}`}
              name={`${auction.title} — Remate en Vivo`}
              description={`Transmisión en vivo del remate ganadero ${auction.title} organizado por ${enrichedProfile.displayName}. ${auction.description || ''}`}
              thumbnailUrl={videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined}
              uploadDate={auction.date}
              contentUrl={auction.youtubeUrl || undefined}
              embedUrl={videoId ? `https://www.youtube.com/embed/${videoId}` : undefined}
              publisher={enrichedProfile.displayName}
              isLive={auction.date >= today}
            />
          )
        })}

      <ConsignatariaProfileClient
        profile={enrichedProfile}
        auctions={profileAuctions}
        tier={tier}
        auctionResults={auctionResults}
        youtubeChannel={(youtubeChannelsData as Record<string, YouTubeChannelData>)[canonical]}
        videos={videos}
        relatedConsignatarias={relatedConsignatarias}
        externalResources={(consignatariaResources as Record<string, { displayName: string; resources: Array<{ type: string; label: string; url: string; description?: string }> }>)[canonical]?.resources}
        magEntry={(marketData as { auctionDayEntries?: { consignatarias: Record<string, MagEntryData> } }).auctionDayEntries?.consignatarias?.[canonical]}
        mediosPagoSlot={
          <div className="max-w-6xl mx-auto px-4">
            <MediosPagoSection
              mediosPago={enrichedProfile.mediosPago || []}
              consignatariaName={enrichedProfile.displayName}
              redirectTo={`/consignatarias/${canonical}`}
            />
          </div>
        }
      />
    </>
  )
}
