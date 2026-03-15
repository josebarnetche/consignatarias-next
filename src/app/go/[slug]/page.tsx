import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCanonicalSlug, getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile } from '@/lib/dal/consignatarias'
import { getEntityTier } from '@/lib/features'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

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
      images: [
        {
          url: 'https://www.consignatarias.com.ar/og-consignataria.png',
          width: 1200,
          height: 630,
          alt: profile.displayName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
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

  const profile = await getConsignatariaProfile(canonical)
  if (!profile) notFound()

  const tier = await getEntityTier('consignataria', canonical)
  const isPro = tier === 'pro' || tier === 'enterprise'

  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = profileAuctions
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  
  const nextRemate = upcoming[0]
  const moreRemates = upcoming.slice(1, 4)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
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
                    href={nextRemate.catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                  >
                    📋 Ver Catálogo
                  </a>
                )}
                {nextRemate.youtubeUrl && (
                  <a
                    href={nextRemate.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] text-center px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
                  >
                    ▶️ Ver en Vivo
                  </a>
                )}
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

          {/* Contact CTAs */}
          <div className="space-y-3 mb-8">
            {profile.whatsapp && (
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi su perfil en consignatarias.com.ar y me gustaría consultar sobre sus remates.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            )}

            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-xl transition-colors"
              >
                📞 Llamar: {profile.phone}
              </a>
            )}

            <Link
              href={`/consignatarias/${canonical}?utm_source=go&utm_medium=landing`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-semibold rounded-xl transition-colors"
            >
              📅 Ver Calendario Completo
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-zinc-500 space-y-2">
            <p>
              <Link href="/" className="hover:text-zinc-300 transition-colors">
                consignatarias.com.ar
              </Link>
              {' — '}
              El directorio de remates ganaderos de Argentina
            </p>
            {!isPro && (
              <p>
                <Link href="/planes" className="text-amber-400 hover:text-amber-300 transition-colors">
                  ¿Sos consignatario? Destacá tu perfil →
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
