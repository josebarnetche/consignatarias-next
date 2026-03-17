import { Metadata } from 'next'
import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { PriceSparkline, InlineSparkline } from '@/components/PriceSparkline'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number }>

export const metadata: Metadata = {
  title: 'INMAG - Índice Novillo Mercado Agroganadero Argentina 2026',
  description: `INMAG actual: $${inmag.current.toLocaleString('es-AR')}/kg. Índice Novillo del Mercado Agroganadero de Buenos Aires. Cotización diaria, histórico de precios, y referencia del mercado ganadero argentino.`,
  keywords: [
    'INMAG',
    'inmag precio',
    'indice novillo',
    'inmag hoy',
    'mercado agroganadero',
    'precio novillo argentina',
    'inmag actual',
    'cotizacion novillo',
    'mercado ganadero argentina',
    'precio hacienda',
  ],
  openGraph: {
    title: `INMAG Hoy: $${inmag.current.toLocaleString('es-AR')}/kg | Índice Novillo Argentina`,
    description: `Índice Novillo del Mercado Agroganadero (INMAG) actualizado. Variación: ${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%. Referencia principal del mercado de hacienda argentino.`,
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/mercado/inmag',
  },
}

// JSON-LD Schema for INMAG
function InmagSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'INMAG - Índice Novillo Mercado Agroganadero',
    description: 'Índice de precios del novillo en el Mercado Agroganadero de Buenos Aires, Argentina. Referencia principal del mercado de hacienda.',
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
    keywords: ['INMAG', 'índice novillo', 'precio ganado', 'mercado ganadero'],
    creator: {
      '@type': 'Organization',
      name: 'Mercado Agroganadero de Buenos Aires',
    },
    temporalCoverage: `${series[0]?.date}/${series[series.length - 1]?.date}`,
    distribution: {
      '@type': 'DataDownload',
      contentUrl: 'https://www.consignatarias.com.ar/api/precios',
      encodingFormat: 'application/json',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function InmagPage() {
  const changeColor = inmag.change >= 0 ? 'text-green-400' : 'text-red-400'
  const changeSign = inmag.change >= 0 ? '+' : ''
  
  // Get last 30 days of data for mini chart
  const recentSeries = series.slice(-30)
  const minVal = Math.min(...recentSeries.map(s => s.value))
  const maxVal = Math.max(...recentSeries.map(s => s.value))

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <InmagSchema />
      
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">INMAG</span>
        </nav>

        {/* Main heading */}
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
          INMAG - Índice Novillo Mercado Agroganadero
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          El Índice Novillo del Mercado Agroganadero (INMAG) es la referencia principal del mercado de 
          hacienda en Argentina. Representa el precio promedio del novillo en el Mercado Agroganadero 
          de Buenos Aires, expresado en pesos por kilogramo vivo.
        </p>

        {/* Current price card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-baseline gap-4 mb-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">INMAG Actual</div>
              <div className="text-4xl font-bold text-zinc-100">
                ${fmt(inmag.current)}
                <span className="text-lg text-zinc-500 ml-1">/kg</span>
              </div>
            </div>
            <div className={`text-lg font-medium ${changeColor}`}>
              {changeSign}{inmag.change.toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Anterior</div>
              <div className="text-zinc-300">${fmt(inmag.prev)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Mínimo 30d</div>
              <div className="text-zinc-300">${fmt(minVal)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Máximo 30d</div>
              <div className="text-zinc-300">${fmt(maxVal)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Variación 30d</div>
              <div className={recentSeries[recentSeries.length - 1]?.value >= recentSeries[0]?.value ? 'text-green-400' : 'text-red-400'}>
                {((recentSeries[recentSeries.length - 1]?.value - recentSeries[0]?.value) / recentSeries[0]?.value * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Visual Price Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400">Tendencia de Precios</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <InlineSparkline data={recentSeries} width={48} height={16} />
              <span>Últimos 30 días</span>
            </div>
          </div>
          <PriceSparkline data={recentSeries} height={120} />
        </div>

        {/* Historical data */}
        <h2 className="text-lg font-medium text-zinc-200 mb-3">Histórico INMAG - Últimos 30 días</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-2 text-zinc-500 font-medium">Fecha</th>
                  <th className="px-4 py-2 text-zinc-500 font-medium text-right">Precio ($/kg)</th>
                  <th className="px-4 py-2 text-zinc-500 font-medium text-right">Variación</th>
                </tr>
              </thead>
              <tbody>
                {recentSeries.slice().reverse().slice(0, 15).map((point, i, arr) => {
                  const prev = arr[i + 1]?.value
                  const change = prev ? ((point.value - prev) / prev * 100) : 0
                  return (
                    <tr key={point.date} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-400">{formatDate(point.date)}</td>
                      <td className="px-4 py-2 text-zinc-200 text-right font-mono">${fmt(point.value)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {prev ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* What is INMAG section */}
        <h2 className="text-lg font-medium text-zinc-200 mb-3">¿Qué es el INMAG?</h2>
        <div className="prose prose-invert prose-zinc max-w-none text-sm text-zinc-400 space-y-3 mb-6">
          <p>
            El <strong className="text-zinc-200">INMAG (Índice Novillo Mercado Agroganadero)</strong> es el indicador 
            de referencia del mercado de hacienda en Argentina. Se calcula diariamente basándose en las operaciones 
            del Mercado Agroganadero de Buenos Aires.
          </p>
          <p>
            El índice representa el precio promedio ponderado del novillo tipo exportación, expresado en pesos 
            argentinos por kilogramo vivo. Es utilizado como referencia por productores, consignatarias, frigoríficos 
            y operadores del mercado ganadero para establecer precios de compra-venta de hacienda.
          </p>
          <p>
            El Mercado Agroganadero de Buenos Aires publica el INMAG cada día hábil, junto con los precios 
            por categoría (novillos, novillitos, vaquillonas, vacas, toros, terneros). Esta información es 
            fundamental para la formación de precios en todo el territorio argentino.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-200 font-medium">Ver precios completos del mercado</div>
            <div className="text-zinc-500 text-sm">Todas las categorías, maíz, dólar y más</div>
          </div>
          <Link 
            href="/mercado" 
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium rounded hover:bg-amber-500/20 transition-colors"
          >
            Ver Mercado
          </Link>
        </div>

        {/* Source */}
        <p className="text-xs text-zinc-600 mt-6">
          Fuente: Mercado Agroganadero de Buenos Aires (mercadoagroganadero.com.ar). 
          Datos actualizados automáticamente cada día hábil.
        </p>
      </div>
    </>
  )
}
