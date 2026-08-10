import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { resolveYoutubeUrl } from '@/lib/youtube-live'
import { resolverStream, contactoClicable, videoEnVivoDelCanal } from '@/lib/streams'
import { getEffectiveStatus } from '@/lib/ui/tokens'
import StreamWall, { type StreamItem } from '@/components/remates/StreamWall'
import { createServiceClient } from '@/lib/supabase'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { Calendar, Clock, MapPin, Users, Play, FileText, Video, Youtube, Radio } from 'lucide-react'
import LiveRemateTicker from '@/components/LiveRemateTicker'

// Regenerate hourly for fresh data
export const revalidate = 3600

// Get today's date in Argentina timezone
function getTodayStr(): string {
  const now = new Date()
  // Argentina is UTC-3
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  return argentinaTime.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
}

export async function generateMetadata(): Promise<Metadata> {
  const todayStr = getTodayStr()
  // Count any remate where we can resolve a YouTube target: either a direct
  // youtubeUrl on the auction, or a known channel for the consignataria.
  const liveRemates = (remates as Array<{ date: string; status: string; consignatariaSlug: string; youtubeUrl: string | null }>)
    .filter(r => r.date >= todayStr && resolveYoutubeUrl(r) !== null)
  const count = liveRemates.length
  const now = new Date()
  const monthName = now.toLocaleDateString('es-AR', { month: 'long' })
  const year = now.getFullYear()

  return {
    title: `Remates Ganaderos en Vivo ${monthName} ${year} | ${count} Transmisiones`,
    description: `${count} remates de ganado con transmisión en vivo por YouTube. Mirá los remates ganaderos online desde cualquier lugar. Calendario actualizado de subastas con streaming en Argentina.`,
    keywords: [
      'remates ganaderos en vivo',
      'remates de hacienda online',
      'remates ganado youtube',
      'subastas ganaderas streaming',
      'remates bovinos transmision',
      'ver remates en vivo',
      'remates online argentina',
      'remates por youtube',
      'livestream remates ganado',
    ],
    openGraph: {
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
      title: `🔴 Remates Ganaderos en Vivo — ${count} Transmisiones`,
      description: `${count} remates de ganado con transmisión en vivo. Participá de las subastas desde cualquier lugar.`,
      url: 'https://www.consignatarias.com.ar/remates/en-vivo',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/en-vivo',
    },
  }
}

interface Remate {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string
  time: string | null
  location: string
  province: string
  type: string
  mainCategory: string
  estimatedHeads: number | null
  description: string
  youtubeUrl: string | null
  catalogUrl: string | null
  sourceUrl: string | null
  status: string
}

/** Clave estable para el ancla del stream. NO se usa remate.id: se reasigna en
 *  cada scrape, así que un link compartido apuntaría a otro remate mañana. */
function claveStream(r: { consignatariaSlug: string; date: string; time: string | null }): string {
  return `${r.consignatariaSlug}-${r.date}${r.time ? '-' + r.time.replace(':', '') : ''}`
}

/** Teléfono y WhatsApp de las firmas que hoy transmiten, para el botón de contacto. */
async function traerContactos(slugs: string[]): Promise<Map<string, { phone: string | null; whatsapp: string | null }>> {
  const salida = new Map<string, { phone: string | null; whatsapp: string | null }>()
  const db = createServiceClient()
  if (!db || slugs.length === 0) return salida
  const { data } = await db
    .from('consignatarias')
    .select('canonical_slug, phone, whatsapp')
    .in('canonical_slug', slugs)
  for (const row of data ?? []) {
    const r = row as { canonical_slug: string; phone: string | null; whatsapp: string | null }
    salida.set(r.canonical_slug, { phone: r.phone, whatsapp: r.whatsapp })
  }
  return salida
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[7]?.length === 11) ? match[7] : null
}

function LiveRemateCard({ remate, isToday, isLive, confidence, watchUrl, anclaStream }: { remate: Remate; isToday: boolean; isLive: boolean; confidence: 'confirmed' | 'probable'; watchUrl: string; anclaStream?: string | null }) {
  const typeColors: Record<string, string> = {
    invernada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cria: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    especial: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    reproductores: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }

  const typeColor = typeColors[remate.type?.toLowerCase()] || typeColors.general
  const isProbable = confidence === 'probable'
  const videoId = remate.youtubeUrl ? extractYouTubeId(remate.youtubeUrl) : null

  return (
    <article className={`bg-zinc-900/50 border rounded-lg overflow-hidden hover:border-zinc-600 transition-colors ${
      isLive ? 'border-red-500/50 ring-1 ring-red-500/20' : isToday ? 'border-sky-500/30' : isProbable ? 'border-zinc-800/70' : 'border-zinc-800'
    }`}>
      {/* YouTube Thumbnail — only when we have a confirmed video id */}
      {videoId && (
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video bg-zinc-800 group"
        >
          <Image
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt={`Transmisión ${remate.consignatariaName}`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
          {/* Live badge */}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">EN VIVO</span>
            </div>
          )}
          {isToday && !isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-accent rounded-sm">
              <span className="text-black text-xs font-bold">HOY</span>
            </div>
          )}
          {/* Date badge */}
          {!isToday && !isLive && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded-sm">
              <span className="text-white text-xs font-medium">{formatDateShort(remate.date)}</span>
            </div>
          )}
        </a>
      )}
      {/* Probable-transmission banner — when we don't have a direct video,
          surface the channel match so the user can still find the stream. */}
      {!videoId && isProbable && (
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xxs uppercase tracking-wider text-zinc-500">
            Probable transmisión
          </span>
          <span className="text-xxs text-zinc-600">·</span>
          <span className="text-xxs text-zinc-500">
            canal habitual: <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-red-400 underline-offset-2 hover:underline">YouTube /streams</a>
          </span>
          {isToday && (
            <span className="ml-auto px-1.5 py-0.5 bg-accent rounded-sm text-black text-xxs font-bold">HOY</span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={consignatariaProfilePath(remate.consignatariaSlug)}
              className="text-lg font-medium text-zinc-100 hover:text-accent transition-colors line-clamp-1"
            >
              {remate.consignatariaName}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{remate.location}, {remate.province}</span>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium border rounded ${typeColor} shrink-0`}>
            {remate.type}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDateShort(remate.date)}</span>
          </div>
          {remate.time && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{remate.time} hs</span>
            </div>
          )}
          {remate.estimatedHeads && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>~{remate.estimatedHeads.toLocaleString('es-AR')} cabezas</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
          {/* Si la transmisión se puede ver acá arriba, el botón NO sale del sitio:
              lleva al reproductor de la pared, que se abre solo con el ancla. */}
          {anclaStream ? (
            <a
              href={`#stream-${anclaStream}`}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded transition-colors ${
                isLive
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <Play className="w-4 h-4" />
              {isLive ? 'Ver ahora acá' : 'Ver acá'}
            </a>
          ) : (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded transition-colors ${
                isProbable
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <Youtube className="w-4 h-4" />
              {isProbable ? 'Ir al canal' : 'Ver transmisión'}
            </a>
          )}
          {remate.catalogUrl && (
            <a
              href={normalizeUrl(remate.catalogUrl) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
            >
              <FileText className="w-3 h-3" />
              Catálogo
            </a>
          )}
          <Link
            href={consignatariaProfilePath(remate.consignatariaSlug)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          >
            Ver perfil →
          </Link>
        </div>
      </div>
    </article>
  )
}

interface LiveRemateView extends Remate {
  confidence: 'confirmed' | 'probable'
  watchUrl: string
}

export default async function RematesEnVivoPage() {
  const todayStr = getTodayStr()

  // Resolve every upcoming/today remate to a YouTube URL — direct video if
  // we have one (confirmed), channel /streams if we only know the channel
  // (probable). 0→80+ upcoming streams after this match.
  const liveRemates: LiveRemateView[] = (remates as Remate[])
    .filter(r => r.date >= todayStr)
    .map(r => {
      const resolved = resolveYoutubeUrl(r)
      if (!resolved) return null
      return { ...r, confidence: resolved.confidence, watchUrl: resolved.url }
    })
    .filter((r): r is LiveRemateView => r !== null)
    .sort((a, b) => {
      // Today first, then confirmed before probable, then by date, then by time
      if (a.date === todayStr && b.date !== todayStr) return -1
      if (b.date === todayStr && a.date !== todayStr) return 1
      if (a.confidence !== b.confidence) {
        return a.confidence === 'confirmed' ? -1 : 1
      }
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

  const count = liveRemates.length
  const confirmedCount = liveRemates.filter(r => r.confidence === 'confirmed').length
  const probableCount = liveRemates.filter(r => r.confidence === 'probable').length
  const todayCount = liveRemates.filter(r => r.date === todayStr).length

  // La pared de transmisiones: solo las de HOY, que son las que se pueden mirar.
  // Un remate de la semana que viene no tiene nada que reproducir todavía.
  const deHoy = liveRemates.filter((r) => r.date === todayStr)
  const contactos = await traerContactos(
    Array.from(new Set(deHoy.map((r) => getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug))),
  )
  // Para los de hoy preguntamos a YouTube si el canal está realmente al aire.
  // Son un puñado, y convierte una suposición ("debería estar transmitiendo")
  // en un hecho ("está transmitiendo este video").
  const canalesDeHoy = new Map<string, string | null>()
  await Promise.all(
    deHoy.map(async (r) => {
      if (r.youtubeUrl) return
      const emb = resolverStream(r)
      if (!emb || emb.tipo !== 'canal') return
      const chId = emb.embedUrl.match(/channel=([^&]+)/)?.[1]
      if (!chId || canalesDeHoy.has(chId)) return
      canalesDeHoy.set(chId, await videoEnVivoDelCanal(chId))
    }),
  )

  const streams: StreamItem[] = deHoy
    .map((r): StreamItem | null => {
      const emb = resolverStream(r)
      if (!emb) return null
      // Canal sin transmisión en curso: no hay nada que reproducir. Fuera.
      let embedUrl = emb.embedUrl
      if (emb.tipo === 'canal') {
        const chId = emb.embedUrl.match(/channel=([^&]+)/)?.[1]
        const vid = chId ? canalesDeHoy.get(chId) : null
        if (!vid) return null
        embedUrl = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
      }
      const canonical = getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug
      const c = contactos.get(canonical)
      const { tel, wa, visible } = contactoClicable(c?.phone, c?.whatsapp)
      return {
        id: claveStream(r),
        // Al aire de verdad, según hora ART: es lo que decide si hay algo que
        // reproducir. Un embed de canal fuera de horario devuelve negro.
        enVivoAhora: getEffectiveStatus(r.date, r.time, todayStr) === 'live',
        titulo: r.title,
        firma: r.consignatariaName,
        slug: canonical,
        perfilHref: consignatariaProfilePath(r.consignatariaSlug),
        embedUrl,
        watchUrl: emb.watchUrl,
        confianza: emb.confianza,
        hora: r.time,
        lugar: r.province || null,
        tel,
        wa,
        telVisible: visible,
      }
    })
    .filter((s): s is StreamItem => s !== null)

  // Group by date
  const byDate = liveRemates.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {} as Record<string, LiveRemateView[]>)

  // Schema data — only include confirmed streams (probable is editorial UX,
  // not factual enough for ItemList markup)
  const schemaRemates = liveRemates
    .filter(r => r.confidence === 'confirmed')
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      name: `🔴 ${r.consignatariaName} - ${r.type}`,
      date: r.date,
      time: r.time || undefined,
      location: r.location,
      province: r.province,
      consignatariaName: r.consignatariaName,
      type: r.type,
      estimatedHeads: r.estimatedHeads || undefined,
      url: r.watchUrl,
    }))

  return (
    <>
      <SectionBreadcrumbSchema section="remates/en-vivo" sectionName="Remates en Vivo" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} />}

      {/* Hero — render de marca de los remates en vivo (universo v2.0) */}
      <section className="relative overflow-hidden">
        <img
          src="/marca/features/feat-remates-vivo.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-[#09090b]/25" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#09090b]" aria-hidden="true" />
        <div className="relative px-4 pt-6 pb-6 max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-xs text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span className="mx-2">›</span>
            <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
            <span className="mx-2">›</span>
            <span className="text-zinc-400">En Vivo</span>
          </nav>

          {/* Ticker de transcripción del remate en vivo (lo llena el worker off-Vercel).
              Se auto-oculta si no hay sesión activa, así que es seguro montarlo siempre. */}
          <LiveRemateTicker />

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-zinc-100">
                🔴 Remates Ganaderos en Vivo
              </h1>
              {todayCount > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded text-sm font-medium text-white">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {todayCount} hoy
                </span>
              )}
            </div>
            <p className="text-zinc-400">
              Remates de hacienda con transmisión por YouTube. Confirmados con video directo o vía
              el canal habitual de la consignataria. Participá de las subastas desde cualquier lugar.
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            <span className="text-zinc-400 text-sm">
              <strong className="text-zinc-200">{count}</strong> transmisiones
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-400" />
            <span className="text-zinc-400 text-sm">
              <strong className="text-zinc-200">{confirmedCount}</strong> confirmadas
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-400 text-sm">
              <strong className="text-zinc-300">{probableCount}</strong> probables
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-zinc-400 text-sm">
              <strong className="text-zinc-200">{todayCount}</strong> hoy
            </span>
          </div>
        </div>

        {/* Content */}
        {count === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="text-zinc-500 mb-4">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay remates con transmisión programados</p>
              <p className="text-sm mt-2">Muchas consignatarias transmiten sus remates por YouTube.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/remates"
                className="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-accent text-sm font-medium rounded hover:bg-sky-500/20 transition-colors"
              >
                Ver todos los remates
              </Link>
              <Link
                href="/consignatarias"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
              >
                Explorar consignatarias
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <StreamWall streams={streams} />
            {Object.entries(byDate).map(([date, dateRemates]) => {
              const isToday = date === todayStr
              const dateLabel = isToday ? '🔴 Hoy' : formatDate(date)
              
              return (
                <section key={date}>
                  <h2 className={`text-lg font-medium mb-4 flex items-center gap-2 ${
                    isToday ? 'text-red-400' : 'text-zinc-300'
                  }`}>
                    {dateLabel}
                    <span className="text-sm text-zinc-600">({dateRemates.length} transmisiones)</span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {dateRemates.map(remate => (
                      <LiveRemateCard
                        key={remate.id}
                        remate={remate}
                        isToday={isToday}
                        isLive={isToday && remate.status === 'live' && remate.confidence === 'confirmed'}
                        confidence={remate.confidence}
                        watchUrl={remate.watchUrl}
                        anclaStream={
                          isToday && streams.some((s) => s.id === claveStream(remate))
                            ? claveStream(remate)
                            : null
                        }
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* SEO Content */}
        <section className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Cómo ver remates ganaderos en vivo
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3">
            <p>
              Los <strong className="text-zinc-200">remates ganaderos en vivo</strong> permiten participar de las subastas 
              de hacienda desde cualquier lugar. Las principales consignatarias de Argentina transmiten sus remates 
              por <strong className="text-zinc-200">YouTube</strong> y otras plataformas de streaming.
            </p>
            <p>
              Para participar remotamente, contactá previamente a la consignataria para registrarte como postor. 
              Podrás ofertar por teléfono, WhatsApp o plataformas dedicadas mientras mirás la transmisión en vivo.
            </p>
            <h3 className="text-zinc-200 text-base mt-6 mb-2">Ventajas de participar online</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Ahorrás tiempo y costos de traslado</li>
              <li>Podés seguir remates en diferentes regiones el mismo día</li>
              <li>Accedés a más oportunidades de compra</li>
              <li>Revisás el catálogo mientras mirás la transmisión</li>
            </ul>
            <p className="mt-4">
              Consultá los links de transmisión de cada remate y registrate con anticipación para poder ofertar.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/remates"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Ver todos los remates →
          </Link>
          <Link
            href="/remates/hoy"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Remates de hoy →
          </Link>
          <Link
            href="/consignatarias"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Directorio de consignatarias →
          </Link>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-red-900/30 to-sky-900/30 border border-red-800/30 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-white mb-2">
            ¿Tu consignataria transmite en vivo?
          </p>
          <p className="text-zinc-300 mb-4">
            Sumá tu canal de YouTube a tu perfil y llegá a más compradores.
          </p>
          <Link
            href="/planes"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            <Youtube className="w-5 h-5" />
            Agregar transmisión
          </Link>
        </div>

        {/* Last update */}
        <p className="text-xs text-zinc-600 mt-6">
          Datos actualizados automáticamente. Los links de transmisión son provistos por cada consignataria.
        </p>
      </div>
    </>
  )
}
