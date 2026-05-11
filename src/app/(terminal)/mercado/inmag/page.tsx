import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import marketData from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
import { ElCorredorCTA } from '@/components/ElCorredorCTA'
import { AnimatedPrice } from '@/components/AnimatedPrice'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number; volume?: number }>

export const metadata: Metadata = {
  title: 'INMAG - Índice Novillo Mercado Agroganadero Argentina 2026',
  description: `INMAG actual: $${inmag.current.toLocaleString('es-AR')}/kg. Índice Novillo del Mercado Agroganadero de Buenos Aires. Cotización diaria, histórico de precios, y referencia del mercado ganadero argentino.`,
  keywords: [
    'INMAG', 'inmag precio', 'indice novillo', 'inmag hoy', 'mercado agroganadero',
    'precio novillo argentina', 'inmag actual', 'cotizacion novillo', 'mercado ganadero argentina',
  ],
  openGraph: {
    title: `INMAG Hoy: $${inmag.current.toLocaleString('es-AR')}/kg | Índice Novillo Argentina`,
    description: `Índice Novillo del Mercado Agroganadero (INMAG) actualizado. Variación: ${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%. Referencia principal del mercado de hacienda argentino.`,
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
    type: 'website',
  },
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/inmag' },
}

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
                  Índice Novillo
                  <span className="block text-emerald-400">INMAG</span>
                </h1>
                <p className="text-zinc-400 max-w-xl text-lg">
                  Referencia principal del mercado de hacienda argentino.
                  Precio promedio del novillo en el Mercado Agroganadero de Buenos Aires.
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

        {/* El Oráculo — manifiesto fundacional */}
        <section className="max-w-6xl mx-auto px-4 pb-6">
          <Link
            href="/el-oraculo"
            className="block group bg-zinc-900/40 border border-sky-500/30 hover:border-sky-400/60 rounded-xl px-5 py-4 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
                  <span className="relative rounded-full h-2 w-2 bg-sky-400" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-0.5">
                    Manifiesto fundacional
                  </div>
                  <div className="text-sm font-mono text-white truncate">
                    <strong>El Oráculo</strong>
                    <span className="text-zinc-500 mx-1.5">·</span>
                    <span className="text-zinc-300">por qué el INMAG fija el precio del 88%</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-sky-400 group-hover:text-sky-300 whitespace-nowrap shrink-0">
                Leer →
              </span>
            </div>
          </Link>
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
                  {recentSeries.slice().reverse().slice(0, 15).map((point, i, arr) => {
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
            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-xs text-zinc-600">Mostrando últimos 15 días</span>
              <Link 
                href="/api/market/history?days=365&format=csv"
                className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                Descargar histórico completo
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Link>
            </div>
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
                ¿Qué es el INMAG?
              </h3>
              <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                <p>
                  El <strong className="text-zinc-200">INMAG (Índice Novillo Mercado Agroganadero)</strong> es el 
                  indicador de referencia del mercado de hacienda en Argentina.
                </p>
                <p>
                  Se calcula diariamente basándose en las operaciones del Mercado Agroganadero de Buenos Aires, 
                  representando el precio promedio ponderado del novillo tipo exportación en pesos por kilogramo vivo.
                </p>
                <p>
                  Es utilizado por productores, consignatarias, frigoríficos y operadores del mercado ganadero 
                  para establecer precios de compra-venta de hacienda en todo el territorio argentino.
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
