import { Metadata } from 'next'
import Link from 'next/link'
import { BreadcrumbSchema, FAQPageSchema, SpeakableSchema, DatasetSchema } from '@/components/seo/JsonLd'
import HerramientasCTA from '@/components/HerramientasCTA'
import PriceThresholdAlertSignup from '@/components/PriceThresholdAlertSignup'
import marketPrices from '@/lib/data/market-prices.json'

// Rebuild diario: el JSON se refresca cada tarde (14:00 ART) vía scraper → git commit → Vercel.
export const revalidate = 86400

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

const CATEGORIES = [
  { slug: 'novillos', title: 'Novillo', singular: 'novillo' },
  { slug: 'novillitos', title: 'Novillito', singular: 'novillito' },
  { slug: 'vaquillonas', title: 'Vaquillona', singular: 'vaquillona' },
  { slug: 'vacas', title: 'Vaca', singular: 'vaca' },
  { slug: 'toros', title: 'Toro', singular: 'toro' },
  { slug: 'terneros', title: 'Ternero', singular: 'ternero' },
] as const

const lastUpdate = (marketPrices as { lastUpdate?: string }).lastUpdate ?? new Date().toISOString().slice(0, 10)

// Números vivos derivados del JSON para interpolar en SERP, panel answer-first y schemas.
const inmag = marketPrices.inmag as { current: number; change: number }
const inmagChange = inmag.change
const inmagChangeStr = `${inmagChange >= 0 ? '+' : ''}${inmagChange}%`
const novilloLive = Math.round(marketPrices.categories.novillos.current)
const vacaLive = Math.round(marketPrices.categories.vacas.current)
const terneroLive = Math.round(marketPrices.categories.terneros.current)

// 1ª oración citable — head-query "precios de hacienda hoy" respondida con el número exacto y su fecha.
const ANSWER_LEAD = `Hoy en el Mercado Agroganadero: novillo $${fmt(novilloLive)}/kg, vaca $${fmt(vacaLive)}/kg, ternero $${fmt(terneroLive)}/kg vivo. INMAG $${fmt(inmag.current)} (${inmagChangeStr}). Actualizado ${lastUpdate}.`

export const metadata: Metadata = {
  title: `Precios de Hacienda Hoy — Novillo $${fmt(novilloLive)}, Vaca $${fmt(vacaLive)}, Ternero $${fmt(terneroLive)}/kg · INMAG`,
  description: `Precios de hacienda al ${lastUpdate}: novillo $${fmt(novilloLive)}/kg, vaca $${fmt(vacaLive)}/kg, ternero $${fmt(terneroLive)}/kg vivo. INMAG $${fmt(inmag.current)} (${inmagChangeStr}). Kilo vivo en ARS desde el Mercado Agroganadero, con histórico y panel de categorías. Consulta libre.`,
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/precios',
  },
  openGraph: {
    title: `Precios de Hacienda Hoy — Novillo $${fmt(novilloLive)}/kg`,
    description: `Precios de hacienda al ${lastUpdate}: novillo $${fmt(novilloLive)}/kg, vaca $${fmt(vacaLive)}/kg, ternero $${fmt(terneroLive)}/kg vivo. INMAG $${fmt(inmag.current)}. Actualizado diariamente desde MAG.`,
    url: 'https://www.consignatarias.com.ar/precios',
    type: 'website',
  },
}

const FAQ_PRECIOS = [
  {
    question: '¿Cuánto vale el novillo hoy?',
    answer: `El kilo vivo de novillo cotiza a $${fmt(novilloLive)} en el Mercado Agroganadero (MAG-Cañuelas). El INMAG, referencia del novillo de exportación, cerró en $${fmt(inmag.current)} (${inmagChangeStr} semanal). Actualizado el ${lastUpdate}.`,
  },
  {
    question: '¿Cuánto vale la vaca hoy?',
    answer: `El kilo vivo de vaca cotiza a $${fmt(vacaLive)} en el Mercado Agroganadero. Es un promedio de plaza: las subcategorías (especial, conserva, manufactura) tienen dispersión de precio según tipificación. Actualizado el ${lastUpdate}.`,
  },
  {
    question: '¿Cuánto vale el ternero hoy?',
    answer: `El kilo vivo de ternero cotiza a $${fmt(terneroLive)} en el Mercado Agroganadero. El ternero de invernada suele cotizar por encima del gordo por la demanda de recría y engorde. Actualizado el ${lastUpdate}.`,
  },
  {
    question: '¿Dónde se actualizan los precios?',
    answer: 'Los precios se actualizan diariamente con el cierre del Mercado Agroganadero (MAG-Cañuelas), publicador del INMAG. Los datos pasan por el flujo automático del sitio cada tarde (15:30 ART).',
  },
  {
    question: '¿Qué referencia uso para vender o comprar?',
    answer: 'El INMAG es la referencia que toma el mercado bovino argentino para el novillo de exportación. Para otras categorías (vaca, ternero, etc.) los precios cambian más por canal: usar el promedio de remate como ancla, no un precio único.',
  },
  {
    question: '¿El precio de remate es lo mismo que el precio MAG?',
    answer: 'No siempre. El MAG es plaza concentrada; el remate de campo puede tener primas o descuentos por tipificación, sanidad y logística. Sirven como referencias complementarias.',
  },
  {
    question: '¿Cuánto pesa cada categoría?',
    answer: 'Pesos típicos: novillo 400–480 kg, novillito 250–300 kg, vaquillona 280–350 kg, vaca 380+ kg, toro 600+ kg, ternero 160–220 kg. El precio se cotiza por kilo vivo.',
  },
]

interface CategoryPrice {
  current: number
  prev: number
  change: number
}

export default function PreciosHubPage() {
  const cats = marketPrices.categories as Record<string, CategoryPrice>
  const inmagPrice = cats.novillos?.current

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Mercado', url: 'https://www.consignatarias.com.ar/mercado' },
          { name: 'Precios de hacienda', url: 'https://www.consignatarias.com.ar/precios' },
        ]}
      />
      <FAQPageSchema items={FAQ_PRECIOS} />
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/precios"
        headline={ANSWER_LEAD}
        cssSelectors={['h1', '.speakable-content']}
      />
      <DatasetSchema
        name={`Precios de hacienda por categoría — Mercado Agroganadero (${lastUpdate})`}
        description={`Kilo vivo en ARS por categoría (novillo, novillito, vaquillona, vaca, toro, ternero) y referencia INMAG del novillo de exportación, publicados por el Mercado Agroganadero (MAG-Cañuelas). Unidad: $/kg vivo. Fecha: ${lastUpdate}.`}
        url="https://www.consignatarias.com.ar/precios"
        keywords={['precios hacienda', 'novillo', 'vaca', 'ternero', 'INMAG', 'kilo vivo', 'Mercado Agroganadero', 'MAG']}
        dateModified={lastUpdate}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 text-zinc-300">
        {/* Breadcrumb */}
        <nav className="mb-4 text-xxs font-terminal uppercase tracking-wider text-zinc-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Precios</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-3 leading-tight">
          Precios de hacienda hoy
        </h1>

        {/* Panel answer-first: la 1ª oración lista los números vivos con fecha —
            citable por IA/voz (Speakable) y respuesta directa a "precios de hacienda hoy". */}
        <section className="mb-6 rounded-terminal border border-accent/40 bg-accent/[0.06] p-4 sm:p-5">
          <p className="speakable-content text-sm sm:text-base text-zinc-200 leading-relaxed">
            {ANSWER_LEAD}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-px bg-terminal-border overflow-hidden rounded-terminal">
            <div className="bg-terminal-panel p-3">
              <dt className="text-xxs uppercase tracking-wider text-zinc-500">Novillo</dt>
              <dd className="text-xl font-terminal tabular-nums text-zinc-100">${fmt(novilloLive)}</dd>
            </div>
            <div className="bg-terminal-panel p-3">
              <dt className="text-xxs uppercase tracking-wider text-zinc-500">Vaca</dt>
              <dd className="text-xl font-terminal tabular-nums text-zinc-100">${fmt(vacaLive)}</dd>
            </div>
            <div className="bg-terminal-panel p-3">
              <dt className="text-xxs uppercase tracking-wider text-zinc-500">Ternero</dt>
              <dd className="text-xl font-terminal tabular-nums text-zinc-100">${fmt(terneroLive)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xxs uppercase tracking-wider text-zinc-500">
            $/kg vivo · Mercado Agroganadero (MAG-Cañuelas) · INMAG <span className={`tabular-nums ${inmagChange >= 0 ? 'val-positive' : 'val-negative'}`}>${fmt(inmag.current)} ({inmagChangeStr})</span>
          </p>
        </section>
        <p className="text-sm text-zinc-400 mb-1">
          Kilo vivo en ARS desde el Mercado Agroganadero (MAG-Cañuelas). Actualizado: <span className="text-zinc-200 tabular-nums">{lastUpdate}</span>.
        </p>
        {inmagPrice && (
          <p className="text-sm text-zinc-400 mb-6">
            INMAG (novillo de exportación): <span className="text-positive tabular-nums font-terminal">${fmt(inmagPrice)}/kg</span>
          </p>
        )}

        {/* Category grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-terminal-border mb-8">
          {CATEGORIES.map((c) => {
            const data = cats[c.slug]
            if (!data) return null
            const positive = data.change >= 0
            return (
              <Link
                key={c.slug}
                href={`/precios/${c.slug}`}
                className="bg-terminal-panel p-4 hover:bg-terminal-panel/70 transition-colors group"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xxs uppercase tracking-wider text-zinc-500">{c.title}</span>
                  <span className={`text-xxs tabular-nums font-terminal ${positive ? 'val-positive' : 'val-negative'}`}>
                    {positive ? '+' : ''}{data.change.toFixed(1)}%
                  </span>
                </div>
                <div className="text-2xl font-terminal tabular-nums text-zinc-100 group-hover:text-positive transition-colors">
                  ${fmt(data.current)}
                </div>
                <div className="text-xxs text-zinc-500 mt-1">por kg vivo</div>
              </Link>
            )
          })}
        </section>

        {/* Alerta de precio por umbral — la retención más pegajosa: seteás un número
            redondo y esperás el ping. Captura el tráfico (mayormente IA) que viene a
            mirar el precio y se va. */}
        {inmagPrice && (
          <section className="mb-8">
            <PriceThresholdAlertSignup
              category="inmag"
              categoryLabel="novillo"
              currentPrice={inmagPrice}
              page="/precios"
            />
          </section>
        )}

        {/* Related pages */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <Link href="/precios/hacienda-en-pie" className="border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 mb-1">Vista consolidada</div>
            <div className="text-sm text-zinc-200">Precio hacienda en pie hoy</div>
            <div className="text-xs text-zinc-500 mt-1">Todos los kilos vivos en una sola página, con tendencia.</div>
          </Link>
          <Link href="/mercado/inmag" className="border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 mb-1">Índice de referencia</div>
            <div className="text-sm text-zinc-200">INMAG diario</div>
            <div className="text-xs text-zinc-500 mt-1">Serie histórica desde 2015, chart interactivo, comparable USD.</div>
          </Link>
          <Link href="/mercado/spread" className="border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 mb-1">Relación Maíz/Novillo</div>
            <div className="text-sm text-zinc-200">Rentabilidad feedlot</div>
            <div className="text-xs text-zinc-500 mt-1">Cuántos kg de maíz por kilo de novillo — proxy de margen.</div>
          </Link>
          <Link href="/mercado/inmag-dolares" className="border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 mb-1">Real terms</div>
            <div className="text-sm text-zinc-200">INMAG en dólares</div>
            <div className="text-xs text-zinc-500 mt-1">Novillo en USD oficial y blue, comparable interanual.</div>
          </Link>
        </section>

        {/* CTA de conversión: precios → directorio de consignatarias.
            /precios es un top-landing de IA y hasta ahora era un dead-end:
            mostraba el precio pero no ofrecía el siguiente paso (a quién venderle). */}
        <section className="mb-8 rounded-terminal border border-accent/40 bg-accent/[0.06] p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="mb-3 sm:mb-0">
            <div className="text-base font-heading text-zinc-100">¿Querés vender a estos precios?</div>
            <div className="text-sm text-zinc-400">Encontrá la consignataria que remata tu zona y contactala directo.</div>
          </div>
          <Link
            href="/consignatarias"
            className="inline-flex items-center gap-2 rounded-terminal bg-accent px-4 py-2.5 text-sm font-semibold text-terminal-bg hover:bg-accent-bright transition-colors whitespace-nowrap"
          >
            Ver consignatarias &rarr;
          </Link>
        </section>

        {/* Cosas para hacer — surfacea las herramientas pegajosas. */}
        <HerramientasCTA exclude="/precios" />

        {/* FAQ */}
        <section className="border-t border-terminal-border pt-6">
          <h2 className="text-lg font-heading text-zinc-100 mb-4">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {FAQ_PRECIOS.map((f, i) => (
              <details key={i} className="border border-terminal-border bg-terminal-panel rounded-terminal">
                <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-200 hover:text-zinc-100">
                  {f.question}
                </summary>
                <div className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
