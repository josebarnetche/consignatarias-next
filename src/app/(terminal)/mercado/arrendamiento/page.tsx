import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import marketData from '@/lib/data/market-prices.json'
import ArrendamientoCalculator from './ArrendamientoCalculator'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart'
import CierreMensualSubscribe from '@/components/CierreMensualSubscribe'
import { AnimatedPrice } from '@/components/AnimatedPrice'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number; volume?: number }>

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
  // Live price baked into the title — same self-answering pattern as /mercado
  // and /mercado/inmag. Lifts CTR for "precio novillo arrendamiento" (was pos
  // ~9 with ~0.9% CTR: lots of page-1 impressions, almost no clicks).
  title: `Índice Novillo Arrendamiento Hoy: $${inmag.current.toLocaleString('es-AR')}/kg · Cañuelas`,
  description: `Índice Novillo Arrendamiento actual: $${inmag.current.toLocaleString('es-AR')}/kg. Precio actualizado del índice para contratos de arrendamiento rural en Argentina. Cotización diaria Liniers y Cañuelas.`,
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
      answer: 'El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 10 kg de novillo por hectárea, y el campo tiene 500 ha, con un índice de $4.329/kg, el canon mensual sería aproximadamente $21.645.000. Los contratos suelen estipular un promedio mensual del índice.'
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
    creator: { '@type': 'Organization', name: 'Mercado Agroganadero de Buenos Aires' },
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
  const isUp = inmag.change >= 0
  const recentSeries = series.slice(-90) // 90 days for better trend visibility
  const last30 = series.slice(-30)
  const minVal = Math.min(...last30.map(s => s.value))
  const maxVal = Math.max(...last30.map(s => s.value))
  const avgVal = last30.reduce((a, b) => a + b.value, 0) / last30.length
  
  // Calculate 30d change
  const change30d = ((last30[last30.length - 1]?.value - last30[0]?.value) / last30[0]?.value * 100)

  // Example calculation for 500ha @ 8kg/ha
  const exampleHectareas = 500
  const exampleKgPerHa = 8
  const exampleCanon = exampleHectareas * exampleKgPerHa * inmag.current

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <ArrendamientoSchema />
      <FAQSchema />
      
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-zinc-950 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full" />
          
          <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
              <Link href="/" className="hover:text-zinc-300 transition-colors">Inicio</Link>
              <span className="text-zinc-700">/</span>
              <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
              <span className="text-zinc-700">/</span>
              <span className="text-amber-400">Arrendamiento</span>
            </nav>

            {/* Main heading */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
              <div>
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

              {/* Hero Price Card */}
              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 min-w-[320px]">
                <div className="text-sm text-zinc-500 mb-2 font-medium">Índice Hoy</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl lg:text-6xl font-bold text-white font-mono tracking-tight">
                    <AnimatedPrice 
                      value={inmag.current} 
                      duration={2800}
                      prefix="$"
                      decimals={2}
                    />
                  </span>
                  <span className="text-zinc-500 text-lg">/kg</span>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    isUp 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    <span className="text-lg">{isUp ? '↑' : '↓'}</span>
                    <span>{isUp ? '+' : ''}{inmag.change.toFixed(2)}%</span>
                  </div>
                  <div className="text-sm text-zinc-500">
                    vs. anterior: <span className="text-zinc-300">${fmt(inmag.prev)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Mínimo 30d', value: `$${fmt(minVal)}`, sublabel: 'Por kg vivo' },
                { label: 'Máximo 30d', value: `$${fmt(maxVal)}`, sublabel: 'Por kg vivo' },
                { label: 'Promedio 30d', value: `$${fmt(avgVal)}`, sublabel: 'Por kg vivo' },
                { label: 'Variación 30d', value: `${change30d >= 0 ? '+' : ''}${change30d.toFixed(1)}%`, sublabel: 'vs. hace 30 días', highlight: true },
              ].map((stat) => (
                <div 
                  key={stat.label} 
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-colors"
                >
                  <div className="text-xs text-zinc-500 font-medium mb-1">{stat.label}</div>
                  <div className={`text-2xl font-bold font-mono ${
                    stat.highlight 
                      ? change30d >= 0 ? 'text-emerald-400' : 'text-red-400'
                      : 'text-white'
                  }`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-zinc-600 mt-1">{stat.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
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
              accentColor="#f59e0b"
              showVolume={true}
            />
          </Suspense>
        </section>

        {/* Cierre mensual — captura producer-facing (el que liquida arrendamiento) */}
        <section className="max-w-6xl mx-auto px-4 pb-8">
          <CierreMensualSubscribe
            accent="amber"
            withLease
            subtitle="El 1° de cada mes te llega el promedio del Índice Novillo del mes que cerró. Si guardaste tu cálculo arriba, recibís directamente tu canon actualizado. Gratis, un email por mes."
          />
        </section>

        {/* Monthly Averages Table */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Promedios Mensuales del Índice</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Los contratos de arrendamiento suelen utilizar el promedio mensual del índice para calcular el canon.
          </p>
          
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-500">Mes</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500">Promedio</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500 hidden sm:table-cell">Mínimo</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500 hidden sm:table-cell">Máximo</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500 hidden md:table-cell">Ruedas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {monthlyAverages.map((month, i) => {
                    const prevMonth = monthlyAverages[i + 1]
                    const change = prevMonth ? ((month.avg - prevMonth.avg) / prevMonth.avg * 100) : 0
                    const changeUp = change >= 0
                    
                    return (
                      <tr 
                        key={month.month} 
                        className="hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-zinc-300 text-sm capitalize">{formatMonth(month.month)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-mono font-medium">${fmt(month.avg)}</span>
                          <span className="text-zinc-600 text-sm ml-1">/kg</span>
                          {prevMonth && (
                            <span className={`ml-2 text-xs font-mono ${changeUp ? 'text-emerald-400' : 'text-red-400'}`}>
                              {changeUp ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right hidden sm:table-cell">
                          <span className="text-zinc-500 font-mono text-sm">${fmt(month.min)}</span>
                        </td>
                        <td className="px-6 py-4 text-right hidden sm:table-cell">
                          <span className="text-zinc-500 font-mono text-sm">${fmt(month.max)}</span>
                        </td>
                        <td className="px-6 py-4 text-right hidden md:table-cell">
                          <span className="text-zinc-600 text-sm">{month.count}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-xs text-zinc-600">Últimos 12 meses</span>
              <Link 
                href="/api/market/history?days=365&format=csv"
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
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
                a: `El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 8 kg de novillo por hectárea, y el campo tiene 500 ha, con el índice actual de $${fmt(inmag.current)}/kg, el canon mensual sería de $${fmt(exampleCanon)}.`
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
      </div>
    </>
  )
}
