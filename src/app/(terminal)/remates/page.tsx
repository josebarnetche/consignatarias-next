import { Metadata } from 'next'
import RematesClient from './RematesClient'

export const metadata: Metadata = {
  title: 'Calendario de Remates Ganaderos Argentina',
  description: 'Calendario unificado de remates ganaderos de múltiples consignatarias argentinas. Filtrá por provincia, tipo de remate y fecha. Actualizado en tiempo real.',
  keywords: [
    'remates ganaderos',
    'calendario remates',
    'subastas hacienda',
    'remates invernada',
    'remates cria',
    'consignatarias argentina',
  ],
  openGraph: {
    title: 'Calendario de Remates Ganaderos | Consignatarias.com.ar',
    description: 'Todos los remates de múltiples consignatarias en un solo calendario. Filtros por provincia, tipo y fecha.',
    url: 'https://www.consignatarias.com.ar/remates',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/remates',
  },
}

export default function RematesPage() {
  return <RematesClient />
}
