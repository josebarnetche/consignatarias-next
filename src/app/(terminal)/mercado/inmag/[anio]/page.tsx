import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchInmagUsdJoined } from '@/lib/charts/data'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema } from '@/components/seo/JsonLd'

/* ============================================================
   /mercado/inmag/[anio] — historical INMAG by year, in pesos AND
   dollars (the peso-vs-USD overlay no competitor publishes — the
   site's defensible, compounding long-tail). Targets "precio del
   novillo en [año]" / "cuánto valía el novillo en 2018".
   ============================================================ */

const APP_URL = 'https://www.consignatarias.com.ar'
const FIRST_YEAR = 2015
const CURRENT_YEAR = 2026 // build-time anchor; partial-year pages are honest about it

const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)

export const revalidate = 86400

export function generateStaticParams() {
  return YEARS.map((y) => ({ anio: String(y) }))
}

const fmt = (n: number, max = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: max })

function isValidYear(anio: string): boolean {
  const y = parseInt(anio, 10)
  return YEARS.includes(y)
}

interface YearStats {
  year: number
  arsAvg: number | null
  arsMin: number | null
  arsMax: number | null
  arsLast: number | null
  usdAvg: number | null
  usdMin: number | null
  usdMax: number | null
  usdLast: number | null
  days: number
  prevUsdAvg: number | null
}

async function getYearStats(year: number): Promise<YearStats> {
  // Fetch the year + prior year (for the USD year-over-year comparison)
  const from = `${year - 1}-01-01`
  const to = `${year}-12-31`
  const series = await fetchInmagUsdJoined(from, to)

  const inYear = series.filter((d) => d.date.startsWith(String(year)))
  const prevYear = series.filter((d) => d.date.startsWith(String(year - 1)))

  const ars = inYear.map((d) => d.inmag).filter((v): v is number => v !== null)
  const usd = inYear.map((d) => d.inmag_usd).filter((v): v is number => v !== null)
  const prevUsd = prevYear.map((d) => d.inmag_usd).filter((v): v is number => v !== null)

  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null)

  return {
    year,
    arsAvg: avg(ars),
    arsMin: ars.length ? Math.min(...ars) : null,
    arsMax: ars.length ? Math.max(...ars) : null,
    arsLast: ars.length ? ars[ars.length - 1] : null,
    usdAvg: avg(usd),
    usdMin: usd.length ? Math.min(...usd) : null,
    usdMax: usd.length ? Math.max(...usd) : null,
    usdLast: usd.length ? usd[usd.length - 1] : null,
    days: ars.length,
    prevUsdAvg: avg(prevUsd),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ anio: string }>
}): Promise<Metadata> {
  const { anio } = await params
  if (!isValidYear(anio)) return { title: 'Año no encontrado' }
  const s = await getYearStats(parseInt(anio, 10))
  const arsStr = s.arsAvg ? `$${fmt(s.arsAvg)}/kg` : 's/d'
  const usdStr = s.usdAvg ? `USD ${fmt(s.usdAvg, 2)}/kg` : 's/d'

  const title = `Precio del Novillo en ${anio}: ${arsStr} (${usdStr}) — INMAG Histórico`
  const description = `¿Cuánto valía el novillo en ${anio}? Promedio anual del INMAG: ${arsStr} en pesos y ${usdStr} en dólares (kilo vivo). Mínimo, máximo y evolución del precio de la hacienda en ${anio} según el Mercado Agroganadero.`

  return {
    title,
    description,
    keywords: [
      `precio novillo ${anio}`, `cuanto valia el novillo en ${anio}`, `INMAG ${anio}`,
      `precio hacienda ${anio}`, `novillo dolares ${anio}`, `precio kilo vivo ${anio}`,
    ],
    openGraph: {
      title,
      description,
      url: `${APP_URL}/mercado/inmag/${anio}`,
      type: 'article',
    },
    alternates: { canonical: `${APP_URL}/mercado/inmag/${anio}` },
  }
}

export default async function InmagYearPage({
  params,
}: {
  params: Promise<{ anio: string }>
}) {
  const { anio } = await params
  if (!isValidYear(anio)) notFound()
  const year = parseInt(anio, 10)
  const s = await getYearStats(year)
  const isPartial = year === CURRENT_YEAR

  const usdYoY =
    s.usdAvg !== null && s.prevUsdAvg !== null && s.prevUsdAvg > 0
      ? ((s.usdAvg - s.prevUsdAvg) / s.prevUsdAvg) * 100
      : null

  const prevYear = year - 1
  const nextYear = year + 1

  const faqItems = [
    {
      question: `¿Cuánto valía el novillo en ${year}?`,
      answer: s.arsAvg
        ? `En ${year}, el INMAG (precio del kilo vivo de novillo) promedió $${fmt(s.arsAvg)} en pesos y USD ${fmt(s.usdAvg ?? 0, 2)} en dólares (blue), sobre ${s.days} ruedas. Osciló entre $${fmt(s.arsMin ?? 0)} y $${fmt(s.arsMax ?? 0)} por kilo vivo.`
        : `Estamos cargando la serie del INMAG para ${year}.`,
    },
    {
      question: `¿Cuánto valía el novillo en dólares en ${year}?`,
      answer: s.usdAvg
        ? `El novillo promedió USD ${fmt(s.usdAvg, 2)}/kg vivo en ${year}, con un rango de USD ${fmt(s.usdMin ?? 0, 2)} a USD ${fmt(s.usdMax ?? 0, 2)}${usdYoY !== null ? `. Eso es ${usdYoY >= 0 ? '+' : ''}${usdYoY.toFixed(1)}% vs. ${prevYear} en dólares` : ''}. Medir en dólares quita el ruido de la inflación y muestra el valor real del ganado.`
        : `Estamos cargando la serie en dólares para ${year}.`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section={`mercado/inmag/${anio}`} sectionName={`INMAG ${anio}`} />
      <FAQPageSchema items={faqItems} />
      <DatasetSchema
        name={`INMAG ${year} — precio del novillo en pesos y dólares`}
        description={`Serie y estadísticas anuales del INMAG (precio del kilo vivo de novillo en el Mercado Agroganadero) para ${year}, en pesos y en dólares blue. Promedio, mínimo y máximo.`}
        url={`${APP_URL}/mercado/inmag/${anio}`}
        keywords={[`precio novillo ${anio}`, `INMAG ${anio}`, `novillo dólares ${anio}`]}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <Link href="/mercado/inmag" className="hover:text-zinc-300">INMAG</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{anio}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-2 leading-tight">
          Precio del novillo en {anio}
          {s.arsAvg && (
            <>
              {': '}
              <span style={{ color: '#fbbf24' }}>${fmt(s.arsAvg)}/kg</span>
            </>
          )}
        </h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-2xl leading-relaxed">
          {isPartial ? `Promedio del INMAG en lo que va de ${anio}` : `Promedio anual del INMAG en ${anio}`} —
          el precio del kilo vivo de novillo en el Mercado Agroganadero, en pesos y en{' '}
          <strong className="text-zinc-200">dólares reales</strong> (la lectura que quita el ruido de la
          inflación).
        </p>

        {s.arsAvg ? (
          <>
            {/* Pesos */}
            <div className="terminal-panel mb-6">
              <div className="terminal-panel-header">En pesos — INMAG {anio} ($/kg vivo)</div>
              <div className="grid grid-cols-3 gap-px bg-terminal-border">
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Promedio</div>
                  <div className="text-zinc-100 text-2xl font-terminal tabular-nums">${fmt(s.arsAvg)}</div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Mínimo</div>
                  <div className="text-zinc-300 text-2xl font-terminal tabular-nums">${fmt(s.arsMin ?? 0)}</div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Máximo</div>
                  <div className="text-zinc-300 text-2xl font-terminal tabular-nums">${fmt(s.arsMax ?? 0)}</div>
                </div>
              </div>
            </div>

            {/* Dólares — the moat */}
            <div className="terminal-panel mb-6">
              <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
                En dólares blue — INMAG {anio} (USD/kg vivo)
              </div>
              <div className="grid grid-cols-3 gap-px bg-terminal-border">
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Promedio</div>
                  <div className="text-2xl font-terminal tabular-nums" style={{ color: '#38bdf8' }}>
                    USD {fmt(s.usdAvg ?? 0, 2)}
                  </div>
                  {usdYoY !== null && (
                    <div className="text-xxs mt-1" style={{ color: usdYoY >= 0 ? '#34d399' : '#f87171' }}>
                      {usdYoY >= 0 ? '+' : ''}{usdYoY.toFixed(1)}% vs {prevYear}
                    </div>
                  )}
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Mínimo</div>
                  <div className="text-zinc-300 text-2xl font-terminal tabular-nums">USD {fmt(s.usdMin ?? 0, 2)}</div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Máximo</div>
                  <div className="text-zinc-300 text-2xl font-terminal tabular-nums">USD {fmt(s.usdMax ?? 0, 2)}</div>
                </div>
              </div>
              <div className="px-panel py-3 text-zinc-500 text-xxs">
                INMAG ÷ dólar blue venta. {s.days} ruedas en {anio}.
              </div>
            </div>

            <div className="terminal-panel mb-6">
              <div className="terminal-panel-header">La lectura</div>
              <div className="px-panel py-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  En {anio} el novillo promedió <strong className="text-zinc-200">${fmt(s.arsAvg)}/kg</strong> en
                  pesos, que equivalen a <strong className="text-zinc-200">USD {fmt(s.usdAvg ?? 0, 2)}/kg</strong> al
                  dólar blue.{' '}
                  {usdYoY !== null && (
                    <>
                      En dólares — la medida que importa para comparar entre años — el ganado{' '}
                      {usdYoY >= 0 ? 'subió' : 'bajó'} {Math.abs(usdYoY).toFixed(1)}% respecto de {prevYear}.
                    </>
                  )}{' '}
                  La cifra en pesos siempre parece crecer por la inflación; la de dólares muestra el valor real.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="terminal-panel mb-6">
            <div className="px-panel py-6 text-zinc-400 text-data">
              Estamos cargando la serie del INMAG para {anio}.{' '}
              <Link href="/mercado/inmag-dolares" className="text-sky-400 hover:underline">
                Ver la serie completa en dólares →
              </Link>
            </div>
          </div>
        )}

        {/* Year navigation */}
        <div className="flex items-center justify-between gap-2 mb-6">
          {YEARS.includes(prevYear) ? (
            <Link href={`/mercado/inmag/${prevYear}`} className="text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5">
              ← Novillo en {prevYear}
            </Link>
          ) : <span />}
          {YEARS.includes(nextYear) ? (
            <Link href={`/mercado/inmag/${nextYear}`} className="text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5">
              Novillo en {nextYear} →
            </Link>
          ) : <span />}
        </div>

        {/* All years */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">El novillo año por año</div>
          <div className="px-panel py-4 flex flex-wrap gap-2">
            {YEARS.map((y) => (
              <Link
                key={y}
                href={`/mercado/inmag/${y}`}
                className={`text-xxs font-terminal px-2 py-1 rounded border ${
                  y === year
                    ? 'border-amber-500/60 text-amber-400 bg-amber-500/10'
                    : 'border-terminal-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {faqItems.map((f, i) => (
              <div key={f.question} className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}>
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 text-xxs text-center">
          Fuente: INMAG (Mercado Agroganadero) ÷ dólar blue ·{' '}
          <Link href="/mercado/inmag-dolares" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
            Ver la serie completa en dólares
          </Link>{' '}·{' '}
          <Link href="/indices" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
            Familia de índices
          </Link>
        </p>
      </div>
    </>
  )
}
