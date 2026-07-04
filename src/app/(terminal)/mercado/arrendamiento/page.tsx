import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import marketData from '@/lib/data/market-prices.json'
import ArrendamientoCalculator from './ArrendamientoCalculator'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart'
import ArrendamientoLiquidacionSignup from '@/components/ArrendamientoLiquidacionSignup'
import PriceAlertSignup from '@/components/PriceAlertSignup'
import HerramientasCTA from '@/components/HerramientasCTA'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
import SinceLastVisit from '@/components/landing/SinceLastVisit'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { Delta, DataTable, PriceCell, type DataColumn } from '@/components/ui'
import { signedTone, SEMANTIC_HEX } from '@/lib/ui/tokens'
import { MarketHero, type MarketHeroStat } from '@/components/market'
import rematesData from '@/lib/data/remates.json'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number; volume?: number }>

// Snapshot server para "Desde tu última visita" (mismo patrón que /overview).
const TODAY = new Date().toISOString().slice(0, 10)
const inmagSnapshotDate = series[series.length - 1]?.date ?? marketData.lastUpdate
const rematesUpcomingSnapshot = rematesData
  .filter((r) => r.date >= TODAY && r.status === 'scheduled')
  .map((r) => ({ date: r.date }))

// Calculate monthly averages
function getMonthlyAverages(data: typeof series) {
  const monthlyData: Record<string, { sum: number; count: number; values: number[] }> = {}
  
  data.forEach(point => {
    const date = new Date(point.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sum: 0, count: 0, values: [] }
    }
    monthlyData[monthKey].sum += point.value
    monthlyData[monthKey].count++
    monthlyData[monthKey].values.push(point.value)
  })
  
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      avg: data.sum / data.count,
      min: Math.min(...data.values),
      max: Math.max(...data.values),
      count: data.count
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12) // Last 12 months
}

const monthlyAverages = getMonthlyAverages(series)

export const metadata: Metadata = {
  // Live price baked into the title — self-answering pattern matching the dominant
  // query "precio novillo (para) arrendamiento hoy". maximumFractionDigits:0 drops the
  // centavos ($4.283,84→$4.284) that were truncating the title at 60 chars and adding
  // SERP noise; dropping "(índice INMAG)" frees room. Description leads with the literal
  // query + live variation + an action hook ("calculá el canon"). v1.40 CTR pass.
  title: `Precio Novillo Arrendamiento Hoy: $${inmag.current.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg`,
  description: `Precio del novillo para arrendamiento hoy: $${inmag.current.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg (${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%). Calculá el canon de tu campo en kg/ha al índice INMAG. Promedio mensual y serie histórica.`,
  keywords: [
    'índice novillo arrendamiento',
    'indice novillo arrendamiento hoy',
    'indice novillo arrendamiento cañuelas',
    'indice novillo arrendamiento mensual liniers',
    'novillo indice arrendamiento',
    'arrendamiento rural argentina',
    'precio novillo arrendamiento',
    'contrato arrendamiento rural',
    'INMAG arrendamiento',
  ],
  openGraph: {
    title: `Índice Novillo Arrendamiento Hoy: $${inmag.current.toLocaleString('es-AR')}/kg | Consignatarias`,
    description: `Índice Novillo Arrendamiento actualizado. Variación: ${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%. Referencia para contratos de arrendamiento rural en Argentina.`,
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
    type: 'website',
  },
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/arrendamiento' },
}

// FAQPage Schema
function FAQSchema() {
  const faqs = [
    {
      question: '¿Qué es el índice novillo arrendamiento?',
      answer: 'El índice novillo arrendamiento es el valor de referencia utilizado para calcular el canon de los contratos de arrendamiento rural en Argentina. Se basa en el precio del novillo en el Mercado Agroganadero de Buenos Aires (INMAG) y permite ajustar el valor del alquiler de campos de manera objetiva y transparente según las condiciones del mercado ganadero.'
    },
    {
      question: '¿Cómo se calcula el arrendamiento con el índice novillo?',
      answer: 'El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 4 kg de novillo por hectárea, y el campo tiene 500 ha, con un índice de $4.329/kg, el canon mensual sería aproximadamente $8.658.000. Los contratos suelen estipular un promedio mensual del índice.'
    },
    {
      question: '¿Por qué se usa el índice novillo para arrendamientos?',
      answer: 'El índice novillo es la referencia más utilizada porque: 1) Es un valor objetivo publicado diariamente por el Mercado Agroganadero, 2) Refleja las condiciones reales del mercado ganadero, 3) Protege tanto al propietario como al arrendatario de la inflación, 4) Es ampliamente aceptado y tiene transparencia en su cálculo.'
    },
    {
      question: '¿Cuál es la diferencia entre el índice Liniers y Cañuelas?',
      answer: 'Ambos mercados operan bajo el Mercado Agroganadero de Buenos Aires y contribuyen al cálculo del INMAG. Liniers históricamente fue el mercado más importante, mientras que Cañuelas tomó protagonismo en los últimos años. El índice novillo arrendamiento que publicamos es el INMAG oficial que integra ambos mercados.'
    },
    {
      question: '¿Cada cuánto se actualiza el índice novillo arrendamiento?',
      answer: 'El índice se actualiza cada día hábil con operaciones en el Mercado Agroganadero. Para contratos de arrendamiento, generalmente se utiliza el promedio mensual del índice para evitar la volatilidad diaria y simplificar las liquidaciones.'
    },
    {
      question: '¿Cómo se pacta el valor del arrendamiento en kilos de novillo?',
      answer: 'El valor en kilos de novillo por hectárea depende de la calidad del campo, ubicación, mejoras, y aptitud productiva. Campos agrícolas de primera en zona núcleo pueden pactarse entre 8-12 kg/ha/mes, mientras que campos ganaderos en zonas marginales pueden estar entre 3-6 kg/ha/mes. Es fundamental evaluar cada caso particular.'
    }
  ]
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
  
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// Dataset Schema
function ArrendamientoSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Índice Novillo Arrendamiento - INMAG',
    description: 'Índice de precios del novillo utilizado como referencia para contratos de arrendamiento rural en Argentina.',
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
    keywords: ['índice novillo', 'arrendamiento rural', 'INMAG', 'precio ganado', 'mercado ganadero'],
    // C11: entidad única MAG Cañuelas (coherente con /mercado/inmag y mercado/canuelas).
    creator: { '@type': 'Organization', name: 'Mercado Agroganadero de Cañuelas', sameAs: 'https://www.mercadoagroganadero.com.ar' },
    temporalCoverage: `${series[0]?.date}/${series[series.length - 1]?.date}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'Argentina' },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export default function ArrendamientoPage() {
  const recentSeries = series.slice(-90) // 90 days for better trend visibility
  const last30 = series.slice(-30)
  const minVal = Math.min(...last30.map(s => s.value))
  const maxVal = Math.max(...last30.map(s => s.value))
  const avgVal = last30.reduce((a, b) => a + b.value, 0) / last30.length
  
  // Calculate 30d change
  const change30d = ((last30[last30.length - 1]?.value - last30[0]?.value) / last30[0]?.value * 100)

  // Example calculation for 500ha @ 4kg/ha
  const exampleHectareas = 500
  const exampleKgPerHa = 4
  const exampleCanon = exampleHectareas * exampleKgPerHa * inmag.current

  // Quick-stats del hero compartido (mismo lenguaje que /mercado/inmag).
  const heroStats: MarketHeroStat[] = [
    { label: 'Mínimo 30d', value: `$${fmt(minVal)}`, sub: 'Por kg vivo' },
    { label: 'Máximo 30d', value: `$${fmt(maxVal)}`, sub: 'Por kg vivo' },
    { label: 'Promedio 30d', value: `$${fmt(avgVal)}`, sub: 'Por kg vivo' },
    {
      label: 'Variación 30d',
      value: `${change30d >= 0 ? '+' : ''}${change30d.toFixed(1)}%`,
      sub: 'vs. hace 30 días',
      tone: signedTone(change30d),
    },
  ]

  // Promedios mensuales con variación mes a mes (más reciente primero).
  const monthlyRows = monthlyAverages.map((month, i) => {
    const prevMonth = monthlyAverages[i + 1]
    return {
      ...month,
      change: prevMonth ? ((month.avg - prevMonth.avg) / prevMonth.avg) * 100 : null,
    }
  })

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    {
      key: 'month',
      header: 'Mes',
      cell: (r) => <span className="text-zinc-300 capitalize">{formatMonth(r.month)}</span>,
    },
    {
      key: 'avg',
      header: 'Promedio',
      numeric: true,
      cell: (r) => (
        <span className="inline-flex items-baseline gap-2">
          <PriceCell value={r.avg} prefix="$" suffix="/kg" />
          <Delta change={r.change} format={(abs) => abs.toFixed(1)} className="text-xxs" />
        </span>
      ),
    },
    {
      key: 'min',
      header: 'Mínimo',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <PriceCell value={r.min} prefix="$" tone="neutral" />,
    },
    {
      key: 'max',
      header: 'Máximo',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <PriceCell value={r.max} prefix="$" tone="neutral" />,
    },
    {
      key: 'count',
      header: 'Ruedas',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <span className="text-zinc-500 tabular-nums">{r.count}</span>,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <ArrendamientoSchema />
      <FAQSchema />

      <SinceLastVisit
        snapshot={{
          inmagDate: inmagSnapshotDate,
          inmagValue: inmag.current,
          inmagChange: inmag.change,
          rematesUpcoming: rematesUpcomingSnapshot,
          lastUpdate: marketData.lastUpdate,
        }}
      />

      <div className="min-h-screen">
        {/* Hero Section — número-hero compartido con /mercado/inmag (MarketHero) */}
        <MarketHero
          accent="amber"
          priceLabel="Índice Hoy"
          priceValue={inmag.current}
          priceChange={inmag.change}
          prevValue={fmt(inmag.prev)}
          stats={heroStats}
        >
          <div>
            <Breadcrumb
              className="mb-8"
              items={[
                { name: 'Mercado', href: '/mercado' },
                { name: 'Arrendamiento' },
              ]}
            />
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                ACTUALIZADO HOY
              </span>
              <span className="text-sm text-zinc-500">Mercado Agroganadero</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
              Índice Novillo
              <span className="block text-amber-400">Arrendamiento</span>
            </h1>
            <p className="text-zinc-400 max-w-xl text-lg">
              Precio de referencia para contratos de arrendamiento rural en Argentina.
              Basado en el <Link href="/mercado/inmag" className="text-amber-400 hover:underline">INMAG</Link> del Mercado Agroganadero.
            </p>
          </div>
        </MarketHero>

        {/* Captura de alta intención, arriba: el visitante (mayormente desde IA)
            acaba de ver el número del arrendamiento → le ofrecemos avisarle cuando
            cambie, con fricción mínima (solo email). Convierte visitas one-shot en un
            loop de email. La oferta profunda (liquidar el canon con kg/ha) va más abajo. */}
        <section className="max-w-3xl mx-auto px-4 pt-6">
          <PriceAlertSignup
            source="alerta-arrendamiento"
            page="/mercado/arrendamiento"
            accent="amber"
            title="¿Seguís el arrendamiento? Te aviso cuando cambie"
          />
        </section>

        {/* What is the Index */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-2xl p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              ¿Qué es el Índice Novillo Arrendamiento?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 text-zinc-400">
                <p>
                  El <strong className="text-white">índice novillo arrendamiento</strong> es el valor de referencia 
                  más utilizado en Argentina para calcular el canon de los contratos de arrendamiento rural.
                </p>
                <p>
                  Se basa en el precio del novillo publicado por el <Link href="/mercado/inmag" className="text-amber-400 hover:underline">Mercado Agroganadero de Buenos Aires (INMAG)</Link>, 
                  que integra las operaciones de Liniers y Cañuelas.
                </p>
                <p>
                  Utilizar el índice novillo permite que tanto propietarios como arrendatarios tengan una 
                  referencia objetiva, transparente y actualizada para calcular el valor del alquiler de campos.
                </p>
              </div>
              <ArrendamientoCalculator priceToday={inmag.current} />
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Evolución del Índice (90 días)</h2>
            <Link 
              href="/api-docs" 
              className="text-sm text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <span>API</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
          
          <Suspense fallback={<div className="h-[380px] bg-zinc-900/30 rounded-2xl animate-pulse" />}>
            <InteractivePriceChart 
              data={recentSeries} 
              height={380}
              accentColor={SEMANTIC_HEX.warning}
              showVolume={true}
            />
          </Suspense>
        </section>

        {/* Captura liderada por la LIQUIDACIÓN — el job real del cluster que explota
            (+110% WoW): el que liquida un canon cada mes, no el que vende hacienda.
            Self-contained (inputs del contrato inline) + canon en vivo + promesa
            cumplible (cierre mensual con TU canon). Reemplaza las dos capturas
            genéricas que convertían ~0 contra el tráfico #2 del sitio. */}
        <section className="max-w-6xl mx-auto px-4 pt-4 pb-8">
          <ArrendamientoLiquidacionSignup priceToday={inmag.current} page="/mercado/arrendamiento" />
          {/* Cosas para hacer — la entrada #1 (57% bounce) necesita un próximo paso. */}
          <HerramientasCTA />
        </section>

        {/* Monthly Averages Table */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Promedios Mensuales del Índice</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Los contratos de arrendamiento suelen utilizar el promedio mensual del índice para calcular el canon.
          </p>
          
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <DataTable
              columns={monthlyColumns}
              rows={monthlyRows}
              rowKey={(r) => r.month}
              rowTone={(r) => (r.change == null ? null : signedTone(r.change))}
            />

            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-xs text-zinc-600">Últimos 12 meses</span>
              <Link 
                href="/api/market/history?days=365&format=csv"
                className="text-xs text-accent hover:text-accent-bright transition-colors flex items-center gap-1"
              >
                Descargar histórico completo
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas Frecuentes</h2>
          
          <div className="space-y-4">
            {[
              {
                q: '¿Qué es el índice novillo arrendamiento?',
                a: 'El índice novillo arrendamiento es el valor de referencia utilizado para calcular el canon de los contratos de arrendamiento rural en Argentina. Se basa en el precio del novillo en el Mercado Agroganadero de Buenos Aires (INMAG) y permite ajustar el valor del alquiler de campos de manera objetiva y transparente según las condiciones del mercado ganadero.'
              },
              {
                q: '¿Cómo se calcula el arrendamiento con el índice novillo?',
                a: `El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 4 kg de novillo por hectárea, y el campo tiene 500 ha, con el índice actual de $${fmt(inmag.current)}/kg, el canon mensual sería de $${fmt(exampleCanon)}.`
              },
              {
                q: '¿Por qué se usa el índice novillo para arrendamientos?',
                a: 'El índice novillo es la referencia más utilizada porque: 1) Es un valor objetivo publicado diariamente por el Mercado Agroganadero, 2) Refleja las condiciones reales del mercado ganadero, 3) Protege tanto al propietario como al arrendatario de la inflación, 4) Es ampliamente aceptado y tiene transparencia en su cálculo.'
              },
              {
                q: '¿Cuál es la diferencia entre el índice Liniers y Cañuelas?',
                a: 'Ambos mercados operan bajo el Mercado Agroganadero de Buenos Aires y contribuyen al cálculo del INMAG. Liniers históricamente fue el mercado más importante, mientras que Cañuelas tomó protagonismo en los últimos años. El índice novillo arrendamiento que publicamos es el INMAG oficial que integra ambos mercados.'
              },
              {
                q: '¿Cada cuánto se actualiza el índice novillo arrendamiento?',
                a: 'El índice se actualiza cada día hábil con operaciones en el Mercado Agroganadero. Para contratos de arrendamiento, generalmente se utiliza el promedio mensual del índice para evitar la volatilidad diaria y simplificar las liquidaciones.'
              },
              {
                q: '¿Cómo se pacta el valor del arrendamiento en kilos de novillo?',
                a: 'El valor en kilos de novillo por hectárea depende de la calidad del campo, ubicación, mejoras, y aptitud productiva. Campos agrícolas de primera en zona núcleo pueden pactarse entre 8-12 kg/ha/mes, mientras que campos ganaderos en zonas marginales pueden estar entre 3-6 kg/ha/mes.'
              }
            ].map((faq, i) => (
              <details 
                key={i} 
                className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <h3 className="text-white font-medium pr-4">{faq.q}</h3>
                  <svg 
                    className="w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform group-open:rotate-180" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/30 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Related Links */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-lg font-semibold text-white mb-6">Información Relacionada</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Link 
              href="/mercado/inmag"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    INMAG - Índice Oficial
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Cotización diaria del Mercado Agroganadero de Buenos Aires.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>

            <Link 
              href="/mercado/liniers"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    Mercado de Liniers
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Precios por categoría y remates del día en Liniers.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>

            <Link 
              href="/mercado"
              className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 hover:bg-amber-500/15 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-amber-400 mb-2">
                    Todos los Precios
                  </h3>
                  <p className="text-sm text-amber-400/70">
                    Categorías, maíz, dólar y más indicadores del mercado.
                  </p>
                </div>
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Source attribution */}
          <p className="text-xs text-zinc-600 mt-8 text-center">
            Fuente: Mercado Agroganadero de Buenos Aires (mercadoagroganadero.com.ar).
            Datos actualizados automáticamente cada día hábil.
          </p>
        </section>

        {/* Mi Ganado — surface the retention feature to the arrendamiento audience (P3) */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <Link
            href="/mi-ganado"
            className="block bg-gradient-to-r from-emerald-500/10 to-zinc-900/30 border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-500/40 transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Tu hacienda al INMAG</div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">¿Cuánto vale tu rodeo hoy?</h3>
                <p className="text-sm text-zinc-400 max-w-xl">
                  Cargá tu hacienda una vez en <strong className="text-zinc-200">Mi Ganado</strong> y mirá su
                  valor actualizado al INMAG cada día hábil — en pesos y en dólares. Gratis con tu cuenta.
                </p>
              </div>
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </section>

        {/* PRO CTA — conversion surface on the #2 traffic page (P1) */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <ProUpgradePrompt
            benefit="Histórico completo del índice + descarga de la serie para tus contratos."
            context="arrendamiento"
            variant="card"
          />
        </section>
      </div>
    </>
  )
}
