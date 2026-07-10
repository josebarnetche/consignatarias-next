import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import SpreadClient from './SpreadClient'

export const revalidate = 86400

const PAGE_URL = 'https://www.consignatarias.com.ar/mercado/spread'

// ── Número vivo (se interpola en build; la página revalida a diario) ──────────
// Respetamos el MISMO cálculo del tool cliente (SpreadClient / /api/market/spread):
// spread = novillo en USD/kg ÷ maíz en USD/kg = kg de maíz que se compran con 1 kg
// de novillo vivo. A mayor valor, más margen para el engorde a corral.
const novillo = Math.round(marketPrices.categories.novillos.current) // ARS/kg vivo (INMAG)
const corn = marketPrices.corn.current // USD/tonelada (MAGyP FOB)
const usd = marketPrices.usdBlue.current // ARS/USD (referencia)
const lastUpdate = marketPrices.lastUpdate

const fmt = (n: number) => n.toLocaleString('es-AR')

const novilloUsd = novillo / usd // USD/kg vivo
const cornUsdKg = corn / 1000 // USD/kg de maíz
const ratio = novilloUsd / cornUsdKg // kg de maíz por kg de novillo
const ratioStr = ratio.toFixed(1)
const UMBRAL = 12 // umbral de referencia de rentabilidad del feedlot (12:1)

// FAQ reutilizado en el FAQPageSchema y en el <dl> visible (answer-first).
const FAQ = [
  {
    question: '¿Qué es la relación maíz/novillo?',
    answer:
      `La relación maíz/novillo mide cuántos kilos de maíz se compran con un kilo de novillo vivo: hoy (${lastUpdate}) es de ${ratioStr}:1, con el novillo a $${fmt(novillo)}/kg (INMAG) y el maíz a US$${corn}/tn (MAGyP FOB). Es el termómetro de rentabilidad del engorde a corral — a mayor valor, más margen para el feedlot. Es una referencia de mercado, no un precio fijado por esta página.`,
  },
  {
    question: '¿Cuándo conviene el feedlot?',
    answer:
      `El engorde a corral tiende a ser rentable cuando la relación supera el umbral de referencia de ${UMBRAL}:1; por debajo, el margen se comprime porque el maíz pesa cerca del 73% del costo directo. Hoy (${lastUpdate}) la relación es de ${ratioStr}:1, ${ratio >= UMBRAL ? `por encima del umbral ${UMBRAL}:1` : `por debajo del umbral ${UMBRAL}:1`}.`,
  },
  {
    question: '¿Cómo se calcula?',
    answer:
      `Se divide el precio del novillo en USD/kg por el precio del maíz en USD/kg. Tomamos el novillo INMAG ($${fmt(novillo)}/kg, convertido a USD con un dólar de referencia de $${fmt(usd)}) y el maíz FOB MAGyP (US$${corn}/tn = US$${cornUsdKg.toFixed(3)}/kg), lo que da ${ratioStr}:1 al ${lastUpdate}.`,
  },
]

export const metadata: Metadata = {
  title: `Relación Maíz/Novillo Argentina 2026: ${ratioStr}:1 | Rentabilidad Feedlot`,
  description: `La relación maíz/novillo mide la rentabilidad del feedlot: hoy (${lastUpdate}) es de ${ratioStr}:1 con el novillo a $${fmt(novillo)}/kg (INMAG) y el maíz a US$${corn}/tn (MAGyP FOB). Umbral de referencia 12:1, actualizado a diario.`,
  keywords: [
    'relacion maiz novillo rentabilidad feedlot',
    'relacion maiz novillo',
    'rentabilidad feedlot argentina',
    'costo engorde ganado',
    'precio maiz ganaderia',
    'spread ganadero',
    'indicador feedlot',
    'conversion maiz carne',
    'cuando conviene el feedlot',
  ],
  openGraph: {
    title: `Relación Maíz/Novillo — ${ratioStr}:1 · Rentabilidad Feedlot`,
    description: `Indicador clave para feedlots: cuántos kilos de maíz se compran con un kilo de novillo. Hoy ${ratioStr}:1 (${lastUpdate}). Actualizado a diario.`,
    url: PAGE_URL,
    type: 'article',
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function SpreadPage() {
  return (
    <>
      {/* ── Capa AEO (server-rendered, número vivo interpolado en build) ──── */}
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Relación Maíz/Novillo: rentabilidad del feedlot"
        cssSelectors={['h1', '.speakable-content']}
      />
      <DatasetSchema
        name="Relación Maíz/Novillo Argentina"
        description="Indicador de rentabilidad feedlot: ratio entre precio de novillo INMAG (ARS/kg vivo) y maíz FOB MAGyP (USD/tn), convertido a USD/kg. Actualizado a diario."
        url={PAGE_URL}
        keywords={[
          'relación maíz novillo',
          'rentabilidad feedlot',
          'spread ganadero',
          'costo engorde',
          'engorde a corral',
        ]}
        dateModified={lastUpdate}
      />

      {/* ── Bloque answer-first (respuesta citable a la head-query) ───────── */}
      <section className="max-w-4xl mx-auto px-4 pt-8">
        <nav className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span>/</span>
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span>/</span>
          <span className="text-zinc-300">Relación Maíz/Novillo</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-3">
          Relación Maíz/Novillo: rentabilidad del feedlot
        </h1>

        <p className="speakable-content text-zinc-300 leading-relaxed">
          La relación maíz/novillo mide cuántos kilos de maíz se compran con un kilo de
          novillo e indica la rentabilidad del feedlot: hoy ({lastUpdate}) el novillo cotiza{' '}
          <strong>${fmt(novillo)}/kg</strong> y el maíz <strong>US${corn}/tn</strong>, lo que da
          una relación de <strong>{ratioStr}:1</strong> (a mayor valor, más margen para el
          engorde a corral).
        </p>

        <p className="text-zinc-400 text-sm leading-relaxed mt-3">
          El umbral de referencia del mercado es de <strong>{UMBRAL}:1</strong>: por encima, el
          corral trabaja con aire sobre el punto de equilibrio; por debajo, el margen se comprime
          porque el maíz pesa cerca del 73% del costo directo del engorde. Con la relación actual
          de {ratioStr}:1, el indicador está{' '}
          {ratio >= UMBRAL ? 'por encima' : 'por debajo'} de ese umbral. Es una referencia de
          mercado calculada con datos públicos (INMAG y maíz FOB MAGyP); no es un precio fijado por
          esta página, y cada operación se resuelve con el costo de compra y el grano asegurado.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/que-es-un-feedlot" className="text-accent hover:underline">
            ¿Qué es un feedlot? →
          </Link>
          <Link href="/mercado/novillos" className="text-accent hover:underline">
            Precio del novillo →
          </Link>
        </div>
      </section>

      {/* Herramienta interactiva: la relación en vivo + decisión operativa */}
      <SpreadClient />

      {/* ── FAQ visible (mismo array que el FAQPageSchema) ────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Relación maíz/novillo: preguntas frecuentes
          </h2>
          <dl className="space-y-4">
            {FAQ.map((faq) => (
              <div key={faq.question}>
                <dt className="text-zinc-200 font-medium mb-1">{faq.question}</dt>
                <dd className="text-zinc-400 text-sm leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="text-zinc-600 text-xs mt-6">
            Fuentes: INMAG (Mercado Agroganadero) y maíz FOB MAGyP. Dato de referencia del mercado,
            no fijado por esta página. Actualizado: {lastUpdate} · Memola Medios S.A.S.
          </div>
        </div>
      </section>
    </>
  )
}
