import { Metadata } from 'next'
import CalculadoraClient from './CalculadoraClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const metadata: Metadata = {
  title: 'Calculadora de Precios de Hacienda | Consignatarias.com.ar',
  description: 'Calculá el valor estimado de tu hacienda con precios INMAG actualizados. Novillos, terneros, vaquillonas, vacas y toros.',
  openGraph: {
    title: 'Calculadora de Precios de Hacienda | Consignatarias.com.ar',
    description: 'Estimá el valor de tu tropa con precios INMAG del día.',
    url: 'https://www.consignatarias.com.ar/calculadora',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/calculadora',
  },
}

export default function CalculadoraPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="calculadora" sectionName="Calculadora" />
      <CalculadoraClient prices={marketPrices} />
    </>
  )
}
