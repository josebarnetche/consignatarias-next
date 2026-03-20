import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import remates from '@/lib/data/remates.json'
import { SectionBreadcrumbSchema, RematesListSchema, BreadcrumbSchema } from '@/components/seo/JsonLd'
import { Calendar, MapPin, Building2, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import AuctionCard from '@/components/remates/auction-card'
import type { Auction } from '@/lib/db/schema'

const auctions = remates as Auction[]

/* ================================================================== */
/*  MONTH CONFIG                                                       */
/* ================================================================== */

const MONTHS: Record<string, { name: string; number: number }> = {
  enero: { name: 'Enero', number: 1 },
  febrero: { name: 'Febrero', number: 2 },
  marzo: { name: 'Marzo', number: 3 },
  abril: { name: 'Abril', number: 4 },
  mayo: { name: 'Mayo', number: 5 },
  junio: { name: 'Junio', number: 6 },
  julio: { name: 'Julio', number: 7 },
  agosto: { name: 'Agosto', number: 8 },
  septiembre: { name: 'Septiembre', number: 9 },
  octubre: { name: 'Octubre', number: 10 },
  noviembre: { name: 'Noviembre', number: 11 },
  diciembre: { name: 'Diciembre', number: 12 },
}

const MONTH_SLUGS = Object.keys(MONTHS)

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

function getAuctionsForMonth(monthSlug: string, year?: number): Auction[] {
  const monthConfig = MONTHS[monthSlug]
  if (!monthConfig) return []

  const targetYear = year || getCurrentYear()
  const monthNum = monthConfig.number.toString().padStart(2, '0')
  const prefix = `${targetYear}-${monthNum}`

  return auctions
    .filter(a => a.date.startsWith(prefix) && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
}

function getMonthStats(auctionList: Auction[]) {
  const totalHeads = auctionList.reduce((sum, a) => sum + (a.estimatedHeads || 0), 0)
  const provinces = new Set(auctionList.map(a => a.province))
  const consignatarias = new Set(auctionList.map(a => a.consignatariaSlug))
  const types = new Set(auctionList.map(a => a.type))

  return {
    count: auctionList.length,
    totalHeads,
    provinces: provinces.size,
    consignatarias: consignatarias.size,
    types: types.size,
  }
}

function getAdjacentMonths(monthSlug: string): { prev: string | null; next: string | null } {
  const index = MONTH_SLUGS.indexOf(monthSlug)
  return {
    prev: index > 0 ? MONTH_SLUGS[index - 1] : MONTH_SLUGS[11],
    next: index < 11 ? MONTH_SLUGS[index + 1] : MONTH_SLUGS[0],
  }
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

/* ================================================================== */
/*  STATIC PARAMS                                                      */
/* ================================================================== */

export async function generateStaticParams() {
  return MONTH_SLUGS.map(mes => ({ mes }))
}

/* ================================================================== */
/*  METADATA                                                           */
/* ================================================================== */

export async function generateMetadata({ params }: { params: Promise<{ mes: string }> }): Promise<Metadata> {
  const { mes } = await params
  const monthConfig = MONTHS[mes]

  if (!monthConfig) {
    return { title: 'Mes no encontrado' }
  }

  const year = getCurrentYear()
  const auctionList = getAuctionsForMonth(mes, year)
  const stats = getMonthStats(auctionList)

  const title = `Remates Ganaderos ${monthConfig.name} ${year} | ${stats.count} Subastas Programadas`
  const description = `Calendario de ${stats.count} remates ganaderos en ${monthConfig.name} ${year}. ${stats.totalHeads > 0 ? `${fmt(stats.totalHeads)} cabezas estimadas. ` : ''}Invernada, cría, reproductores en ${stats.provinces} provincias argentinas.`

  return {
    title,
    description,
    keywords: [
      `remates ${mes} ${year}`,
      `remates ganaderos ${mes}`,
      `remates de ganado ${mes} ${year}`,
      `subastas ganaderas ${mes}`,
      `ferias ganaderas ${mes} ${year}`,
      `calendario remates ${mes}`,
      `remates invernada ${mes}`,
      `remates cria ${mes}`,
    ],
    openGraph: {
      title: `Remates Ganaderos ${monthConfig.name} ${year} — ${stats.count} Subastas`,
      description,
      url: `https://www.consignatarias.com.ar/remates/mes/${mes}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/mes/${mes}`,
    },
  }
}

/* ================================================================== */
/*  PAGE COMPONENT                                                     */
/* ================================================================== */

export default async function MonthRematesPage({ params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params
  const monthConfig = MONTHS[mes]

  if (!monthConfig) {
    notFound()
  }

  const year = getCurrentYear()
  const currentMonth = getCurrentMonth()
  const auctionList = getAuctionsForMonth(mes, year)
  const stats = getMonthStats(auctionList)
  const { prev, next } = getAdjacentMonths(mes)

  // Group auctions by week
  const weekGroups: Record<string, Auction[]> = {}
  for (const auction of auctionList) {
    const date = new Date(auction.date + 'T12:00:00')
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().slice(0, 10)
    if (!weekGroups[weekKey]) weekGroups[weekKey] = []
    weekGroups[weekKey].push(auction)
  }

  const isCurrentMonth = monthConfig.number === currentMonth
  const isPastMonth = monthConfig.number < currentMonth

  // Prepare schema data
  const schemaRemates = auctionList.slice(0, 20).map(r => ({
    id: r.id,
    name: `Remate ${r.type} - ${r.consignatariaName}`,
    date: r.date,
    time: r.time || undefined,
    location: r.location || r.province,
    province: r.province,
    consignatariaName: r.consignatariaName || 'Consignataria',
    type: r.type || 'General',
    estimatedHeads: r.estimatedHeads || undefined,
  }))

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Schema */}
      <BreadcrumbSchema items={[
        { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
        { name: 'Remates', url: 'https://www.consignatarias.com.ar/remates' },
        { name: `${monthConfig.name} ${year}`, url: `https://www.consignatarias.com.ar/remates/mes/${mes}` },
      ]} />
      {auctionList.length > 0 && <RematesListSchema remates={schemaRemates} />}

      {/* Hero */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/remates" className="hover:text-white transition-colors">Remates</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-zinc-300">{monthConfig.name} {year}</span>
          </nav>

          {/* Month Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/remates/mes/${prev}`}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {MONTHS[prev!].name}
            </Link>
            <Link
              href={`/remates/mes/${next}`}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {MONTHS[next!].name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Remates Ganaderos en {monthConfig.name} {year}
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mb-8">
            {isPastMonth ? (
              `Calendario histórico de remates ganaderos de ${monthConfig.name} ${year}.`
            ) : isCurrentMonth ? (
              `${stats.count} remates programados este mes. Calendario actualizado de subastas ganaderas en Argentina.`
            ) : (
              `${stats.count} remates programados para ${monthConfig.name}. Planificá tu participación en las principales ferias ganaderas.`
            )}
          </p>

          {/* Stats */}
          {stats.count > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.count}</div>
                <div className="text-sm text-zinc-500">Remates</div>
              </div>
              {stats.totalHeads > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-emerald-400">{fmt(stats.totalHeads)}</div>
                  <div className="text-sm text-zinc-500">Cabezas est.</div>
                </div>
              )}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.provinces}</div>
                <div className="text-sm text-zinc-500">Provincias</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.consignatarias}</div>
                <div className="text-sm text-zinc-500">Consignatarias</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Auction List */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {stats.count === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-400 mb-2">
              No hay remates programados para {monthConfig.name}
            </h2>
            <p className="text-zinc-500 mb-6">
              {isPastMonth
                ? 'Este mes ya pasó. Consultá el calendario actual.'
                : 'Aún no se publicaron remates para este mes. Volvé pronto.'}
            </p>
            <Link
              href="/remates"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Ver todos los remates
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(weekGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([weekKey, weekAuctions]) => {
                const weekDate = new Date(weekKey + 'T12:00:00')
                const weekEnd = new Date(weekDate)
                weekEnd.setDate(weekDate.getDate() + 6)
                const weekLabel = `${weekDate.getDate()}/${weekDate.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`

                return (
                  <div key={weekKey}>
                    <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-zinc-500" />
                      Semana del {weekLabel}
                      <span className="text-sm font-normal text-zinc-500">
                        ({weekAuctions.length} remates)
                      </span>
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {weekAuctions.map(auction => (
                        <AuctionCard key={auction.id} auction={auction} />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">Ver otros meses</h3>
          <div className="flex flex-wrap gap-2">
            {MONTH_SLUGS.map(m => {
              const isActive = m === mes
              const monthAuctions = getAuctionsForMonth(m, year)
              return (
                <Link
                  key={m}
                  href={`/remates/mes/${m}`}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {MONTHS[m].name}
                  {monthAuctions.length > 0 && (
                    <span className="ml-1 text-xs opacity-70">({monthAuctions.length})</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* SEO Content */}
        <div className="mt-12 pt-8 border-t border-zinc-800 prose prose-invert prose-sm max-w-none">
          <h2>Remates de Ganado en {monthConfig.name} {year}</h2>
          <p>
            El calendario de remates ganaderos de {monthConfig.name} {year} incluye subastas de invernada,
            cría y reproductores en las principales provincias ganaderas de Argentina. Las consignatarias
            organizan ferias presenciales y televisadas donde productores e inversores comercializan
            hacienda vacuna.
          </p>
          <p>
            En Consignatarias.com.ar encontrás toda la información actualizada: fechas, horarios,
            ubicaciones, consignatarias organizadoras y cantidad estimada de cabezas. Podés filtrar
            por provincia, tipo de remate o consignataria para encontrar las subastas que te interesan.
          </p>
          <h3>¿Cómo participar en los remates de {monthConfig.name}?</h3>
          <p>
            Para participar en un remate ganadero, registrate con la consignataria organizadora antes
            de la fecha del evento. Muchos remates ofrecen transmisión en vivo por YouTube o
            plataformas propias, permitiendo ofertar de forma remota.
          </p>
        </div>
      </section>
    </main>
  )
}
