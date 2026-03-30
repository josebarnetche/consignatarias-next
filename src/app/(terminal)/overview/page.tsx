import { Metadata } from 'next'
import OverviewClient from './OverviewClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'

// Regenerate every hour so TODAY stays fresh
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Terminal de Mercado Ganadero Argentino',
  description: 'Dashboard unificado del mercado ganadero argentino. Remates próximos, precios INMAG, frigoríficos y referencias macro en tiempo real.',
  keywords: [
    'mercado ganadero argentina',
    'terminal ganadero',
    'dashboard hacienda',
    'inteligencia ganadera',
  ],
  openGraph: {
    title: 'Terminal de Inteligencia Ganadera | Consignatarias.com.ar',
    description: 'Remates, precios y frigoríficos en una sola interfaz.',
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
