import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { resolveYoutubeUrl } from '@/lib/youtube-live'
import MuroEnVivo from '@/components/remates/MuroEnVivo'
import {
  claveStream,
  construirPared,
  nombreDeFirma,
  hoyArgentina,
  rematesTransmitibles,
  repeticionesRecientes,
  type RemateResuelto,
} from '@/lib/remates-en-vivo'
import { getEffectiveStatus } from '@/lib/ui/tokens'
import { getBandasPublicas, vrCobertura } from '@/lib/vr'
import { Calendar, Clock, MapPin, Users, Play, FileText, Youtube, Radio } from 'lucide-react'
import LiveRemateTicker from '@/components/LiveRemateTicker'

/**
 * Cinco minutos, no una hora.
 *
 * Esto es sólo la PRIMERA pintada: apenas carga, el muro toma el mando y
 * repregunta cada 30 s contra `/api/remates/en-vivo/estado`. Lo único que decide
 * este número es qué tan viejo puede ser el HTML que llega antes de que el
 * JavaScript arranque, y en una página que se abre a media tarde eso importa.
 */
export const revalidate = 300

const getTodayStr = hoyArgentina

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

export default async function RematesEnVivoPage() {
  const todayStr = getTodayStr()

  // Todo lo transmisible de hoy en adelante. La cuenta vive en
  // `src/lib/remates-en-vivo.ts` porque el endpoint del muro hace la misma.
  const liveRemates = rematesTransmitibles(todayStr)


  // La pared de HOY, con lo que está efectivamente al aire. Es sólo la primera
  // pintada: desde que carga, el muro se refresca solo contra el endpoint.
  const [pared, repeticiones] = await Promise.all([
    construirPared(todayStr, 900),
    repeticionesRecientes(todayStr, 8),
  ])

  // Qué se pagó en las últimas semanas, al lado del martillo. Es el Valor de
  // Referencia (lotes vendidos en el MAG), no el panel de categorías de
  // market-prices.json, que los días sin rueda era un ratio fijo sobre el INMAG.
  const cobertura = vrCobertura()
  const referencia = {
    bandas: getBandasPublicas()
      .slice(0, 4)
      .map((b) => ({ categoria: b.categoria, p10: b.p10, mediana: b.mediana, p90: b.p90 })),
    desde: cobertura.desde,
    hasta: cobertura.hasta,
  }

  // Las de hoy que todavía no salieron al aire: el muro les pone la cuenta
  // regresiva. Se excluyen las que ya están en la pared para no duplicarlas.
  const yaEnPared = new Set(pared.map((s) => s.id))
  const porVenir = liveRemates
    .filter((r) => r.date === todayStr)
    .filter((r) => !yaEnPared.has(claveStream(r)))
    .filter((r) => getEffectiveStatus(r.date, r.time, todayStr) !== 'completed')
    .map((r) => ({
      id: claveStream(r),
      firma: nombreDeFirma(r),
      hora: r.time,
      perfilHref: consignatariaProfilePath(r.consignatariaSlug),
    }))
    // Una firma con dos remates a la misma hora (Sáenz Valiente tenía dos a las
    // 10:00 el 21-sep) se veía como un botón repetido: para "qué viene" alcanza uno.
    .filter((p, i, todos) => todos.findIndex((q) => q.firma === p.firma && q.hora === p.hora) === i)

  // El listado por fecha queda para los días QUE VIENEN: hoy entero —lo que
  // está al aire y lo que falta— lo maneja el muro, y tenerlo dos veces en la
  // misma pantalla obligaba a mirar cuál de las dos versiones era la buena.
  const byDate = liveRemates.filter((r) => r.date > todayStr).reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {} as Record<string, RemateResuelto[]>)

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

      {/* Encabezado CHICO a propósito. Antes había un hero, un párrafo y una barra de
          cuatro números ("confirmadas", "probables"…) que son categorías nuestras, no
          del usuario: en un teléfono el reproductor quedaba debajo del pliegue, y la
          mediana de permanencia era de 20 segundos. Lo primero que se ve es el remate. */}
      <div className="px-4 pt-4 max-w-5xl mx-auto">
        <nav className="text-xs text-zinc-500 mb-2">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">En Vivo</span>
        </nav>

        {/* Ticker de transcripción del remate en vivo (lo llena el worker off-Vercel).
            Se auto-oculta si no hay sesión activa, así que es seguro montarlo siempre. */}
        <LiveRemateTicker />

        <h1 className="text-xl md:text-2xl font-semibold text-zinc-100">Remates ganaderos en vivo</h1>
        <p className="hidden sm:block text-zinc-500 text-sm mt-1">
          Todas las ferias que se están transmitiendo, juntas, con el teléfono de cada consignataria a un toque.
        </p>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto">
        {/* El muro va SIEMPRE, haya o no remates por venir: cuando nadie transmite
            lo sostienen los remates grabados, y una pantalla con algo para mirar
            retiene más que el cartel de "no hay transmisiones" que había acá. */}
        <MuroEnVivo inicial={pared} porVenir={porVenir} repeticiones={repeticiones} referencia={referencia} />

        {Object.keys(byDate).length > 0 && (
          <div className="space-y-8 mt-10">
            <h2 className="text-zinc-200 text-lg font-medium border-t border-zinc-800 pt-6">
              Próximos días con transmisión
            </h2>

            {/* De acá para abajo, los días que vienen. Hoy no se repite: lo
                muestra el muro, que es el único que sabe qué está al aire. */}
            {Object.entries(byDate).map(([date, dateRemates]) => (
              <section key={date}>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-zinc-300">
                  {formatDate(date)}
                  <span className="text-sm text-zinc-600">({dateRemates.length} transmisiones)</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {dateRemates.map(remate => (
                    <LiveRemateCard
                      key={remate.id}
                      remate={remate}
                      isToday={false}
                      // Un remate de otro día nunca está al aire ahora. El cartel
                      // EN VIVO lo enciende el muro, con un video corriendo.
                      isLive={false}
                      confidence={remate.confidence}
                      watchUrl={remate.watchUrl}
                      anclaStream={null}
                    />
                  ))}
                </div>
              </section>
            ))}
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
