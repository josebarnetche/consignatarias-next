import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, Clock, MapPin, Users, ExternalLink, Play, FileText } from 'lucide-react'

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

export async function generateMetadata(): Promise<Metadata> {
  const todayStr = getTodayStr()
  const todaysRemates = (remates as Array<{ date: string; status: string }>).filter(
    r => r.date === todayStr && r.status !== 'completed'
  )
  const count = todaysRemates.length
  const formattedDate = formatDate(todayStr)

  return {
    title: `Remates Ganaderos Hoy ${formattedDate} | ${count} Subastas`,
    description: `${count} remates de ganado programados para hoy ${formattedDate}. Calendario actualizado de subastas ganaderas en Argentina: invernada, cría, reproductores. Ver horarios y ubicaciones.`,
    keywords: [
      'remates ganaderos hoy',
      'remates de hacienda hoy',
      'remates de ganado hoy',
      'subastas ganaderas hoy',
      'remates bovinos hoy',
      'feria ganadera hoy',
      'remates argentina hoy',
      'venta ganado hoy',
    ],
    openGraph: {
      title: `Remates Ganaderos Hoy — ${count} Subastas | Consignatarias.com.ar`,
      description: `${count} remates de ganado programados para hoy. Ver calendario completo con horarios, ubicaciones y links de transmisión.`,
      url: 'https://www.consignatarias.com.ar/remates/hoy',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/hoy',
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
        {remate.mainCategory && (
          <span className="text-zinc-500">• {remate.mainCategory}</span>
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

export default function RematesHoyPage() {
  const todayStr = getTodayStr()
  const formattedDate = formatDate(todayStr)

  const todaysRemates = (remates as Remate[])
    .filter(r => r.date === todayStr && r.status !== 'completed')
    .sort((a, b) => {
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

  const count = todaysRemates.length

  // Group by province
  const byProvince = todaysRemates.reduce((acc, r) => {
    const prov = r.province || 'Sin provincia'
    if (!acc[prov]) acc[prov] = []
    acc[prov].push(r)
    return acc
  }, {} as Record<string, Remate[]>)

  // Schema data
  const schemaRemates = todaysRemates.slice(0, 10).map(r => ({
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
      <SectionBreadcrumbSchema section="remates/hoy" sectionName="Remates Hoy" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} />}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">Hoy</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
            Remates Ganaderos Hoy
          </h1>
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
            <span className="text-zinc-600">•</span>
            <span className={count > 0 ? 'text-emerald-400' : 'text-zinc-500'}>
              {count} {count === 1 ? 'remate' : 'remates'} programados
            </span>
          </div>
        </div>

        {/* Content */}
        {count === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="text-zinc-500 mb-4">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay remates programados para hoy</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/remates"
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium rounded hover:bg-amber-500/20 transition-colors"
              >
                Ver próximos remates
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
          <>
            {/* Summary by type */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(
                todaysRemates.reduce((acc, r) => {
                  const type = r.type || 'General'
                  acc[type] = (acc[type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([type, cnt]) => (
                <span
                  key={type}
                  className="px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded-full"
                >
                  {type}: {cnt}
                </span>
              ))}
            </div>

            {/* Remates list grouped by province */}
            <div className="space-y-8">
              {Object.entries(byProvince)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([province, provinceRemates]) => (
                  <section key={province}>
                    <h2 className="text-lg font-medium text-zinc-300 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-500" />
                      {province}
                      <span className="text-sm text-zinc-600">({provinceRemates.length})</span>
                    </h2>
                    <div className="space-y-3">
                      {provinceRemates.map(remate => (
                        <RemateCard key={remate.id} remate={remate} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </>
        )}

        {/* SEO Content */}
        <section className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Remates de Ganado en Argentina
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3">
            <p>
              Esta página muestra todos los <strong className="text-zinc-200">remates ganaderos programados para hoy</strong> en 
              Argentina. El calendario se actualiza automáticamente con datos de las principales consignatarias del país.
            </p>
            <p>
              Los remates de hacienda incluyen subastas de <strong className="text-zinc-200">invernada</strong> (terneros, 
              novillitos y vaquillonas para engorde), <strong className="text-zinc-200">cría</strong> (vientres, vacas preñadas 
              y reproductores), y <strong className="text-zinc-200">especiales</strong> (genética premium, pedigree).
            </p>
            <p>
              Muchos remates ofrecen transmisión en vivo por YouTube o plataformas propias, permitiendo participar de forma 
              remota. Consultá los links de cada remate para más información.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/remates"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Ver todos los remates →
          </Link>
          <Link
            href="/calendario"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Calendario mensual →
          </Link>
          <Link
            href="/mercado"
            className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
          >
            Precios del mercado →
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
