import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { consignatariaProfilePath, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, History } from 'lucide-react'
import { rematePath } from '@/lib/remate-slug'

// Regenerate hourly for fresh TODAY
export const revalidate = false // Cost optimization: static at build time

// Get today's date in Argentina timezone
function getTodayStr(): string {
  const now = new Date()
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  return argentinaTime.toISOString().split('T')[0]
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

// Get last 30 days date
function getLast30DaysStr(): string {
  const now = new Date()
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  argentinaTime.setDate(argentinaTime.getDate() - 30)
  return argentinaTime.toISOString().split('T')[0]
}

export async function generateMetadata(): Promise<Metadata> {
  const todayStr = getTodayStr()
  const thirtyDaysAgo = getLast30DaysStr()
  
  const completedRemates = (remates as Array<{ date: string; status: string }>).filter(
    r => r.date < todayStr && r.date >= thirtyDaysAgo
  )
  const count = completedRemates.length

  return {
    title: `Remates Anteriores — ${count} Subastas Completadas | Argentina`,
    description: `Historial de ${count} remates ganaderos completados en los últimos 30 días. Consultá qué consignatarias remataron, categorías ofertadas y ubicaciones. Datos actualizados diariamente.`,
    keywords: [
      'remates anteriores',
      'remates pasados',
      'remates completados',
      'historial remates ganaderos',
      'resultados remate ganado',
      'remates realizados',
      'ferias ganaderas pasadas',
      'remates terminados',
    ],
    openGraph: {
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
      title: `Remates Anteriores — ${count} Subastas Completadas`,
      description: `Historial de remates ganaderos completados. Consultá las últimas subastas realizadas en Argentina.`,
      url: 'https://www.consignatarias.com.ar/remates/anteriores',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/anteriores',
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

// Fila liviana en vez de tarjeta: con ~220 remates por mes, cada tarjeta (cinco íconos
// SVG, descripción, dos enlaces) viajaba dos veces —HTML y payload RSC— y la página
// llegaba a 1,6 MB. El enlace principal va a la ficha del remate; el perfil queda al lado.
function RemateFila({ remate }: { remate: Remate }) {
  const detalle = [
    `${remate.location}, ${remate.province}`,
    remate.time ? `${remate.time} hs` : null,
    remate.estimatedHeads ? `~${remate.estimatedHeads.toLocaleString('es-AR')} cabezas` : null,
    remate.mainCategory || null,
  ].filter(Boolean).join(' · ')
  return (
    <li className="py-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <div className="min-w-0">
        <Link href={rematePath(remate)} className="text-zinc-200 hover:text-accent transition-colors font-medium">
          {remate.consignatariaName} — remate {remate.type ? remate.type.toLowerCase() : 'general'}
        </Link>
        <p className="text-xs text-zinc-500">{detalle}</p>
      </div>
      <Link
        href={consignatariaProfilePath(remate.consignatariaSlug)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
      >
        Perfil de la firma →
      </Link>
    </li>
  )
}

export default function RematesAnterioresPage() {
  const todayStr = getTodayStr()
  const thirtyDaysAgo = getLast30DaysStr()

  const completedRemates = (remates as Remate[])
    .filter(r => r.date < todayStr && r.date >= thirtyDaysAgo)
    .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first

  const count = completedRemates.length

  // Group by date
  const byDate = completedRemates.reduce((acc, r) => {
    const date = r.date
    if (!acc[date]) acc[date] = []
    acc[date].push(r)
    return acc
  }, {} as Record<string, Remate[]>)

  // Stats for the period
  const uniqueConsignatarias = new Set(completedRemates.map(r => r.consignatariaSlug)).size
  const uniqueProvinces = new Set(completedRemates.map(r => r.province)).size
  const totalHeads = completedRemates.reduce((sum, r) => sum + (r.estimatedHeads || 0), 0)

  // Type distribution
  const byType = completedRemates.reduce((acc, r) => {
    const type = r.type || 'General'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Schema data - only include top 10 for structured data
  const schemaRemates = completedRemates.slice(0, 10).map(r => ({
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
      <SectionBreadcrumbSchema section="remates/anteriores" sectionName="Remates Anteriores" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} />}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">Anteriores</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-zinc-500" />
            <h1 className="text-2xl font-semibold text-zinc-100">
              Remates Anteriores
            </h1>
          </div>
          <p className="text-zinc-400">
            Historial de remates completados en los últimos 30 días
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-zinc-100">{count}</div>
            <div className="text-xs text-zinc-500 mt-1">Remates</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-zinc-100">{uniqueConsignatarias}</div>
            <div className="text-xs text-zinc-500 mt-1">Consignatarias</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-zinc-100">{uniqueProvinces}</div>
            <div className="text-xs text-zinc-500 mt-1">Provincias</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-zinc-100">
              {totalHeads > 1000 ? `${(totalHeads / 1000).toFixed(0)}k` : totalHeads}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Cabezas est.</div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, cnt]) => (
              <span
                key={type}
                className="px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded-full"
              >
                {type}: {cnt}
              </span>
            ))}
        </div>

        {/* Content */}
        {count === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="text-zinc-500 mb-4">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay remates registrados en los últimos 30 días</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/remates"
                className="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-accent text-sm font-medium rounded hover:bg-sky-500/20 transition-colors"
              >
                Ver próximos remates
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateRemates]) => (
                <section key={date}>
                  <h2 className="text-base font-medium text-zinc-300 mb-3 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur-sm py-2 -mx-2 px-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    {formatDateLong(date)}
                    <span className="text-sm text-zinc-600">({dateRemates.length})</span>
                  </h2>
                  <ul className="divide-y divide-zinc-800">
                    {dateRemates.map(remate => (
                      <RemateFila key={remate.id} remate={remate} />
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {/* SEO Content */}
        <section className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Historial de Remates Ganaderos
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3">
            <p>
              Esta página muestra el <strong className="text-zinc-200">historial de remates ganaderos completados</strong> en 
              Argentina durante los últimos 30 días. Consultá qué consignatarias realizaron subastas, 
              en qué ubicaciones y qué tipos de hacienda ofertaron.
            </p>
            <p>
              El registro de remates anteriores te permite analizar la <strong className="text-zinc-200">actividad del mercado</strong>, 
              identificar consignatarias activas en tu zona y seguir el ritmo de operaciones del sector ganadero.
            </p>
            <p>
              Para ver los próximos remates programados, visitá el <Link href="/remates" className="text-accent hover:text-accent-bright">calendario de remates</Link> o 
              las páginas de <Link href="/remates/hoy" className="text-accent hover:text-accent-bright">remates hoy</Link> y{' '}
              <Link href="/remates/semana" className="text-accent hover:text-accent-bright">remates esta semana</Link>.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/remates"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            ← Ver próximos remates
          </Link>
          <Link
            href="/consignatarias"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Directorio de consignatarias →
          </Link>
          <Link
            href="/mercado"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
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
