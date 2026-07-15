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
  title: `Mercado Ganadero Argentina Hoy: INMAG $${fmt(inmag)}`,
  description: `INMAG $${fmt(inmag)}/kg vivo (${changeStr}), dólar blue $${fmt(usdBlue)}, maíz USD ${corn}/tn. Terminal del mercado ganadero argentino actualizada diariamente con remates, precios y frigoríficos.`,
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
    title: `Mercado Ganadero Hoy — INMAG $${fmt(inmag)} (${changeStr})`,
    description: `Terminal unificada del mercado bovino argentino. Remates, INMAG diario, frigoríficos y referencias macro.`,
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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4">
        <PreofertasActivas />
      </div>
      <OverviewClient />
    </>
  )
}
