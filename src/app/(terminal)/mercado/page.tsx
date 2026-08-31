import { Metadata } from 'next'
import Link from 'next/link'
import MercadoClient from './MercadoClient'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { LongTermChart } from '@/components/market/LongTermChart'
import LoginGate from '@/components/LoginGate'
import { SeasonalPattern } from '@/components/market/SeasonalPattern'
import { CategoryComparison } from '@/components/market/CategoryComparison'
import { YearOverYearBlock } from '@/components/market/YearOverYearBlock'
import { SeasonalityHeatmap } from '@/components/market/SeasonalityHeatmap'
import { ElCorredorCTA } from '@/components/ElCorredorCTA'
import { ChicagoReference } from '@/components/market/ChicagoReference'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import { OfrecerInforme } from '@/components/productos/OfrecerInforme'

export const revalidate = 86400 // daily rebuild via Vercel

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
    answer: `El precio del kilo vivo de novillo en Argentina es de $${fmt(novillo)} según el INMAG del ${INMAG_DATE}, con variación semanal de ${inmagChangeStr}. Es la referencia diaria del Mercado Agroganadero de Buenos Aires.`,
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
  // Owns the "precio kilo vivo (de) novillo hoy" cluster — deliberately distinct from
  // /mercado/inmag (which owns "inmag hoy") to avoid cannibalization. Dropped the raw
  // date from the title (looked like noise in the SERP), added the live variation arrow.
  title: `Precio Kilo Vivo Novillo Hoy: $${fmt(novillo)}/kg (${inmagChangeStr})`,
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
    title: `Precio Kilo Vivo Novillo Hoy $${fmt(novillo)} — INMAG ${INMAG_DATE}`,
    description: `Novillo $${fmt(novillo)} · Ternero $${fmt(ternero)} · Vaquillona $${fmt(vaquillona)} · Vaca $${fmt(vaca)}. Mercado Agroganadero argentino actualizado diariamente.`,
    url: 'https://www.consignatarias.com.ar/mercado',
    type: 'website',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
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
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/mercado"
        headline="Precios del mercado ganadero argentino hoy: novillo, categorías y dólar"
      />
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
          cotizaciones del dolar blue y oficial de dolarapi.com. Como referencia
          internacional sumamos los futuros de hacienda de Chicago (CME) — novillo
          gordo (Live Cattle) e invernada (Feeder Cattle) — convertidos a USD/kg vivo.
        </p>
        <p>
          Todos los datos se actualizan automaticamente cada dia habil.
        </p>
      </section>
      <MercadoClient />

      {/* Referencia internacional — futuros de hacienda de Chicago (CME) en USD/kg */}
      <div className="px-4 pt-3 pb-1 max-w-6xl mx-auto">
        <ChicagoReference />
        <div className="mt-2 text-right">
          <Link
            href="/mercado/internacional"
            className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright transition-colors"
          >
            Ver referencia internacional + comparación con el novillo local →
          </Link>
        </div>
      </div>

      {/* Precios hub teaser — internal link target for /precios SEO */}
      <div className="px-4 pt-2 pb-1 max-w-6xl mx-auto">
        <Link
          href="/precios"
          className="block border border-terminal-border bg-terminal-panel/60 px-panel py-3 hover:border-accent transition-colors"
        >
          <span className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Ver precios por categoría →
          </span>
          <p className="text-zinc-300 text-data mt-1">
            Novillo, novillito, vaquillona, vaca, toro y ternero — kilo vivo desde el MAG, actualizado a diario.
          </p>
        </Link>
      </div>

      {/* El Corredor — lead magnet with inline email capture (high-traffic hub) */}
      <div className="px-4 pt-3 pb-2 max-w-6xl mx-auto">
        <ElCorredorCTA variant="card" context="mercado" />
      </div>

      {/* Year-over-year + USD landing teaser */}
      <div className="px-4 pt-2 pb-4 max-w-6xl mx-auto">
        <YearOverYearBlock />
        <div className="mt-3 text-center">
          <Link
            href="/mercado/inmag-dolares"
            className="inline-block px-4 py-2 text-xxs font-terminal uppercase tracking-wider border transition-colors"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
            }}
          >
            Ver INMAG en dólares blue (10 años) →
          </Link>
        </div>
      </div>

      {/* Herramientas gratis: estacionalidad + calculadora CTA */}
      <div className="px-4 py-4 max-w-6xl mx-auto space-y-4">
        <SeasonalityHeatmap />
        <div
          className="terminal-panel"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(180deg, rgba(56,189,248,0.04), transparent)',
          }}
        >
          <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
            Calculadora ¿Vendo ahora?
          </div>
          <div className="px-panel py-5 flex flex-col md:flex-row md:items-center gap-4">
            <p className="text-zinc-300 text-data flex-1">
              Ingresá tu categoría y peso vivo. Te devolvemos valor por cabeza
              en ARS + USD, percentil últimos 30 y 365 días, y lectura
              estadística del momento de venta.
            </p>
            <Link
              href="/mercado/vender-ahora"
              className="terminal-btn whitespace-nowrap"
              style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
            >
              Abrir calculadora →
            </Link>
          </div>
        </div>
      </div>

      {/* Long-term historical data */}
      <div className="px-4 py-4 max-w-6xl mx-auto space-y-6">
        <LoginGate feature="La serie histórica del novillo" minHeight={320}>
        <LongTermChart />
        </LoginGate>
        <CategoryComparison />
        <SeasonalPattern />

        {/* El parte semanal. Va al final: la página ya dio el precio, la serie, la
            comparación por categoría y la estacionalidad. */}
        <OfrecerInforme
          producto="parte-semanal-mercado"
          desde="/mercado"
          titulo="El movimiento de la semana, resumido y en tu casilla"
          loQueAgrega={[
            'Qué se movió y por qué, cada lunes, sin que tengas que entrar a mirar.',
            'El número del novillo en pesos y en dólares, con la variación de la semana.',
            'Las categorías que se apartaron de su promedio — que es donde suele estar la oportunidad.',
          ]}
          gratisAca="El precio del día, la serie y los gráficos de esta página son gratis y van a seguir siéndolo."
        />
      </div>
    </>
  )
}
