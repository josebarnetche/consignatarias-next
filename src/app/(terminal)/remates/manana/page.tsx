import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { RemateCardSimple } from '@/components/remates/RemateCardSimple'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, MapPin, Bell } from 'lucide-react'

// Regenerate hourly so "mañana" stays fresh (no se sirve la fecha del build)
export const revalidate = 3600

// Get tomorrow's date in Argentina timezone
function getTomorrowStr(): string {
  const now = new Date()
  // Argentina is UTC-3
  const argentinaOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = argentinaOffset - localOffset
  const argentinaTime = new Date(now.getTime() + diff * 60 * 1000)
  // Add one day
  argentinaTime.setDate(argentinaTime.getDate() + 1)
  return argentinaTime.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

export async function generateMetadata(): Promise<Metadata> {
  const tomorrowStr = getTomorrowStr()
  const tomorrowsRemates = (remates as Array<{ date: string; status: string }>).filter(
    r => r.date === tomorrowStr && r.status !== 'completed'
  )
  const count = tomorrowsRemates.length
  const formattedDate = formatDate(tomorrowStr)

  return {
    title: `Remates Ganaderos Mañana ${formattedDate} | ${count} Subastas`,
    description: `${count} remates de ganado programados para mañana ${formattedDate}. Planificá tu participación en subastas ganaderas en Argentina: invernada, cría, reproductores.`,
    keywords: [
      'remates ganaderos mañana',
      'remates de hacienda mañana',
      'remates de ganado mañana',
      'subastas ganaderas mañana',
      'remates bovinos mañana',
      'feria ganadera mañana',
      'remates argentina mañana',
      'próximos remates ganado',
    ],
    openGraph: {
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
      title: `Remates Ganaderos Mañana — ${count} Subastas`,
      description: `${count} remates de ganado programados para mañana. Ver calendario completo con horarios, ubicaciones y links.`,
      url: 'https://www.consignatarias.com.ar/remates/manana',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates/manana',
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
  return <RemateCardSimple remate={remate} etiquetaVivo="Ver mañana" />
}

export default function RemanaManaPage() {
  const tomorrowStr = getTomorrowStr()
  const formattedDate = formatDate(tomorrowStr)

  const tomorrowsRemates = (remates as Remate[])
    .filter(r => r.date === tomorrowStr && r.status !== 'completed')
    .sort((a, b) => {
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

  const count = tomorrowsRemates.length

  // Group by province
  const byProvince = tomorrowsRemates.reduce((acc, r) => {
    const prov = r.province || 'Sin provincia'
    if (!acc[prov]) acc[prov] = []
    acc[prov].push(r)
    return acc
  }, {} as Record<string, Remate[]>)

  // Schema data
  // Cada Event con la URL de SU ficha (/remates/[slug]) y el perfil de la firma como
  // organizer.url — antes todos apuntaban al perfil. La regla vive en buildRemateEvent.
  const schemaRemates = tomorrowsRemates.slice(0, 10)

  return (
    <>
      <SectionBreadcrumbSchema section="remates/manana" sectionName="Remates Mañana" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} name="Remates ganaderos de mañana en Argentina" />}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/remates" className="hover:text-zinc-300">Remates</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">Mañana</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
            Remates Ganaderos Mañana
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
              <p className="text-lg">No hay remates programados para mañana</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/remates/hoy"
                className="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-accent text-sm font-medium rounded hover:bg-sky-500/20 transition-colors"
              >
                Ver remates de hoy
              </Link>
              <Link
                href="/remates"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
              >
                Ver todos los remates
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Alert CTA */}
            <div className="mb-6 p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center gap-3">
              <Bell className="w-5 h-5 text-sky-400 shrink-0" />
              <p className="text-sm text-zinc-300">
                ¿Querés recibir recordatorios de estos remates?{' '}
                <Link href="/planes" className="text-sky-400 hover:underline">
                  Activá alertas con PRO
                </Link>
              </p>
            </div>

            {/* Summary by type */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(
                tomorrowsRemates.reduce((acc, r) => {
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
            Planificá tu Participación
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3">
            <p>
              Esta página muestra todos los <strong className="text-zinc-200">remates ganaderos programados para mañana</strong> en 
              Argentina. Revisá los catálogos disponibles y planificá tu participación con anticipación.
            </p>
            <p>
              Los remates de hacienda incluyen subastas de <strong className="text-zinc-200">invernada</strong> (terneros, 
              novillitos y vaquillonas para engorde), <strong className="text-zinc-200">cría</strong> (vientres, vacas preñadas 
              y reproductores), y <strong className="text-zinc-200">especiales</strong> (genética premium, pedigree).
            </p>
            <p>
              Descargá los catálogos y preparate para participar en vivo por YouTube o en las plataformas propias de cada consignataria.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/remates/hoy"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Ver remates de hoy →
          </Link>
          <Link
            href="/remates"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Ver todos los remates →
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
