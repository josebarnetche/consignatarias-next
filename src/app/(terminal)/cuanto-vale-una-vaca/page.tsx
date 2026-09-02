import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
  DefinedTermSetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { SiguientePaso } from '@/components/seo/SiguientePaso'

export const revalidate = 86400 // daily rebuild via Vercel

const PAGE_URL = 'https://www.consignatarias.com.ar/cuanto-vale-una-vaca'

// Live values interpolated at build time for the SERP snippet + answer-first sentence
const vacaKg = Math.round(marketPrices.categories.vacas.current)
const lastUpdate = marketPrices.lastUpdate
const usdBlue = marketPrices.usdBlue.current
const fmt = (n: number) => n.toLocaleString('es-AR')
const vacaUsdKg = Math.round((vacaKg / usdBlue) * 100) / 100

// Rango de peso típico de una vaca de descarte/conserva/manufactura para faena
const WEIGHTS = [380, 400, 420, 450]
const vaca420 = vacaKg * 420
const vaca400 = vacaKg * 400
const vaca450 = vacaKg * 450

// FAQ — preguntas que el usuario tipea literalmente en Google / recibe la IA
const VACA_FAQ = [
  {
    question: '¿Cuánto vale una vaca en Argentina en 2026?',
    answer: `Hoy una vaca viva vale alrededor de $${fmt(vacaKg)} por kilo vivo en el Mercado Agroganadero (${lastUpdate}). Una vaca de ~420 kg ronda los $${fmt(vaca420)}; según el peso, el valor va de $${fmt(vaca400)} (400 kg) a $${fmt(vaca450)} (450 kg). Es el precio mayorista de referencia del animal en pie, no el precio de la carne en la carnicería.`,
  },
  {
    question: '¿Cuánto vale una vaca preñada o con cría al pie?',
    answer: `Una vaca preñada o con ternero al pie vale más que su valor de faena porque se paga por su función reproductiva, no por kilo de carne. Sobre el piso de faena (~$${fmt(vaca420)} para una vaca de 420 kg al valor del ${lastUpdate}), una vaca preñada suele sumar un plus por el ternero esperado y una vaca con cría al pie se cotiza como "vaca + ternero". El precio depende de la genética, la edad, el estado de preñez y la zona, y se define en remate o venta particular, no por el índice de faena.`,
  },
  {
    question: '¿Cuánto pesa una vaca en Argentina?',
    answer: 'Una vaca adulta de razas de carne (Angus, Hereford y cruzas) en Argentina pesa habitualmente entre 380 y 500 kg de peso vivo. Las vacas de descarte o conserva que van a faena suelen rondar los 400–450 kg. El peso vivo es el que se usa para calcular el valor a partir del precio por kilo del Mercado Agroganadero.',
  },
]

// Entidad citable — definición canónica de "vaca" como categoría de mercado
const VACA_TERMS = [
  {
    name: 'Vaca',
    description:
      'Hembra bovina adulta que ya ha parido. Como categoría del mercado ganadero argentino, "vaca" agrupa a las hembras de descarte, conserva y manufactura que se comercializan para faena, cotizadas en pesos por kilo vivo en el Mercado Agroganadero de Buenos Aires. Se distingue de la vaquillona (hembra que aún no parió) y de la vaca de cría o preñada, que se valúa por su función reproductiva y no por kilo de carne.',
    url: 'https://www.consignatarias.com.ar/mercado/vacas',
  },
]

export const metadata: Metadata = {
  // Gana el cluster "cuanto sale/cuesta/vale una vaca (viva) en argentina 2026".
  // Distinta de /mercado/vacas y /precios/vacas (intención mayorista/serie) para no canibalizar.
  title: `Cuánto Vale una Vaca en Argentina 2026: $${fmt(vacaKg)}/kg vivo`,
  description: `Hoy una vaca viva vale ~$${fmt(vacaKg)} por kilo vivo (Mercado Agroganadero, ${lastUpdate}). Una vaca de 420 kg ronda los $${fmt(vaca420)}. Tabla por peso, valor en USD y qué es precio mayorista vs. carnicería.`,
  keywords: [
    'cuanto vale una vaca',
    'cuanto sale una vaca viva en argentina',
    'cuanto cuesta una vaca en argentina',
    'cuanto vale una vaca 2026',
    'precio de una vaca',
    'cuanto sale una vaca',
    'valor de una vaca',
    'cuanto pesa una vaca',
    'vaca preñada precio',
    'precio vaca kilo vivo',
  ],
  openGraph: {
    title: `Cuánto vale una vaca en Argentina 2026 — $${fmt(vacaKg)}/kg vivo`,
    description: `Una vaca de 420 kg ronda los $${fmt(vaca420)} al valor del Mercado Agroganadero (${lastUpdate}). Tabla por peso + valor en dólares.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoValeUnaVacaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="cuanto-vale-una-vaca" sectionName="Cuánto vale una vaca" />
      <FAQPageSchema items={VACA_FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Cuánto vale una vaca en Argentina en 2026: $${fmt(vacaKg)} por kilo vivo`}
      />
      <DefinedTermSetSchema
        name="Vaca — categoría del mercado ganadero argentino"
        description="Definición de la vaca como categoría de comercialización de hacienda en Argentina."
        url={PAGE_URL}
        terms={VACA_TERMS}
      />
      <DatasetSchema
        name="Precio de la vaca en el Mercado Agroganadero"
        description={`Precio del kilo vivo de vaca en el Mercado Agroganadero de Buenos Aires: $${fmt(vacaKg)}/kg al ${lastUpdate}. Referencia mayorista del animal en pie para faena.`}
        url={PAGE_URL}
        keywords={['vaca', 'precio kilo vivo', 'mercado agroganadero', 'hacienda', 'Argentina']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Cuánto vale una vaca
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto vale una vaca en Argentina en 2026
        </h1>

        {/* Answer-first: primera oración = la que gana el featured snippet */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Hoy una vaca viva en Argentina vale alrededor de{' '}
          <strong>${fmt(vacaKg)} por kilo vivo</strong> (Mercado Agroganadero, {lastUpdate}); una
          vaca de ~420 kg ronda los <strong>${fmt(vaca420)}</strong>.
        </p>

        <p className="mb-4">
          Ese es el precio <strong>mayorista de referencia del animal en pie</strong> para faena —
          la vaca de descarte, conserva o manufactura que se comercializa por kilo vivo en el
          Mercado Agroganadero de Buenos Aires. En dólares, el kilo vivo equivale a unos{' '}
          <strong>USD {vacaUsdKg}</strong> (dólar blue ${fmt(usdBlue)}), y una vaca de 420 kg a
          unos <strong>USD {fmt(Math.round(vaca420 / usdBlue))}</strong>. Como el valor total sale
          de multiplicar el precio por kilo por el peso del animal, conviene mirar el rango por
          peso.
        </p>

        <SiguientePaso
          desde="/cuanto-vale-una-vaca"
          titulo="¿Y tu tropa cuánto vale?"
          detalle="Poné categoría, cabezas y peso y sale el total a precio del Mercado Agroganadero de hoy, en pesos y en dólares."
          href="/calculadora"
          accion="Valuar mi tropa"
        />

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cuánto vale una vaca según su peso
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Peso vivo</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Valor aprox. (ARS)
                </th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Valor aprox. (USD)
                </th>
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map((w) => (
                <tr key={w} className="border-b border-terminal-border/60">
                  <td className="px-3 py-2 text-zinc-300">{w} kg</td>
                  <td className="px-3 py-2 text-right text-zinc-200">${fmt(vacaKg * w)}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    USD {fmt(Math.round((vacaKg * w) / usdBlue))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Kilo vivo de vaca ${fmt(vacaKg)} (Mercado Agroganadero, {lastUpdate}). Valores redondeados
          al precio del día; el precio real de cada operación varía por calidad, tipificación y
          negociación.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Vaca de faena vs. vaca de cría o preñada
        </h2>
        <p className="mb-4">
          El número de arriba corresponde a la <strong>vaca de faena</strong> (manufactura,
          conserva o descarte), que se paga por kilo de carne. Una{' '}
          <strong>vaca preñada o con cría al pie</strong> se valúa distinto: se paga por su función
          reproductiva —el ternero esperado o al pie— y no solo por su peso. Por eso una vaca de
          cría suele valer más que su piso de faena, y el precio se define en remate o venta
          particular según genética, edad, estado de preñez y zona, no por el índice de faena.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Es precio mayorista, no precio de carnicería
        </h2>
        <p className="mb-4">
          Estos valores son del <strong>animal vivo en el mercado mayorista</strong>. No son el
          precio de la carne en la carnicería: entre la vaca en pie y la góndola están la faena, el
          rendimiento de la res (una vaca rinde en gancho bastante menos que su peso vivo), el
          transporte, el desposte y los márgenes de frigorífico y comercio. El kilo de carne al
          público es varias veces el kilo vivo del animal.
        </p>

        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/vacas" className="text-accent hover:text-accent-bright transition-colors">
              Precio de la vaca en el Mercado Agroganadero →
            </Link>{' '}
            serie diaria del kilo vivo, histórico y variación.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/precios/vacas" className="text-accent hover:text-accent-bright transition-colors">
              Precios por categoría: vacas →
            </Link>{' '}
            comparación con novillo, vaquillona, ternero y toro, actualizado a diario desde el MAG.
          </p>
        </div>
      </article>
    </>
  )
}
