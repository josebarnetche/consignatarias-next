import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { fetchInmagUsdJoined, aggregateMonthly } from '@/lib/charts/data'
import { lineChartSvg } from '@/lib/charts/svg'

export const revalidate = 86400 // 1 day — rebuilt nightly by SSG cron

const fmt = (n: number, max = 2) =>
  n.toLocaleString('es-AR', { maximumFractionDigits: max })

export async function generateMetadata(): Promise<Metadata> {
  // Read just the latest day for the title; full series fetched in the page
  const today = new Date().toISOString().slice(0, 10)
  const tenYearsAgo = new Date()
  tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear() - 10)
  const fromIso = tenYearsAgo.toISOString().slice(0, 10)
  const data = await fetchInmagUsdJoined(fromIso, today)
  const latest = [...data].reverse().find((d) => d.inmag_usd !== null)
  const latestUsd = latest?.inmag_usd ?? null

  const title = latestUsd
    ? `Precio Kilo Vivo Novillo en Dólares Hoy: USD ${fmt(latestUsd, 2)} | INMAG Histórico`
    : 'INMAG en dólares — Histórico desde 2015'
  const description = latestUsd
    ? `Precio del kilo vivo de novillo en USD (INMAG / blue): USD ${fmt(latestUsd, 2)}/kg hoy. Serie histórica diaria 2015→hoy en dólares reales, no nominal. Ver si la carne subió o el peso se devaluó.`
    : 'Serie histórica del INMAG (precio kilo vivo de novillo) deflactado por el dólar blue, día por día desde 2015. La pregunta correcta: ¿subió el ganado o se devaluó el peso?'

  return {
    title,
    description,
    keywords: [
      'INMAG en dolares',
      'precio kilo vivo en dolares',
      'precio novillo dolares',
      'precio ganado dolares historico',
      'INMAG historico',
      'precio kilo vivo historico',
      'carne en dolares argentina',
      'cuanto vale el novillo en dolares',
    ],
    openGraph: {
      title,
      description,
      url: 'https://www.consignatarias.com.ar/mercado/inmag-dolares',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/mercado/inmag-dolares',
    },
  }
}

export default async function InmagDolaresPage() {
  const today = new Date().toISOString().slice(0, 10)
  const tenYearsAgo = new Date()
  tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear() - 10)
  const fromIso = tenYearsAgo.toISOString().slice(0, 10)

  const series = await fetchInmagUsdJoined(fromIso, today)

  const hasData = series.some((d) => d.inmag_usd !== null)

  // Monthly aggregates for the chart (smoother, weekly noise removed)
  const monthlyArs = aggregateMonthly(series, (d) => d.inmag)
  const monthlyUsd = aggregateMonthly(series, (d) => d.inmag_usd)

  const usdSeries = {
    label: 'INMAG en USD/kg vivo',
    color: '#38bdf8',
    points: monthlyUsd.map((m) => ({
      date: `${m.year}-${String(m.month).padStart(2, '0')}-15`,
      value: m.value,
    })),
  }
  const arsSeries = {
    label: 'INMAG en ARS/kg vivo',
    color: '#a3a3a3',
    points: monthlyArs.map((m) => ({
      date: `${m.year}-${String(m.month).padStart(2, '0')}-15`,
      // Normalize ARS to its own scale so both can fit a 0-1 chart; we'll
      // build two separate charts instead for clarity.
      value: m.value,
    })),
  }

  // Stats
  const usdValues = monthlyUsd.map((m) => m.value)
  const usdLatest = usdValues[usdValues.length - 1] ?? null
  const usdMin = usdValues.length ? Math.min(...usdValues) : null
  const usdMax = usdValues.length ? Math.max(...usdValues) : null
  const usdAvg = usdValues.length
    ? usdValues.reduce((s, v) => s + v, 0) / usdValues.length
    : null

  // Recent 5 years (60 months) for chart focus
  const last60 = monthlyUsd.slice(-60)
  const chartSeries = [
    {
      label: 'INMAG en USD/kg vivo (mensual)',
      color: '#38bdf8',
      points: last60.map((m) => ({
        date: `${m.year}-${String(m.month).padStart(2, '0')}-15`,
        value: m.value,
      })),
    },
  ]
  const chartSvg = lineChartSvg({
    series: chartSeries,
    height: 320,
    yLabel: 'USD / kg vivo',
    yZero: true,
    formatY: (v) => `$${v.toFixed(1)}`,
  })

  // Full-history chart (always shown if there's >24 months)
  const fullSvg =
    monthlyUsd.length > 24
      ? lineChartSvg({
          series: [
            {
              label: 'INMAG en USD/kg — desde 2015',
              color: '#a78bfa',
              points: monthlyUsd.map((m) => ({
                date: `${m.year}-${String(m.month).padStart(2, '0')}-15`,
                value: m.value,
              })),
            },
          ],
          height: 240,
          yLabel: 'USD / kg vivo',
          yZero: true,
          formatY: (v) => `$${v.toFixed(1)}`,
        })
      : null

  // FAQ with verbatim long-tail queries
  const faq = [
    {
      question: '¿Cuánto vale el kilo vivo de novillo en dólares hoy?',
      answer: usdLatest
        ? `Hoy el kilo vivo de novillo equivale a USD ${fmt(usdLatest, 2)} usando el dólar blue. Calculado dividiendo el INMAG en pesos por la cotización del blue del mismo día.`
        : 'Estamos cargando la última cotización. Volvé en unas horas.',
    },
    {
      question: '¿Cuánto valía el novillo en dólares hace 10 años?',
      answer: usdMin && usdMax
        ? `En los últimos 10 años el INMAG en dólares se movió entre USD ${fmt(usdMin, 2)} y USD ${fmt(usdMax, 2)}/kg vivo, con promedio mensual de USD ${fmt(usdAvg ?? 0, 2)}. La serie muestra que el precio en dólares es mucho más estable que en pesos — ahí está la lección que el INMAG nominal no cuenta.`
        : 'Estamos cargando la serie histórica.',
    },
    {
      question: '¿Por qué medir el ganado en dólares y no en pesos?',
      answer:
        'Porque la moneda argentina se devalúa permanentemente. Una cifra de $4.200/kg en 2026 parece enorme comparada con $40/kg en 2018, pero ajustada por dólar blue las cifras son comparables (USD 2,8 vs USD 3,1). Medir en dólares permite ver el ciclo real del mercado, no el ruido cambiario.',
    },
    {
      question: '¿Qué dólar usan para el cálculo?',
      answer:
        'Dólar blue (valor venta), publicado diariamente por las casas de cambio paralelas. Es el más reflejado en la economía real del ganadero. Si querés la serie con dólar oficial avisanos.',
    },
    {
      question: '¿Esto sirve para invertir o cobrar honorarios?',
      answer:
        'Sirve como referencia macro. Para operaciones concretas usá el INMAG diario en pesos del día de operación. Para contratos a plazo en dólares (acopio, exportación, alquiler de campo) la serie histórica te permite ver percentiles.',
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/inmag-dolares" sectionName="INMAG en dólares" />
      <FAQPageSchema items={faq} />

      <div className="px-4 py-6 max-w-5xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">
            Mercado
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">INMAG en dólares</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          INMAG en dólares blue —{' '}
          {usdLatest ? (
            <span style={{ color: '#38bdf8' }}>USD {fmt(usdLatest, 2)}/kg vivo</span>
          ) : (
            <span className="text-zinc-500">cargando…</span>
          )}
        </h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
          El precio del kilo vivo de novillo deflactado por dólar blue. La
          pregunta correcta: <span className="text-zinc-200">¿subió el ganado o se devaluó el peso?</span>
        </p>

        {!hasData && (
          <div className="terminal-panel mb-6">
            <div className="terminal-panel-header">Datos cargando</div>
            <div className="px-panel py-6 text-data text-zinc-400">
              La serie de USD blue está siendo backfilleada. Volvé en unas
              horas. (El INMAG ya está disponible —{' '}
              <Link href="/mercado" className="text-sky-400 hover:underline">
                /mercado
              </Link>
              .)
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Stats strip */}
            <div className="terminal-panel mb-6">
              <div className="terminal-panel-header">10 años en USD/kg vivo</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border">
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Hoy</div>
                  <div className="text-2xl font-terminal tabular-nums" style={{ color: '#38bdf8' }}>
                    USD {fmt(usdLatest ?? 0, 2)}
                  </div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Promedio 10y</div>
                  <div className="text-2xl font-terminal tabular-nums text-zinc-300">
                    USD {fmt(usdAvg ?? 0, 2)}
                  </div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Mínimo</div>
                  <div className="text-2xl font-terminal tabular-nums text-zinc-300">
                    USD {fmt(usdMin ?? 0, 2)}
                  </div>
                </div>
                <div className="bg-terminal-panel px-4 py-4">
                  <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Máximo</div>
                  <div className="text-2xl font-terminal tabular-nums text-zinc-300">
                    USD {fmt(usdMax ?? 0, 2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Last 5 years chart */}
            <div className="terminal-panel mb-6">
              <div className="terminal-panel-header">Últimos 5 años — promedio mensual</div>
              <div
                className="px-panel py-4"
                dangerouslySetInnerHTML={{ __html: chartSvg }}
              />
            </div>

            {/* Full history */}
            {fullSvg && (
              <div className="terminal-panel mb-6">
                <div className="terminal-panel-header">Histórico completo — desde 2015</div>
                <div
                  className="px-panel py-4"
                  dangerouslySetInnerHTML={{ __html: fullSvg }}
                />
                <div className="px-panel pb-3 text-zinc-500 text-xxs">
                  Cada punto = promedio del mes. Fuente: INMAG (MAG Cañuelas) ÷ dólar blue venta (ambitofinanciero / argentinadatos).
                </div>
              </div>
            )}
          </>
        )}

        {/* Methodology */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Metodología</div>
          <div className="px-panel py-4 space-y-3 text-data text-zinc-400">
            <p>
              Por cada día con INMAG calculado dividimos el valor en pesos por
              la cotización venta del dólar blue del mismo día. Cuando el blue
              no postea un día (feriado cambiario) usamos la última cotización
              válida (forward-fill).
            </p>
            <p>
              No usamos dólar oficial porque tiene cepo histórico y no refleja
              el dólar real del campo. Si querés la serie con MEP, CCL u
              oficial,{' '}
              <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">
                escribinos
              </a>{' '}
              — está disponible via API Enterprise.
            </p>
            <p className="text-zinc-500 text-xxs">
              Fuentes citadas: Mercado Agroganadero (INMAG diario), argentinadatos.com
              (USD blue histórico), dolarapi.com (USD blue diario).
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {faq.map((f, i) => (
              <div
                key={f.question}
                className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}
              >
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-zinc-500 text-xxs text-center">
          <Link
            href="/mercado"
            className="hover:text-zinc-300 underline-offset-2 hover:underline"
          >
            ← Volver a precios en pesos
          </Link>
          {' · '}
          <Link
            href="/enterprise"
            className="hover:text-zinc-300 underline-offset-2 hover:underline"
          >
            Acceso API histórico
          </Link>
        </p>
      </div>
    </>
  )
}
