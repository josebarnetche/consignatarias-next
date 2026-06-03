import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import marketData from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
import { ElCorredorCTA } from '@/components/ElCorredorCTA'
import CierreMensualSubscribe from '@/components/CierreMensualSubscribe'
import { AnimatedPrice } from '@/components/AnimatedPrice'
import HistoryDownloadPro from '@/components/market/HistoryDownloadPro'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number; volume?: number }>

export const metadata: Metadata = {
  // SEO-tuned title: "INMAG" first, live price baked in, "Hoy" for query match.
  // Price refreshes daily via the build-trigger cron, so this stays accurate.
  title: `INMAG Hoy $${inmag.current.toLocaleString('es-AR')}/kg vivo · Índice Novillo Mercado Agroganadero`,
  description: `INMAG ${inmag.current.toLocaleString('es-AR')} ARS/kg vivo (${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(2)}% vs. anterior). Cotización del Índice Novillo del Mercado Agroganadero de Buenos Aires, actualizada cada día hábil. Histórico, metodología y referencia del mercado ganadero argentino.`,
  keywords: [
    'INMAG', 'inmag precio', 'inmag hoy', 'inmag actual',
    'índice novillo', 'indice novillo', 'indice mercado agroganadero',
    'mercado agroganadero', 'cotización novillo', 'cotizacion novillo',
    'precio novillo argentina', 'precio kilo vivo novillo',
    'inmag mercado agroganadero', 'inmag canuelas', 'inmag cañuelas',
  ],
  openGraph: {
    title: `INMAG Hoy: $${inmag.current.toLocaleString('es-AR')}/kg vivo · Índice Novillo Argentina`,
    description: `Índice Novillo del Mercado Agroganadero (INMAG): ${inmag.current.toLocaleString('es-AR')} ARS/kg, ${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}% vs. anterior. Referencia diaria del mercado de hacienda argentino.`,
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
    type: 'website',
  },
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/inmag' },
}

// FAQ items targeting the "people also ask" variants that surround the INMAG
// query. Each Q is exactly how a productor / asesor would type it on Google.
const INMAG_FAQS = [
  {
    question: '¿Qué es el INMAG?',
    answer: 'El INMAG (Índice Novillo Mercado Agroganadero) es el indicador diario que refleja el precio promedio ponderado del novillo en el Mercado Agroganadero de Cañuelas (ex Liniers). Se publica cada día hábil al cierre de operaciones y se usa como referencia de precio para compras, ventas y contratos de arrendamiento rural en toda la cadena ganadera argentina.',
  },
  {
    question: '¿Cuánto vale el INMAG hoy?',
    answer: `Al último cierre, el INMAG es de $${inmag.current.toLocaleString('es-AR')} por kilo vivo, con una variación de ${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(2)}% respecto del día anterior. El valor actualiza diariamente con el cierre del Mercado Agroganadero.`,
  },
  {
    question: '¿Cómo se calcula el INMAG?',
    answer: 'El INMAG es un promedio ponderado por volumen del precio del novillo tipo exportación operado en el Mercado Agroganadero. Pondera todos los lotes negociados en el día por cantidad de cabezas y por kilos vivos vendidos. El cálculo lo publica directamente el Mercado Agroganadero al cierre de cada jornada de remates.',
  },
  {
    question: '¿Dónde sale el INMAG?',
    answer: 'El INMAG lo publica el Mercado Agroganadero de Cañuelas (mercadoagroganadero.com.ar) al cierre de cada día hábil. En esta página replicamos el valor del día, el histórico desde 2015, y la metodología, todo actualizado automáticamente cada tarde.',
  },
  {
    question: '¿Cuándo se actualiza el INMAG?',
    answer: 'Cada día hábil entre las 17 y las 19 horas (ART), después del cierre de operaciones del Mercado Agroganadero. Los fines de semana y feriados no hay valor nuevo: el INMAG opera con calendario hábil del mercado.',
  },
  {
    question: '¿Para qué sirve el INMAG?',
    answer: 'Productores, consignatarios, frigoríficos y traders usan el INMAG para fijar precios de compra-venta de hacienda, para revisar contratos de arrendamiento rural (que suelen indexarse al INMAG en kilos de novillo), y como anchor del valor de los rodeos. Es la referencia más usada del mercado bovino argentino.',
  },
  {
    question: '¿Qué diferencia hay entre INMAG y Cañuelas / Liniers?',
    answer: 'El Mercado Agroganadero (MAG) opera desde 2018 en Cañuelas, y reemplazó al histórico Mercado de Liniers que operó hasta 2018 en CABA. El INMAG es el mismo indicador metodológico — primero de Liniers, hoy de Cañuelas. Cuando alguien dice "precio Liniers" en el campo, suele referirse al INMAG actual.',
  },
]

// JSON-LD Schema
function InmagSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'INMAG - Índice Novillo Mercado Agroganadero',
    description: 'Índice de precios del novillo en el Mercado Agroganadero de Buenos Aires, Argentina.',
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
    keywords: ['INMAG', 'índice novillo', 'precio ganado', 'mercado ganadero'],
    creator: { '@type': 'Organization', name: 'Mercado Agroganadero de Buenos Aires' },
    temporalCoverage: `${series[0]?.date}/${series[series.length - 1]?.date}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'Argentina' },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// DefinedTerm — entity-level "¿qué es el INMAG?" definition. More precise than
// Dataset for the head term "inmag" / "que es el inmag" and feeds the featured
// snippet (position 0) even when the organic listing sits at pos ~7.
function InmagDefinedTermSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': 'https://www.consignatarias.com.ar/glosario#inmag',
    name: 'INMAG',
    alternateName: 'Índice Novillo Mercado Agroganadero',
    description:
      'El INMAG (Índice Novillo Mercado Agroganadero) es el precio promedio ponderado por volumen del novillo en el Mercado Agroganadero de Cañuelas (ex Liniers), expresado en pesos por kilo vivo y publicado al cierre de cada día hábil. Es la referencia de precio más usada del mercado ganadero argentino.',
    inDefinedTermSet: 'https://www.consignatarias.com.ar/glosario#set',
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InmagPage() {
  const isUp = inmag.change >= 0
  const recentSeries = series.slice(-30)
  const minVal = Math.min(...recentSeries.map(s => s.value))
  const maxVal = Math.max(...recentSeries.map(s => s.value))
  const avgVal = recentSeries.reduce((a, b) => a + b.value, 0) / recentSeries.length
  
  // Calculate 30d change
  const change30d = ((recentSeries[recentSeries.length - 1]?.value - recentSeries[0]?.value) / recentSeries[0]?.value * 100)

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <InmagSchema />
      <InmagDefinedTermSchema />
      <FAQPageSchema items={INMAG_FAQS} />
      
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" />
          
          <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
              <Link href="/" className="hover:text-zinc-300 transition-colors">Inicio</Link>
              <span className="text-zinc-700">/</span>
              <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
              <span className="text-zinc-700">/</span>
              <span className="text-emerald-400">INMAG</span>
            </nav>

            {/* Main heading */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                    EN VIVO
                  </span>
                  <span className="text-sm text-zinc-500">Actualizado hoy</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
                  <span className="block text-emerald-400">INMAG</span>
                  Índice Novillo Mercado Agroganadero
                </h1>
                {/* Clean definition lede — first prose on the page, written as a
                    self-contained snippet so Google can lift it for "qué es el inmag". */}
                <p className="text-zinc-400 max-w-xl text-lg">
                  El <strong className="text-zinc-200">INMAG (Índice Novillo Mercado Agroganadero)</strong> es
                  el precio promedio ponderado del novillo en el Mercado Agroganadero de Cañuelas (ex Liniers),
                  publicado al cierre de cada día hábil. Es la referencia de precio más usada del mercado
                  ganadero argentino, con histórico desde 2015 y metodología abierta.
                </p>
              </div>

              {/* Hero Price Card */}
              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 min-w-[320px]">
                <div className="text-sm text-zinc-500 mb-2 font-medium">Precio Actual</div>
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

        {/* Cierre mensual — captura producer-facing */}
        <section className="max-w-6xl mx-auto px-4 pt-2 pb-6">
          <CierreMensualSubscribe
            accent="emerald"
            subtitle="El 1° de cada mes te llega el promedio del INMAG del mes que cerró — el cierre que usás de referencia. Gratis, un email por mes."
          />
        </section>

        {/* Chart Section */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Evolución del Precio</h2>
            <Link 
              href="/api-docs" 
              className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
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
              accentColor="#10b981"
              showVolume={true}
            />
          </Suspense>
        </section>

        {/* Variantes y comparativas del INMAG — internal-link panel
            Crucial: diversifies anchor text feeding the related pages so
            "INMAG en dólares", "INMAG arrendamiento" and "INMAG vs maíz"
            queries discover the right sibling.                              */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Variantes del INMAG</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link
              href="/mercado/inmag-dolares"
              className="block bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors group"
            >
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">INMAG en dólares</div>
              <div className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors mb-1">
                INMAG / USD blue
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                El novillo deflactado por dólar paralelo. 10+ años de serie. Sirve para
                comparar poder de compra real del kilo vivo a través del tiempo.
              </p>
            </Link>
            <Link
              href="/mercado/arrendamiento"
              className="block bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors group"
            >
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">INMAG para arrendamiento</div>
              <div className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors mb-1">
                Índice novillo arrendamiento
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Cotización mensual del INMAG aplicada a contratos de arrendamiento rural,
                que típicamente se pactan en kilos de novillo.
              </p>
            </Link>
            <Link
              href="/mercado/spread"
              className="block bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors group"
            >
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">INMAG vs maíz FOB</div>
              <div className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors mb-1">
                Spread maíz–novillo
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Relación entre el precio del kilo vivo del novillo y el grano de maíz. Una
                de las palancas centrales de la decisión de retención vs venta.
              </p>
            </Link>
          </div>
        </section>

        {/* El Corredor — lead magnet del cierre mensual */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <ElCorredorCTA variant="card" context="inmag" />
        </section>

        {/* PRO CTA */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <ProUpgradePrompt
            benefit="Productores revisan precios acá antes de vender. Que vean tus remates."
            context="inmag"
            variant="card"
          />
        </section>

        {/* Mi Ganado — surface the retention feature to price-lookers (P3) */}
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
                  valor actualizado a este mismo INMAG cada día — en pesos y en dólares. Gratis con tu cuenta.
                </p>
              </div>
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </section>

        {/* El novillo año por año — internal links to the historical year pages */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-4">El novillo año por año</h2>
          <p className="text-sm text-zinc-500 mb-4">
            ¿Cuánto valía el novillo cada año? Promedio del INMAG en pesos y en dólares, desde 2015.
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 2026 - 2015 + 1 }, (_, i) => 2015 + i).map((y) => (
              <Link
                key={y}
                href={`/mercado/inmag/${y}`}
                className="text-sm font-mono px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
              >
                {y}
              </Link>
            ))}
          </div>
        </section>

        {/* Historical Data Table */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Histórico de Precios</h2>

          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-500">Fecha</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500">Precio</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500">Variación</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-zinc-500 hidden sm:table-cell">Volumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {recentSeries.slice().reverse().slice(0, 30).map((point, i, arr) => {
                    const prev = arr[i + 1]?.value
                    const change = prev ? ((point.value - prev) / prev * 100) : 0
                    const changeUp = change >= 0
                    
                    return (
                      <tr 
                        key={point.date} 
                        className="hover:bg-zinc-800/20 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-zinc-300 text-sm">{formatDate(point.date)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-mono font-medium">${fmt(point.value)}</span>
                          <span className="text-zinc-600 text-sm ml-1">/kg</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {prev ? (
                            <span className={`inline-flex items-center gap-1 font-mono text-sm font-medium ${
                              changeUp ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              <span className="text-xs">{changeUp ? '↑' : '↓'}</span>
                              {changeUp ? '+' : ''}{change.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right hidden sm:table-cell">
                          <span className="text-zinc-500 font-mono text-sm">
                            {point.volume ? `${fmt(point.volume)} cab.` : '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Table footer */}
            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-600">Mostrando últimos 30 días hábiles</span>
              <HistoryDownloadPro />
            </div>
          </div>
        </section>

        {/* FAQ — visible content that mirrors the FAQPageSchema in head.
            Each Q&A is a featured-snippet candidate. Headings use <h3>
            with the literal question text so Google can match query→answer. */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas frecuentes sobre el INMAG</h2>
          <div className="space-y-4">
            {INMAG_FAQS.map(faq => (
              <details
                key={faq.question}
                className="group bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700/50 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium text-white">{faq.question}</h3>
                  <span className="text-zinc-500 text-xl leading-none mt-0.5 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-zinc-400 leading-relaxed mt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Info Section */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What is INMAG */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Sobre el INMAG
              </h3>
              <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                <p>
                  El <strong className="text-zinc-200">INMAG (Índice Novillo Mercado Agroganadero)</strong> es la
                  referencia de precio del mercado bovino argentino. Lo publica el Mercado Agroganadero de Cañuelas
                  (que reemplazó al histórico Liniers en 2018) al cierre de cada día hábil.
                </p>
                <p>
                  Representa el precio promedio ponderado por volumen del novillo tipo exportación, expresado en
                  pesos por kilogramo vivo. Lo usan productores, consignatarios, frigoríficos y operadores para
                  fijar precios de compra-venta de hacienda y para indexar contratos de arrendamiento rural.
                </p>
                <p>
                  En esta página replicamos el valor diario, el histórico desde 2015 y la metodología, actualizados
                  automáticamente cada tarde después del cierre del mercado.
                </p>
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              {/* API Access */}
              <Link 
                href="/api-docs"
                className="block bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                      API de Precios
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Accede a datos históricos de INMAG mediante nuestra API REST.
                    </p>
                    <code className="inline-block mt-3 px-3 py-1.5 bg-zinc-800/50 rounded-lg text-xs font-mono text-zinc-400">
                      GET /api/market/history?days=90
                    </code>
                  </div>
                  <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>

              {/* Methodology */}
              <Link 
                href="/metodologia"
                className="block bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                      Metodología
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Fuentes de datos, cálculo, ponderaciones y cobertura geográfica del índice.
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>

              {/* All Market Prices */}
              <Link 
                href="/mercado"
                className="block bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:bg-emerald-500/15 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                      Ver todos los precios
                    </h3>
                    <p className="text-sm text-emerald-400/70">
                      Todas las categorías, maíz, dólar y más indicadores del mercado.
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            </div>
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
