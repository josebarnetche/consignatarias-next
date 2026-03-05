import { Metadata } from 'next'
import OverviewClient from './OverviewClient'

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
  return <OverviewClient />
}
