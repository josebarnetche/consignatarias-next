import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, Clock, MapPin, Users, ExternalLink, Play, FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui'

// Regenerate hourly for fresh TODAY
export const revalidate = 3600

// Get Argentina timezone date
function getArgentinaDate(): Date {
  const now = new Date()
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  return new Date(now.getTime() + diff * 60 * 1000)
}

// Get next Saturday and Sunday dates
function getWeekendDates(): { saturday: string; sunday: string } {
  const argentinaTime = getArgentinaDate()
  const dayOfWeek = argentinaTime.getDay()
  
  // Calculate days until next Saturday (6) and Sunday (0)
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7
  if (daysUntilSaturday === 0 && dayOfWeek === 6) {
    // Today is Saturday, use today
    daysUntilSaturday = 0
  }
  
  const saturday = new Date(argentinaTime)
  saturday.setDate(argentinaTime.getDate() + daysUntilSaturday)
  
  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  
  return {
    saturday: saturday.toISOString().split('T')[0],
    sunday: sunday.toISOString().split('T')[0],
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Dom', 'Sáb']
  const dayIndex = date.getDay() === 0 ? 0 : 1
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${days[dayIndex]} ${date.getDate()} ${months[date.getMonth()]}`
}

export async function generateMetadata(): Promise<Metadata> {
  const { saturday, sunday } = getWeekendDates()
  const weekendRemates = (remates as Array<{ date: string; status: string }>).filter(
    r => (r.date === saturday || r.date === sunday) && r.status !== 'completed'
  )
  const count = weekendRemates.length

  return {
    title: `Remates Fin de Semana — ${count} Subastas Ganaderas | Sábado y Domingo`,
    description: `${count} remates de ganado este fin de semana en Argentina. ${formatDate(saturday)} y ${formatDate(sunday)}. Subastas de invernada, cría, reproductores. Ver horarios y ubicaciones.`,
    keywords: [
      'remates fin de semana',
      'remates ganaderos sabado',
      'remates ganado domingo',
      'subastas ganaderas fin de semana',
      'remates bovinos sabado',
      'feria ganadera domingo',
      'remates hacienda fin de semana',
      'venta ganado sabado domingo',
    ],
    openGraph: {
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
      title: `Remates Fin de Semana — ${count} Subastas`,
      description: `${count} remates de ganado este sábado y domingo. Ver calendario con horarios, ubicaciones y transmisiones en vivo.`,
      url: 'https://www.consignatarias.com.ar/remates/fin-de-semana',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/fin-de-semana',
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

function RemateCard({ remate }: { remate: Remate }) {
  const typeColors: Record<string, string> = {
    invernada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cria: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    especial: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    reproductores: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }

  const typeColor = typeColors[remate.type?.toLowerCase()] || typeColors.general

  return (
    <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
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
        <div className="flex items-center gap-1.5 text-accent/80">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{formatDateShort(remate.date)}</span>
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

      {/* Description */}
      {remate.description && (
        <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
          {remate.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
        {remate.youtubeUrl && (
          <a
            href={normalizeUrl(remate.youtubeUrl) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 transition-colors"
          >
            <Play className="w-3 h-3" />
            Ver en vivo
          </a>
        )}
        {remate.catalogUrl && (
          <a
            href={normalizeUrl(remate.catalogUrl) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Catálogo
          </a>
        )}
        {remate.sourceUrl && (
          <a
            href={normalizeUrl(remate.sourceUrl) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Más info
          </a>
        )}
        <Link
          href={consignatariaProfilePath(remate.consignatariaSlug)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
        >
          Ver consignataria →
        </Link>
      </div>
    </article>
  )
}

export default function RematesFinDeSemanaPage() {
  const { saturday, sunday } = getWeekendDates()

  const weekendRemates = (remates as Remate[])
    .filter(r => (r.date === saturday || r.date === sunday) && r.status !== 'completed')
    .sort((a, b) => {
      // Sort by date first (Saturday before Sunday), then by time
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

  const count = weekendRemates.length

  // Split by day
  const saturdayRemates = weekendRemates.filter(r => r.date === saturday)
  const sundayRemates = weekendRemates.filter(r => r.date === sunday)

  // Stats
  const totalHeads = weekendRemates.reduce((sum, r) => sum + (r.estimatedHeads || 0), 0)
  const provinces = [...new Set(weekendRemates.map(r => r.province))]
  const types = weekendRemates.reduce((acc, r) => {
    const type = r.type || 'General'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Schema data
  const schemaRemates = weekendRemates.slice(0, 10).map(r => ({
    id: r.id,
    name: `Remate ${r.type} - ${r.consignatariaName}`,
    date: r.date,
    time: r.time || undefined,
    location: r.location,
    province: r.province,
    consignatariaName: r.consignatariaName,
    type: r.type,
    estimatedHeads: r.estimatedHeads || undefined,
    url: `https://www.consignatarias.com.ar/consignatarias/${getCanonicalSlug(r.consignatariaSlug) ?? r.consignatariaSlug}`,
  }))

  return (
    <>
      <SectionBreadcrumbSchema section="remates/fin-de-semana" sectionName="Remates Fin de Semana" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} />}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span>/</span>
            <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
            <span>/</span>
            <span className="text-zinc-300">Fin de Semana</span>
          </nav>

          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Remates Fin de Semana
          </h1>
          <p className="text-zinc-400">
            {formatDate(saturday)} y {formatDate(sunday)}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-accent">{count}</div>
            <div className="text-xs text-zinc-500">Remates</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-zinc-100">
              {totalHeads > 0 ? `~${(totalHeads / 1000).toFixed(0)}K` : '-'}
            </div>
            <div className="text-xs text-zinc-500">Cabezas est.</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-zinc-100">{provinces.length}</div>
            <div className="text-xs text-zinc-500">Provincias</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="flex flex-wrap gap-1">
              {Object.entries(types).slice(0, 3).map(([type, n]) => (
                <span key={type} className="text-xs text-zinc-400">
                  {type}: {n}
                </span>
              ))}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Por tipo</div>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mb-6 text-sm">
          <Link
            href="/remates/hoy"
            className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Hoy
          </Link>
          <Link
            href="/remates/manana"
            className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Mañana
          </Link>
          <Link
            href="/remates/semana"
            className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Esta semana
          </Link>
          <span className="px-3 py-1.5 bg-sky-500/20 text-accent border border-sky-500/30 rounded">
            Fin de semana
          </span>
        </div>

        {/* Remates list */}
        {count === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <EmptyState
              icon="calendario"
              title="No hay remates programados"
              sub="No encontramos subastas para este fin de semana. Los remates suelen anunciarse con poca anticipación."
              cta={
                <Link
                  href="/remates/semana"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-accent border border-sky-500/30 rounded hover:bg-sky-500/30 transition-colors"
                >
                  Ver remates de la semana
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Saturday */}
            {saturdayRemates.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Sábado {new Date(saturday + 'T12:00:00').getDate()} — {saturdayRemates.length} remate{saturdayRemates.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {saturdayRemates.map((remate) => (
                    <RemateCard key={remate.id} remate={remate} />
                  ))}
                </div>
              </section>
            )}

            {/* Sunday */}
            {sundayRemates.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Domingo {new Date(sunday + 'T12:00:00').getDate()} — {sundayRemates.length} remate{sundayRemates.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {sundayRemates.map((remate) => (
                    <RemateCard key={remate.id} remate={remate} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* SEO content */}
        <div className="mt-10 pt-6 border-t border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Remates ganaderos de fin de semana en Argentina
          </h2>
          <div className="prose prose-sm prose-invert prose-zinc">
            <p className="text-zinc-400">
              Los fines de semana son fechas populares para los remates ganaderos en Argentina.
              Muchos productores aprovechan el sábado y domingo para asistir a subastas de invernada,
              cría y reproductores en las principales provincias ganaderas.
            </p>
            <p className="text-zinc-400 mt-2">
              En esta página encontrás todos los remates programados para el próximo fin de semana,
              con horarios, ubicaciones y enlaces a transmisiones en vivo cuando están disponibles.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
