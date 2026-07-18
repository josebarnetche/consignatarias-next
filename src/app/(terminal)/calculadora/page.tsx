import { Metadata } from 'next'
import CalculadoraClient from './CalculadoraClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const metadata: Metadata = {
  title: 'Calculadora de Precios de Hacienda',
  description: 'Calculá el valor estimado de tu hacienda con precios INMAG actualizados. Novillos, terneros, vaquillonas, vacas y toros.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Calculadora de Precios de Hacienda',
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
      <WebApplicationSchema
        name="Calculadora de Precios de Hacienda"
        description="Herramienta gratuita para calcular el valor estimado de tu hacienda con precios INMAG actualizados."
        url="https://www.consignatarias.com.ar/calculadora"
        applicationCategory="FinanceApplication"
        features={[
          'Cálculo de valor de novillos',
          'Cálculo de valor de terneros',
          'Cálculo de valor de vaquillonas',
          'Cálculo de valor de vacas',
          'Cálculo de valor de toros',
          'Precios INMAG actualizados',
        ]}
      />
      <CalculadoraClient prices={marketPrices} />
    </>
  )
}
