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
import existenciasData from '@/lib/data/existencias-bovinas.json'
import type { Auction } from '@/lib/db/schema'
import {
  getCanonicalSlug,
  getProfile,
  getAuctionsForProfile,
  synthesizeProfile,
} from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile, getRelatedConsignatarias } from '@/lib/dal/consignatarias'
import { getApprovedReviewsForSlug, getReviewStatsForSlug } from '@/lib/dal/reviews'
import { getEntityTier } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase'
import { BreadcrumbSchema, LocalBusinessSchema, EventSchema, VideoObjectSchema, DatasetSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { ObservedPricesSection, getLatestRemate } from '@/components/consignataria/ObservedPricesSection'
import youtubeChannelsData from '@/lib/data/youtube-channels.json'
import consignatariaResources from '@/lib/data/consignataria-resources.json'
import { getProfileSEO } from '@/lib/data/profile-seo'
import { getRematesEspecialesForSlug } from '@/lib/data/remates-especiales'
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
// TEMPORAL (screenshot perfil PRO): render dinámico para que el tier se lea en runtime.
// REVERTIR después.
export const dynamic = 'force-dynamic'
// Allow dynamic rendering for slugs not in generateStaticParams output.
// Profile slugs are merged in but Next 15 has a quirk with sibling
// generateStaticParams overlap — falling back to dynamic for safety.
export const dynamicParams = true

const auctions = rematesData as Auction[]

/**
 * Resolve a URL slug to render under. Curated slugs resolve to their canonical;
 * an unregistered consignataria that still has remates resolves to its own slug
 * (so it renders a synthesized profile instead of 404). Returns null only when
 * the slug is unknown everywhere.
 */
function resolveConsignatariaSlug(slug: string): string | null {
  const canonical = getCanonicalSlug(slug)
  if (canonical) return canonical
  if (auctions.some(a => a.consignatariaSlug === slug)) return slug
  return null
}

/** Curated profile, or a minimal profile synthesized from the remate data. */
function getOrSynthesizeProfile(canonical: string) {
  const curated = getProfile(canonical)
  if (curated) return curated
  const match = auctions.find(a => a.consignatariaSlug === canonical)
  return match ? synthesizeProfile(canonical, match.consignatariaName) : null
}

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
      .eq('consignataria_id', String(consignataria.id))
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

  const canonical = resolveConsignatariaSlug(slug)
  if (!canonical) return {}

  const profile = getOrSynthesizeProfile(canonical)
  if (!profile) return {}

  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const upcoming = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length
  const provinces = [...new Set(profileAuctions.map(a => a.province))]

  // Check for profile-specific SEO enhancements (top traffic profiles)
  const customSEO = getProfileSEO(canonical)

  // Provinces come uppercase from the data; title-case for display.
  const titleCaseProv = (s: string) =>
    s
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ')
  const primaryProvince = provinces.filter(Boolean)[0]
  const geo = primaryProvince ? ` en ${titleCaseProv(primaryProvince)}` : ''

  // Non-custom branch targets both query intents for a consignataria: "<marca> remates" and
  // "precio hacienda <marca>". Dropped geo from the title to avoid truncation on long names
  // (geo stays in the description for local intent). customSEO branch (top profiles) intact.
  const title = customSEO
    ? `${profile.displayName} — ${customSEO.titleSuffix}`
    : `${profile.displayName}: Precios y Remates de Hacienda`

  const description = customSEO?.description
    || `Remates y precios de hacienda de ${profile.displayName}${geo}. ${profileAuctions.length} remates registrados${upcoming > 0 ? `, ${upcoming} próximos` : ''}. Cotizaciones por categoría actualizadas tras cada remate.`

  // Thin profiles (0–1 remates, no SEO enhancement) have too little unique
  // content to index — keep them crawlable/followable but out of the index.
  const thin = profileAuctions.length < 2 && !customSEO

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
    ...(thin && { robots: { index: false, follow: true } }),
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

  // Unknown slug (no curated mapping and no remates) → 404
  const canonical = resolveConsignatariaSlug(slug)
  if (!canonical) notFound()

  // Non-canonical slug → 301 redirect (synthesized slugs resolve to themselves,
  // so this only fires for curated variant slugs).
  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}`)
  }

  // Always render: fall back to the static (in-repo) profile when Supabase
  // is unavailable or slow. Avoids triggering notFound() at build time and
  // losing the prerendered HTML for the slug. Uncurated consignatarias with
  // remates get a minimal synthesized profile here.
  const staticFallback = getOrSynthesizeProfile(canonical)
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

  const [tier, auctionResults, videos, relatedConsignatarias, reviewsAndStats] = await Promise.all([
    withTimeout(getEntityTier('consignataria', canonical), 3500, 'free' as const),
    fetchAuctionResults(canonical),
    fetchConsignatariaVideos(canonical),
    withTimeout(getRelatedConsignatarias(canonical, enrichedProfile.province, 4), 3500, []),
    withTimeout(
      Promise.all([getApprovedReviewsForSlug(canonical, 10), getReviewStatsForSlug(canonical)]).then(
        ([reviews, stats]) => ({ reviews, stats }),
      ),
      3500,
      { reviews: [], stats: { count: 0, avgRating: null } },
    ),
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

  // Server-rendered overview (the interactive calendar below is client-only, so
  // this gives the crawled HTML real, per-consignataria-unique content).
  const upcomingCount = profileAuctions.filter(a => a.date >= today).length
  const tipos = [...new Set(profileAuctions.map(a => a.type).filter(Boolean))]
  const provincesList = provinces.length ? provinces.join(', ') : primaryProvince
  const consigSummary =
    `${enrichedProfile.displayName} es una consignataria de hacienda con ${profileAuctions.length} ${profileAuctions.length === 1 ? 'remate registrado' : 'remates registrados'} en consignatarias.com.ar` +
    (upcomingCount > 0 ? `, ${upcomingCount} ${upcomingCount === 1 ? 'próximo' : 'próximos'}` : '') +
    `. Opera en ${provinces.length > 1 ? `${provinces.length} provincias (${provincesList})` : provincesList}` +
    (tipos.length ? `, con remates de ${tipos.join(', ')}` : '') +
    `${primaryCity ? `. Base de operaciones: ${primaryCity}` : ''}.`
  const consigExistencias = (existenciasData as unknown as Record<string, { total: number; year: number }>)[(primaryProvince || '').toUpperCase()] ?? null
  const serverUpcoming = profileAuctions
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  // Observed prices reported by the firm for its latest auction (named source).
  const latestRemate = getLatestRemate(canonical)
  const observedFaq = latestRemate
    ? (() => {
        const { fuente, remate } = latestRemate
        const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`
        const items: { question: string; answer: string }[] = []
        const ternero = remate.categorias.find((c) => c.label.toLowerCase().startsWith('terneros'))
        if (ternero) {
          const mid = Math.round((ternero.min + ternero.max) / 2)
          items.push({
            question: `¿A cuánto se vendió el ternero en ${remate.plaza}, ${remate.provincia}?`,
            answer: `En el remate del ${remate.fecha} de ${fuente} (${remate.feria || remate.plaza}, ${remate.provincia}), el ternero de invernada hasta 200 kg se operó entre ${fmt(ternero.min)} y ${fmt(ternero.max)} por kilo vivo (punto medio ${fmt(mid)}/kg).`,
          })
        }
        items.push({
          question: `¿Qué precios tuvo el remate de ${fuente}?`,
          answer:
            `Precios $/kg vivo observados en el remate del ${remate.fecha} (${remate.plaza}, ${remate.provincia}): ` +
            remate.categorias
              .map((c) => `${c.label} ${fmt(c.min)}–${fmt(c.max)}`)
              .join('; ') +
            `. Fuente: ${fuente}.`,
        })
        return items
      })()
    : []

  // Remates especiales (cabañas/expositores premium) operados por esta firma.
  // Config-driven y reusable: se siembra en remates-especiales.json. El remate
  // normal ya vive en el cronograma (matcheado por slug + fecha); acá sólo se
  // pasa el destaque premium.
  const rematesEspeciales = getRematesEspecialesForSlug(canonical)

  // Resumen liviano de precios del último remate → tarjeta "Últimos precios" del hero.
  const latestRemateSummary = latestRemate
    ? {
        fuente: latestRemate.fuente,
        fecha: latestRemate.remate.fecha,
        top: latestRemate.remate.categorias.slice(0, 3).map((c) => ({
          label: c.label,
          mid: Math.round((c.min + c.max) / 2),
        })),
      }
    : null

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

      {/* Ficha interactiva — encabeza la página: lo primero que ve el productor
          es la identidad (logo + nombre grande) y los 3 jobs, no un bloque de texto. */}
      <ConsignatariaProfileClient
        profile={enrichedProfile}
        auctions={profileAuctions}
        tier={tier}
        auctionResults={auctionResults}
        youtubeChannel={(youtubeChannelsData as Record<string, YouTubeChannelData>)[canonical]}
        videos={videos}
        relatedConsignatarias={relatedConsignatarias}
        reviews={reviewsAndStats.reviews}
        reviewStats={reviewsAndStats.stats}
        externalResources={(consignatariaResources as Record<string, { displayName: string; resources: Array<{ type: string; label: string; url: string; description?: string }> }>)[canonical]?.resources}
        magEntry={(marketData as { auctionDayEntries?: { consignatarias: Record<string, MagEntryData> } }).auctionDayEntries?.consignatarias?.[canonical]}
        latestRemateSummary={latestRemateSummary}
        rematesEspeciales={rematesEspeciales}
        mediosPagoSlot={
          <div key="medios-pago" className="max-w-6xl mx-auto px-4">
            <MediosPagoSection
              mediosPago={enrichedProfile.mediosPago || []}
              consignatariaName={enrichedProfile.displayName}
            />
          </div>
        }
      />

      {/* Observed prices reported by the firm (named source, citable). */}
      {latestRemate && (
        <>
          <DatasetSchema
            name={`Precios de hacienda — ${latestRemate.fuente}, remate ${latestRemate.remate.fecha}`}
            description={`Precios $/kg vivo por categoría observados en el remate de ${latestRemate.fuente} en ${latestRemate.remate.plaza}, ${latestRemate.remate.provincia} (${latestRemate.remate.fecha}). Fuente: ${latestRemate.fuente}.`}
            url={`https://www.consignatarias.com.ar/consignatarias/${canonical}#precios-observados`}
            keywords={['precio hacienda', latestRemate.remate.provincia, latestRemate.remate.plaza, 'precio ternero', 'precio novillo', 'remate ganadero']}
            dateModified={latestRemate.remate.fecha}
            creator={latestRemate.fuente}
          />
          {observedFaq.length > 0 && <FAQPageSchema items={observedFaq} />}
          <ObservedPricesSection slug={canonical} />
        </>
      )}

      {/* Perfil — resumen citable + contexto. Server-rendered (SEO); va debajo de la
          ficha interactiva, que ya encabeza con identidad y próximos remates. */}
      <section className="max-w-6xl mx-auto px-2 sm:px-4 pb-3">
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header text-zinc-200 text-label tracking-widest">PERFIL</div>
          <div className="px-panel py-3 space-y-3">
            <p className="text-data text-zinc-300 leading-relaxed">{consigSummary}</p>
            {consigExistencias && (
              <p className="text-xxs font-terminal text-zinc-500">
                Existencias bovinas en {primaryProvince}:{' '}
                <span className="text-zinc-300 tabular-nums">{consigExistencias.total.toLocaleString('es-AR')}</span> cabezas
                <span className="text-zinc-600"> · SENASA {consigExistencias.year}</span>
              </p>
            )}
            {serverUpcoming.length > 0 && (
              <div className="pt-3 border-t border-terminal-border">
                <h2 className="text-xxs font-terminal text-zinc-500 uppercase tracking-widest mb-2">
                  Próximos remates de {enrichedProfile.displayName}
                </h2>
                <ul className="space-y-1 text-data text-zinc-400 font-terminal">
                  {serverUpcoming.map((a, i) => (
                    <li key={`${a.date}-${i}`} className="flex items-baseline gap-2">
                      <span className="text-accent" aria-hidden>—</span>
                      <span>
                        <span className="text-zinc-300 tabular-nums">{a.date}</span>
                        {' · '}{a.title}
                        {(a.location || '').split(',')[0].trim() ? ` · ${(a.location || '').split(',')[0].trim()}` : ''}
                        {a.province ? `, ${a.province}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                {upcomingCount > 3 && (
                  <p className="text-xxs text-zinc-500 mt-2">
                    +{upcomingCount - 3} {upcomingCount - 3 === 1 ? 'remate más' : 'remates más'} en el cronograma completo, más arriba.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
