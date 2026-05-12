import { Metadata } from 'next'
import MercadoClient from './MercadoClient'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { LongTermChart } from '@/components/market/LongTermChart'
import { SeasonalPattern } from '@/components/market/SeasonalPattern'
import { CategoryComparison } from '@/components/market/CategoryComparison'
import marketPrices from '@/lib/data/market-prices.json'

// Build-time interpolated current prices for SERP snippet
const novillo = Math.round(marketPrices.categories.novillos.current)
const ternero = Math.round(marketPrices.categories.terneros.current)
const vaquillona = Math.round(marketPrices.categories.vaquillonas.current)
const vaca = Math.round(marketPrices.categories.vacas.current)
const inmagChange = marketPrices.inmag.change
const inmagChangeStr = `${inmagChange >= 0 ? '+' : ''}${inmagChange}%`
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// FAQ items — questions copy the exact strings users type into Google
const MERCADO_FAQ = [
  {
    question: '¿Cuánto está el kilo vivo de novillo hoy?',
    answer: `Hoy el kilo vivo de novillo cotiza a $${fmt(novillo)} en el Mercado Agroganadero (INMAG ${inmagChangeStr} semanal). Vaquillona $${fmt(vaquillona)}, vaca $${fmt(vaca)}, ternero $${fmt(ternero)}. Actualizado el ${lastUpdate}.`,
  },
  {
    question: '¿Cuál es el precio del kilo vivo de novillo en Argentina?',
    answer: `El precio del kilo vivo de novillo en Argentina es de $${fmt(novillo)} según el INMAG del ${lastUpdate}, con variación semanal de ${inmagChangeStr}. Es la referencia diaria del Mercado Agroganadero de Buenos Aires.`,
  },
  {
    question: '¿Cuánto sale un ternero vivo en Argentina 2026?',
    answer: `El kilo vivo de ternero está a $${fmt(ternero)} (${lastUpdate}). Un ternero promedio de 180 kg ronda los $${fmt(ternero * 180)} a precio de mercado. La categoría ternero suele cotizar 10% por encima del novillo por menor disponibilidad y mayor demanda de feedlots.`,
  },
  {
    question: '¿Qué es el índice INMAG?',
    answer: 'El Índice Novillo del Mercado Agroganadero (INMAG) es el precio promedio del novillo en el Mercado Agroganadero de Buenos Aires, expresado en pesos por kilo vivo. Es la referencia principal para compradores y vendedores de hacienda en Argentina.',
  },
  {
    question: '¿Cada cuánto se actualiza el precio del ganado?',
    answer: 'Los precios se actualizan automáticamente cada día hábil. El INMAG se publica diariamente por el Mercado Agroganadero y los precios por categoría reflejan las operaciones del día anterior.',
  },
  {
    question: '¿Cuál es la diferencia entre precio de novillo y novillito?',
    answer: 'El novillo es un macho castrado de más de 300kg, mientras que el novillito pesa entre 250-300kg. Generalmente el novillito tiene un precio por kilo ligeramente superior debido a su carne más tierna y mayor demanda para cortes premium.',
  },
]

export const metadata: Metadata = {
  title: `Precio Kilo Vivo Novillo Hoy: $${fmt(novillo)} (INMAG ${lastUpdate}) | Consignatarias.com.ar`,
  description: `Precio del kilo vivo de novillo hoy: $${fmt(novillo)} (INMAG ${inmagChangeStr}). Ternero $${fmt(ternero)}, vaquillona $${fmt(vaquillona)}, vaca $${fmt(vaca)}. Actualizado ${lastUpdate} desde Mercado Agroganadero.`,
  keywords: [
    'precio kilo vivo novillo',
    'cuanto esta el kilo vivo de novillo',
    'precio del kilo vivo de novillo',
    'kilo de novillo',
    'kilo vivo de novillo',
    'kg novillo',
    'precio ganado argentina',
    'INMAG precio',
    'precio novillo',
    'precio ternero',
    'precio vaquillona',
    'hacienda en pie',
    'mercado ganadero',
    'cotizacion hacienda',
  ],
  openGraph: {
    title: `Precio Kilo Vivo Novillo Hoy $${fmt(novillo)} — INMAG ${lastUpdate}`,
    description: `Novillo $${fmt(novillo)} · Ternero $${fmt(ternero)} · Vaquillona $${fmt(vaquillona)} · Vaca $${fmt(vaca)}. Mercado Agroganadero argentino actualizado diariamente.`,
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
      <FAQPageSchema items={MERCADO_FAQ} />
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
        <CategoryComparison />
        <SeasonalPattern />
      </div>
    </>
  )
}
