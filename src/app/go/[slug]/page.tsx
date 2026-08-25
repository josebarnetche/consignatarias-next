import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import { getCanonicalSlug, getProfile, getAuctionsForProfile, getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'
import { getOwnerAuctionsBySlug, mergeAuctions, normalizeOwnerAuction } from '@/lib/dal/auctions'
import { createServiceClient } from '@/lib/supabase'
import { normalizeUrl } from '@/lib/utils/url'
import { getConsignatariaProfile, getFollowerCount } from '@/lib/dal/consignatarias'
import { getEntityTier } from '@/lib/features'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { ConsignatariaProfileSchema, BreadcrumbSchema, EventSchema } from '@/components/seo/JsonLd'
import { AddToCalendarButton } from '@/components/ui/AddToCalendarButton'
import GoContactSection from '@/components/GoContactSection'
import { FollowButton } from '@/components/ui/FollowButton'
import { FollowerCount } from '@/components/ui/FollowerCount'

const auctions = rematesData as Auction[]

// Cost optimization: static at build time (no ISR, rebuild on deploy)
export const revalidate = false
export const dynamicParams = false

export function generateStaticParams() {
  return getAllCanonicalSlugs().map(slug => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

/* ------------------------------------------------------------------ */
/*  METADATA — Optimized for sharing                                   */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const upcoming = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10))
  const nextRemate = upcoming[0]

  const title = `${profile.displayName} — Remates de Hacienda`
  const description = nextRemate 
    ? `Próximo remate: ${nextRemate.title} — ${formatDate(nextRemate.date)}. ${upcoming.length} remates programados.`
    : `${profileAuctions.length} remates de hacienda. Calendario completo de ${profile.displayName}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.consignatarias.com.ar/go/${canonical}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: false, follow: true },
    // C6: la URL canónica SEO es la ficha /consignatarias/[slug] (self-canonical correcto
    // + en sitemap). /go es superficie de share/distribución → noindex + canonical cruzado,
    // corrigiendo el canonical-al-home heredado del layout.
    alternates: { canonical: `https://www.consignatarias.com.ar/consignatarias/${canonical}` },
  }
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const [_y, m, d] = dateStr.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function GoLandingPage({ params }: Props) {
  const { slug } = await params

  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  // Redirect non-canonical slugs
  if (slug !== canonical) {
    redirect(`/go/${canonical}`)
  }

  const [profile, followerCount] = await Promise.all([
    getConsignatariaProfile(canonical),
    getFollowerCount(canonical),
  ])
  if (!profile) notFound()

  const tier = await getEntityTier('consignataria', canonical)
  const isPro = tier === 'pro' || tier === 'enterprise'

  // Agenda completa: scrape + lo que cargó la firma desde su panel.
  //
  // Esta página es SSG con `revalidate = false`, así que el merge corre en el BUILD:
  // un remate que la firma cargue hoy aparece acá en el próximo rebuild (el scrape
  // diario lo dispara, ~24 h). Se usa el fetch en lote —una query para las 107
  // páginas— porque `dynamicParams = false` las genera todas de una y consultar
  // firma por firma serían 107 consultas por build.
  const ownerBySlug = await getOwnerAuctionsBySlug(createServiceClient())
  const profileAuctions = mergeAuctions(
    getAuctionsForProfile(auctions, canonical),
    (ownerBySlug.get(canonical) ?? []).map((r) => normalizeOwnerAuction(r, profile.displayName, canonical)),
  )
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = profileAuctions.filter(a => a.date >= today)

  const nextRemate = upcoming[0]
  const moreRemates = upcoming.slice(1, 4)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      {/* SEO Schema */}
      <ConsignatariaProfileSchema
        name={profile.displayName}
        slug={canonical}
        provincia={profileAuctions[0]?.province || 'Argentina'}
        localidad={profileAuctions[0]?.location}
        totalRemates={profileAuctions.length}
        isPro={isPro}
        description={`${profile.displayName} - Consignataria de hacienda. ${upcoming.length} remates programados.`}
      />
      <BreadcrumbSchema items={[
        { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
        { name: 'Consignatarias', url: 'https://www.consignatarias.com.ar/consignatarias' },
        { name: profile.displayName, url: `https://www.consignatarias.com.ar/go/${canonical}` },
      ]} />
      {nextRemate && (
        <EventSchema
          name={`Remate ${nextRemate.type} - ${profile.displayName}`}
          description={nextRemate.title}
          startDate={nextRemate.time ? `${nextRemate.date}T${nextRemate.time}:00` : `${nextRemate.date}T10:00:00`}
          location={{ name: nextRemate.location || 'Argentina', address: nextRemate.province || 'Argentina' }}
          organizer={profile.displayName}
          url={`https://www.consignatarias.com.ar/go/${canonical}`}
          eventAttendanceMode={nextRemate.youtubeUrl ? 'mixed' : 'offline'}
        />
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 pt-12 pb-8">
          {/* Logo + Name */}
          <div className="text-center mb-8">
            {profile.logoUrl && isPro && (
              <div className="w-24 h-24 mx-auto mb-4 rounded-xl border-2 border-amber-500/30 bg-zinc-800/50 overflow-hidden shadow-lg shadow-amber-500/10 relative">
                <Image src={profile.logoUrl} alt={profile.displayName} className="object-contain" fill unoptimized />
              </div>
            )}
            
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {profile.displayName}
            </h1>
            
            {isPro && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <span className="text-amber-400">★</span>
                <span className="text-amber-400 text-sm font-medium">Consignataria PRO</span>
              </div>
            )}

            {profile.verified && !isPro && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <span className="text-emerald-400 text-sm font-medium">✓ Verificada</span>
              </div>
            )}

            {/* Follow Button + Social Proof - Core Lock-in */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <FollowButton slug={canonical} displayName={profile.displayName} size="md" />
              <FollowerCount count={followerCount} />
            </div>
          </div>

          {/* Next Remate - Featured */}
          {nextRemate && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-6 backdrop-blur">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Próximo Remate</div>
              
              <h2 className="text-xl font-semibold text-white mb-3">{nextRemate.title}</h2>
              
              <div className="flex flex-wrap gap-4 text-sm text-zinc-300 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">📅</span>
                  <span className="capitalize">{formatFullDate(nextRemate.date)}</span>
                </div>
                {nextRemate.time && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">🕐</span>
                    <span>{nextRemate.time} hs</span>
                  </div>
                )}
                {nextRemate.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">📍</span>
                    <span>{nextRemate.location}</span>
                  </div>
                )}
                {nextRemate.estimatedHeads && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">🐄</span>
                    <span>{nextRemate.estimatedHeads.toLocaleString('es-AR')} cabezas</span>
                  </div>
                )}
              </div>

              {nextRemate.description && (
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{nextRemate.description}</p>
              )}

              <div className="flex flex-wrap gap-3">
                {nextRemate.catalogUrl && (
                  <a
                    href={normalizeUrl(nextRemate.catalogUrl) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] text-center px-4 py-2.5 bg-accent hover:bg-sky-300 text-zinc-950 font-medium rounded-lg transition-colors"
                  >
                    📋 Ver Catálogo
                  </a>
                )}
                {nextRemate.youtubeUrl && (
                  <a
                    href={normalizeUrl(nextRemate.youtubeUrl) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] text-center px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
                  >
                    ▶️ Ver en Vivo
                  </a>
                )}
                <AddToCalendarButton
                  title={`${nextRemate.type} - ${profile.displayName}`}
                  description={nextRemate.title}
                  location={nextRemate.location || nextRemate.province || 'Argentina'}
                  startDate={nextRemate.date}
                  startTime={nextRemate.time}
                  organizer={profile.displayName}
                  url={`https://www.consignatarias.com.ar/go/${canonical}`}
                  className="flex-1 min-w-[140px]"
                />
              </div>
            </div>
          )}

          {/* More upcoming remates */}
          {moreRemates.length > 0 && (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 mb-6">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Más Remates</div>
              <div className="space-y-3">
                {moreRemates.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                    <div>
                      <div className="text-sm text-white">{r.title}</div>
                      <div className="text-xs text-zinc-500">{r.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-300">{formatDate(r.date)}</div>
                      {r.time && <div className="text-xs text-zinc-500">{r.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Section with Lead Capture */}
          <GoContactSection
            slug={canonical}
            displayName={profile.displayName}
            whatsapp={profile.whatsapp ?? null}
            phone={profile.phone ?? null}
            isPro={isPro}
          />
        </div>
      </div>
    </div>
  )
}
