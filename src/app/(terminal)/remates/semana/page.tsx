import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, Clock, MapPin, Users, ExternalLink, Play, FileText, TrendingUp } from 'lucide-react'

// Get today's date in Argentina timezone
function getTodayStr(): string {
  const now = new Date()
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  return argentinaTime.toISOString().split('T')[0]
}

function getWeekEndStr(): string {
  const now = new Date()
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  argentinaTime.setDate(argentinaTime.getDate() + 6)
  return argentinaTime.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

export async function generateMetadata(): Promise<Metadata> {
  const todayStr = getTodayStr()
  const weekEndStr = getWeekEndStr()
  const weekRemates = (remates as Array<{ date: string; status: string }>).filter(
    r => r.date >= todayStr && r.date <= weekEndStr && r.status !== 'completed'
  )
  const count = weekRemates.length

  return {
    title: `Remates Esta Semana — ${count} Subastas Ganaderas Argentina`,
    description: `${count} remates de ganado programados para esta semana en Argentina. Calendario de subastas ganaderas del ${formatDateLong(todayStr)} al ${formatDateLong(weekEndStr)}. Invernada, cría, reproductores.`,
    keywords: [
      'remates esta semana',
      'proximos remates ganaderos',
      'remates de ganado semana',
      'subastas ganaderas proximas',
      'remates bovinos argentina',
      'proximas ferias ganaderas',
      'calendario remates semana',
      'venta ganado esta semana',
    ],
    openGraph: {
      title: `Remates Esta Semana — ${count} Subastas | Consignatarias.com.ar`,
      description: `${count} remates de ganado programados para los próximos 7 días. Ver calendario con horarios, ubicaciones y transmisiones.`,
      url: 'https://www.consignatarias.com.ar/remates/semana',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/semana',
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
            href={`/consignatarias/${remate.consignatariaSlug}`}
            className="text-lg font-medium text-zinc-100 hover:text-amber-400 transition-colors line-clamp-1"
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
        <div className="flex items-center gap-1.5 text-amber-400/80">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{formatDate(remate.date)}</span>
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
            href={remate.youtubeUrl}
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
            href={remate.catalogUrl}
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
            href={remate.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Más info
          </a>
        )}
        <Link
          href={`/consignatarias/${remate.consignatariaSlug}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
        >
          Ver consignataria →
        </Link>
      </div>
    </article>
  )
}

export default function RematesSemanaPage() {
  const todayStr = getTodayStr()
  const weekEndStr = getWeekEndStr()

  const weekRemates = (remates as Remate[])
    .filter(r => r.date >= todayStr && r.date <= weekEndStr && r.status !== 'completed')
    .sort((a, b) => {
      // Sort by date first, then by time
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

  const count = weekRemates.length

  // Group by date
  const byDate = weekRemates.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {} as Record<string, Remate[]>)

  // Stats
  const totalHeads = weekRemates.reduce((sum, r) => sum + (r.estimatedHeads || 0), 0)
  const provinces = [...new Set(weekRemates.map(r => r.province))]
  const types = weekRemates.reduce((acc, r) => {
    const type = r.type || 'General'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Schema data
  const schemaRemates = weekRemates.slice(0, 10).map(r => ({
    id: r.id,
    name: `Remate ${r.type} - ${r.consignatariaName}`,
    date: r.date,
    time: r.time || undefined,
    location: r.location,
    province: r.province,
    consignatariaName: r.consignatariaName,
    type: r.type,
    estimatedHeads: r.estimatedHeads || undefined,
    url: `https://www.consignatarias.com.ar/consignatarias/${r.consignatariaSlug}`,
  }))

  return (
    <>
      <SectionBreadcrumbSchema section="remates/semana" sectionName="Remates Esta Semana" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} />}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">Esta Semana</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
            Remates Esta Semana
          </h1>
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDateLong(todayStr)} — {formatDateLong(weekEndStr)}</span>
          </div>
        </div>

        {/* Stats summary */}
        {count > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{count}</div>
              <div className="text-xs text-zinc-500">Remates</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-200">
                {totalHeads > 0 ? `~${(totalHeads / 1000).toFixed(0)}k` : '-'}
              </div>
              <div className="text-xs text-zinc-500">Cabezas</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-200">{provinces.length}</div>
              <div className="text-xs text-zinc-500">Provincias</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-200">{Object.keys(byDate).length}</div>
              <div className="text-xs text-zinc-500">Días con remates</div>
            </div>
          </div>
        )}

        {/* Type breakdown */}
        {count > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(types).map(([type, cnt]) => (
              <span
                key={type}
                className="px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded-full"
              >
                {type}: {cnt}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {count === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="text-zinc-500 mb-4">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay remates programados para esta semana</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/remates"
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium rounded hover:bg-amber-500/20 transition-colors"
              >
                Ver todos los remates
              </Link>
              <Link
                href="/calendario"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
              >
                Ver calendario completo
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateRemates]) => (
                <section key={date}>
                  <h2 className="text-lg font-medium text-zinc-300 mb-3 flex items-center gap-2 sticky top-0 bg-zinc-950/90 py-2 z-10">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    {formatDate(date)}
                    <span className="text-sm text-zinc-600">({dateRemates.length})</span>
                    {date === todayStr && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">HOY</span>
                    )}
                  </h2>
                  <div className="space-y-3">
                    {dateRemates.map(remate => (
                      <RemateCard key={remate.id} remate={remate} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t border-zinc-800">
          <Link
            href="/remates/hoy"
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded hover:bg-zinc-700 transition-colors"
          >
            Remates Hoy
          </Link>
          <Link
            href="/remates/manana"
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded hover:bg-zinc-700 transition-colors"
          >
            Remates Mañana
          </Link>
          <Link
            href="/remates"
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded hover:bg-amber-500/20 transition-colors"
          >
            Calendario Completo
          </Link>
        </div>

        {/* SEO Content */}
        <section className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Próximos Remates Ganaderos en Argentina
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3">
            <p>
              Esta página muestra todos los <strong className="text-zinc-200">remates de ganado programados para los próximos 7 días</strong> en 
              Argentina. El calendario se actualiza automáticamente con información de las principales consignatarias del país.
            </p>
            <p>
              Los <strong className="text-zinc-200">remates de esta semana</strong> incluyen subastas de invernada (terneros y novillitos para engorde),
              cría (vientres, vacas preñadas y reproductores), y remates especiales de genética premium.
            </p>
            <p>
              Podés filtrar por provincia, tipo de remate o consignataria en nuestro{' '}
              <Link href="/remates" className="text-amber-400 hover:underline">calendario principal de remates</Link>.
              Muchos remates ofrecen transmisión en vivo por YouTube o plataformas propias.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/mercado"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Precios del mercado →
          </Link>
          <Link
            href="/consignatarias"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Directorio de consignatarias →
          </Link>
          <Link
            href="/reporte-semanal"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Descargar reporte semanal →
          </Link>
        </div>

        {/* Last update */}
        <p className="text-xs text-zinc-600 mt-6">
          Datos actualizados automáticamente. Última verificación: {new Date().toLocaleString('es-AR', { 
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit'
          })} (Argentina).
        </p>
      </div>
    </>
  )
}
