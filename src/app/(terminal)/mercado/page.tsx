import { Metadata } from 'next'
import MercadoClient from './MercadoClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { LongTermChart } from '@/components/market/LongTermChart'
import { SeasonalPattern } from '@/components/market/SeasonalPattern'

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
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-3xl">
        <h2 className="text-zinc-200 text-lg font-medium mb-2">Precios del mercado ganadero argentino</h2>
        <p className="mb-2">
          El Indice Novillo del Mercado Agroganadero (INMAG) es el precio promedio del novillo en el
          Mercado Agroganadero de Buenos Aires, expresado en pesos por kilo vivo. Es la referencia
          principal del mercado de hacienda argentino y se publica diariamente por el Mercado
          Agroganadero (mercadoagroganadero.com.ar).
        </p>
        <p className="mb-2">
          Los precios por categoria (novillos, novillitos, vaquillonas, vacas, toros) son{' '}
          <strong>precios observados</strong> del Mercado Agroganadero, no ratios sinteticos.
          El maiz FOB (USD/tn) se obtiene del Ministerio de Agricultura (MAGYP) y las
          cotizaciones del dolar blue y oficial de dolarapi.com.
        </p>
        <p>
          Todos los datos se actualizan automaticamente cada dia habil.
        </p>
      </section>
      <MercadoClient />
      
      {/* Long-term historical data */}
      <div className="px-4 py-4 max-w-6xl mx-auto space-y-6">
        <LongTermChart />
        <SeasonalPattern />
      </div>
    </>
  )
}
