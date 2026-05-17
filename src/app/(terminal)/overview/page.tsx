import { Metadata } from 'next'
import OverviewClient from './OverviewClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

// Regenerate every hour so TODAY stays fresh
export const revalidate = false // Cost optimization: static at build time

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

export default function OverviewPage() {
  return (
    <>
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
      <OverviewClient />
    </>
  )
}
