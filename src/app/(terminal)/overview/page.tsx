import { Metadata } from 'next'
import OverviewClient from './OverviewClient'
import PreofertasActivas from '@/components/PreofertasActivas'
import SinceLastVisit from '@/components/landing/SinceLastVisit'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'

// Regenerate every hour so TODAY stays fresh
export const revalidate = 3600

const TODAY = new Date().toISOString().slice(0, 10)
const inmag = Math.round(marketPrices.inmag.current)
const change = marketPrices.inmag.change
const changeStr = `${change >= 0 ? '+' : ''}${change}%`
const usdBlue = marketPrices.usdBlue.current
const corn = marketPrices.corn.current
const fmt = (n: number) => n.toLocaleString('es-AR')

export const metadata: Metadata = {
  // Distinto de /mercado/inmag ("INMAG hoy") y de /mercado (hub de precios): esta
  // es la pantalla de trabajo que junta precios, remates y el rodeo propio.
  title: 'Panel del mercado ganadero hoy: precios, remates y tu rodeo',
  description: `Todo en una pantalla: INMAG $${fmt(inmag)}/kg vivo (${changeStr}), los remates que vienen, el dólar blue $${fmt(usdBlue)}, el maíz USD ${corn}/tn y lo que vale tu rodeo con Mi Ganado.`,
  keywords: [
    'mercado ganadero argentina',
    'kilo de novillo',
    'kg novillo',
    'hacienda en pie',
    'INMAG hoy',
    'terminal ganadero',
    'dashboard hacienda',
    'inteligencia ganadera',
  ],
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Panel del mercado ganadero hoy: precios, remates y tu rodeo',
    description: 'Precios, remates que vienen, dólar, maíz y tu rodeo valuado, en una sola pantalla.',
    url: 'https://www.consignatarias.com.ar/overview',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/overview',
  },
}

// Snapshot ligero para "Desde tu última visita" (cliente). El INMAG date es la
// fecha del último punto de la serie; los remates, los próximos (date>=hoy).
const inmagSeries = marketPrices.inmag.series
const inmagSnapshotDate = inmagSeries[inmagSeries.length - 1]?.date ?? marketPrices.lastUpdate
const rematesUpcomingSnapshot = rematesData
  .filter((r) => r.date >= TODAY && r.status === 'scheduled')
  .map((r) => ({ date: r.date }))

export default function OverviewPage() {
  return (
    <>
      <SinceLastVisit
        snapshot={{
          inmagDate: inmagSnapshotDate,
          inmagValue: marketPrices.inmag.current,
          inmagChange: marketPrices.inmag.change,
          rematesUpcoming: rematesUpcomingSnapshot,
          lastUpdate: marketPrices.lastUpdate,
        }}
      />
      <SectionBreadcrumbSchema section="overview" sectionName="Terminal" />
      <WebApplicationSchema
        name="Terminal de Mercado Ganadero Argentino"
        description="Dashboard unificado con remates próximos, precios INMAG, frigoríficos y referencias macro del mercado ganadero argentino."
        url="https://www.consignatarias.com.ar/overview"
        applicationCategory="FinanceApplication"
        features={[
          'Remates programados',
          'Precios INMAG en tiempo real',
          'Índice de frigoríficos',
          'Cotización dólar',
          'Precio maíz FOB',
          'Estadísticas de mercado',
        ]}
      />
      {/* H1 en el server: la pantalla es un tablero, pero la página es indexable y
          sin H1 no decía de qué se trata. */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4">
        <h1 className="text-lg font-semibold text-ink">Panel del mercado ganadero</h1>
        <p className="text-sm text-zinc-500">Precios, remates que vienen y tu rodeo, en una sola pantalla.</p>
      </div>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4">
        <PreofertasActivas />
      </div>
      <OverviewClient />
    </>
  )
}
