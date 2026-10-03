import { Metadata } from 'next'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { RemateCardSimple } from '@/components/remates/RemateCardSimple'
import { SectionBreadcrumbSchema, RematesListSchema } from '@/components/seo/JsonLd'
import { Calendar, MapPin } from 'lucide-react'
import DteCtaClient from './DteCtaClient'

// Regenerate hourly for fresh TODAY
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
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
      title: `Remates Ganaderos Hoy — ${count} Subastas`,
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
  return <RemateCardSimple remate={remate} />
}

export default async function RematesHoyPage() {
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
  // Cada Event con la URL de SU ficha (/remates/[slug]) y el perfil de la firma como
  // organizer.url — antes todos apuntaban al perfil. La regla vive en buildRemateEvent.
  const schemaRemates = todaysRemates.slice(0, 10)

  return (
    <>
      <SectionBreadcrumbSchema section="remates/hoy" sectionName="Remates Hoy" />
      {schemaRemates.length > 0 && <RematesListSchema remates={schemaRemates} name="Remates ganaderos de hoy en Argentina" />}

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
                className="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-accent text-sm font-medium rounded hover:bg-sky-500/20 transition-colors"
              >
                Ver próximos remates
              </Link>
              <Link
                href="/remates/semana"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
              >
                Ver los remates de esta semana
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

        {/* DT-e CTA for logged-in participants (client-side auth check) */}
        {count > 0 && <DteCtaClient />}

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
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Ver todos los remates →
          </Link>
          <Link
            href="/calendario-exportar"
            className="text-sm text-accent/80 hover:text-accent-bright transition-colors"
          >
            Sumar los remates a tu calendario →
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
