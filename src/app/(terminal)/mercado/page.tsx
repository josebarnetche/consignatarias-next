import { Metadata } from 'next'
import MercadoClient from './MercadoClient'

export const metadata: Metadata = {
  title: 'Precios Ganado Argentina | INMAG y Categorías',
  description: 'Precios INMAG actualizados, cotización por categoría de hacienda (novillos, terneros, vaquillonas, vacas, toros), maíz USD y dólar blue.',
  keywords: [
    'precio ganado argentina',
    'INMAG precio',
    'precio novillo',
    'precio ternero',
    'precio vaquillona',
    'mercado ganadero',
    'cotizacion hacienda',
  ],
  openGraph: {
    title: 'Precios del Mercado Ganadero | INMAG | Consignatarias.com.ar',
    description: 'INMAG promedio, precios por categoría y referencias macro actualizadas.',
    url: 'https://www.consignatarias.com.ar/mercado',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/mercado',
  },
}

export default function MercadoPage() {
  return <MercadoClient />
}
