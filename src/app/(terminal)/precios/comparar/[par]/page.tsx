import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { AnswerBlock } from '@/components/seo/AnswerBlock'
import { DataStamp } from '@/components/seo/DataStamp'
import { PriceCTA } from '@/components/PriceCTA'

/* ============================================================
   /precios/comparar/[par] — pairwise category comparison.
   Lives under the literal `comparar/` segment because two dynamic
   siblings ([categoria] + [par]) are forbidden by the App Router.
   Every figure is observed INMAG (current) — pure arithmetic, no estimate.
   ============================================================ */

type CategorySlug = 'novillos' | 'novillitos' | 'vaquillonas' | 'vacas' | 'toros' | 'terneros'

const CATEGORIES: Record<CategorySlug, { singular: string; title: string; articulo: 'un' | 'una' }> = {
  novillos: { singular: 'novillo', title: 'Novillo', articulo: 'un' },
  novillitos: { singular: 'novillito', title: 'Novillito', articulo: 'un' },
  vaquillonas: { singular: 'vaquillona', title: 'Vaquillona', articulo: 'una' },
  vacas: { singular: 'vaca', title: 'Vaca', articulo: 'una' },
  toros: { singular: 'toro', title: 'Toro', articulo: 'un' },
  terneros: { singular: 'ternero', title: 'Ternero', articulo: 'un' },
}

// Canonical order — must match the middleware 308 target and the sitemap block.
const COMPARE_ORDER: CategorySlug[] = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros']

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

function canonicalPairs(): string[] {
  const out: string[] = []
  for (let i = 0; i < COMPARE_ORDER.length; i++) {
    for (let j = i + 1; j < COMPARE_ORDER.length; j++) {
      out.push(`${COMPARE_ORDER[i]}-vs-${COMPARE_ORDER[j]}`)
    }
  }
  return out
}

export function generateStaticParams() {
  return canonicalPairs().map((par) => ({ par }))
}

export const dynamicParams = false

function parsePar(par: string): { a: CategorySlug; b: CategorySlug } | null {
  const parts = par.split('-vs-')
  if (parts.length !== 2) return null
  const [a, b] = parts as [CategorySlug, CategorySlug]
  const ia = COMPARE_ORDER.indexOf(a)
  const ib = COMPARE_ORDER.indexOf(b)
  if (ia < 0 || ib < 0 || a === b || ia >= ib) return null // canonical order only
  return { a, b }
}

function getPrices(a: CategorySlug, b: CategorySlug) {
  const cats = marketPrices.categories as Record<string, { current: number; change: number }>
  const priceA = Math.round(cats[a].current)
  const priceB = Math.round(cats[b].current)
  const changeA = cats[a].change
  const changeB = cats[b].change
  const higherSlug = priceA >= priceB ? a : b
  const lowerSlug = higherSlug === a ? b : a
  const higherPrice = Math.max(priceA, priceB)
  const lowerPrice = Math.min(priceA, priceB)
  const pct = lowerPrice > 0 ? Math.round((higherPrice / lowerPrice - 1) * 1000) / 10 : 0
  return { priceA, priceB, changeA, changeB, higherSlug, lowerSlug, higherPrice, lowerPrice, pct }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const artEl = (slug: CategorySlug) => (CATEGORIES[slug].articulo === 'una' ? 'la' : 'el')
const artDel = (slug: CategorySlug) => (CATEGORIES[slug].articulo === 'una' ? 'de la' : 'del')

function verdict(a: CategorySlug, b: CategorySlug, lastUpdate: string): string {
  const { higherSlug, lowerSlug, higherPrice, lowerPrice, pct } = getPrices(a, b)
  if (pct === 0) {
    return `${cap(artEl(a))} ${CATEGORIES[a].singular} y ${artEl(b)} ${CATEGORIES[b].singular} cotizan prácticamente igual (~$${fmt(higherPrice)}/kg vivo, INMAG ${lastUpdate}).`
  }
  return `${cap(artEl(higherSlug))} ${CATEGORIES[higherSlug].singular} ($${fmt(higherPrice)}/kg) cotiza un ${pct}% por encima ${artDel(lowerSlug)} ${CATEGORIES[lowerSlug].singular} ($${fmt(lowerPrice)}/kg) — INMAG, ${lastUpdate}.`
}

export async function generateMetadata({ params }: { params: Promise<{ par: string }> }): Promise<Metadata> {
  const { par } = await params
  const parsed = parsePar(par)
  if (!parsed) return { title: 'Comparación no encontrada' }
  const { a, b } = parsed
  const cats = marketPrices.categories as Record<string, unknown>
  if (!cats[a] || !cats[b]) return { title: 'Comparación no disponible' }
  const lastUpdate = marketPrices.lastUpdate
  const { priceA, priceB } = getPrices(a, b)
  const title = `${CATEGORIES[a].title} vs ${CATEGORIES[b].title}: precio del kilo vivo hoy (INMAG ${lastUpdate})`
  const description = `Comparación de precio en pie: ${CATEGORIES[a].singular} $${fmt(priceA)}/kg vs ${CATEGORIES[b].singular} $${fmt(priceB)}/kg (INMAG, ${lastUpdate}). ${verdict(a, b, lastUpdate)}`
  const url = `https://www.consignatarias.com.ar/precios/comparar/${par}`
  return {
    title,
    description,
    keywords: [
      `${CATEGORIES[a].singular} vs ${CATEGORIES[b].singular}`,
      `precio ${CATEGORIES[a].singular} ${CATEGORIES[b].singular}`,
      `qué conviene ${CATEGORIES[a].singular} o ${CATEGORIES[b].singular}`,
      'hacienda en pie',
      'mercado ganadero argentina',
    ],
    openGraph: { title, description, url, type: 'website' },
    alternates: { canonical: url },
  }
}

export default async function CompararPage({ params }: { params: Promise<{ par: string }> }) {
  const { par } = await params
  const parsed = parsePar(par)
  if (!parsed) notFound()
  const { a, b } = parsed
  const cats = marketPrices.categories as Record<string, unknown>
  if (!cats[a] || !cats[b]) notFound()
  const lastUpdate = marketPrices.lastUpdate
  const { priceA, priceB, changeA, changeB, pct, higherSlug, lowerSlug, higherPrice, lowerPrice } = getPrices(a, b)
  const v = verdict(a, b, lastUpdate)
  const rows: { slug: CategorySlug; price: number; change: number }[] = [
    { slug: a, price: priceA, change: changeA },
    { slug: b, price: priceB, change: changeB },
  ]

  const faqItems = [
    { question: `¿Qué vale más hoy, ${CATEGORIES[a].title} o ${CATEGORIES[b].title}?`, answer: v },
    {
      question: `¿Cuánto cuesta el kilo vivo de ${CATEGORIES[a].singular} hoy?`,
      answer: `$${fmt(priceA)}/kg vivo de ${CATEGORIES[a].singular} (INMAG, ${lastUpdate}).`,
    },
    {
      question: `¿Cuánto cuesta el kilo vivo de ${CATEGORIES[b].singular} hoy?`,
      answer: `$${fmt(priceB)}/kg vivo de ${CATEGORIES[b].singular} (INMAG, ${lastUpdate}).`,
    },
    {
      question: `¿Cuál es la diferencia de precio entre ${CATEGORIES[a].singular} y ${CATEGORIES[b].singular}?`,
      answer:
        pct === 0
          ? `Hoy cotizan prácticamente igual (INMAG, ${lastUpdate}).`
          : `$${fmt(higherPrice - lowerPrice)}/kg (${pct}%): ${CATEGORIES[higherSlug].singular} $${fmt(higherPrice)}/kg vs ${CATEGORIES[lowerSlug].singular} $${fmt(lowerPrice)}/kg (INMAG, ${lastUpdate}).`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section={`precios/comparar/${par}`} sectionName={`${CATEGORIES[a].title} vs ${CATEGORIES[b].title}`} />
      <FAQPageSchema items={faqItems} />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/precios/comparar/${par}`}
        headline={`${CATEGORIES[a].title} vs ${CATEGORIES[b].title}: precio hoy`}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <Link href="/precios/hacienda-en-pie" className="hover:text-zinc-300">Precios</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{CATEGORIES[a].title} vs {CATEGORIES[b].title}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          {CATEGORIES[a].title} vs {CATEGORIES[b].title}: precio del kilo vivo hoy
        </h1>
        <p className="text-zinc-400 text-sm mb-3">
          <DataStamp isoDate={lastUpdate} /> · INMAG, Mercado Agroganadero
        </p>
        <AnswerBlock
          question={`¿${CATEGORIES[a].title} o ${CATEGORIES[b].title}? Comparación de precio hoy`}
          answer={<>{v}</>}
        />

        {/* Two-row comparison table */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Cotización de referencia — INMAG</div>
          <div className="divide-y divide-terminal-border">
            {rows.map((r) => (
              <div key={r.slug} className="px-panel py-3 flex items-center justify-between">
                <Link href={`/precios/${r.slug}`} className="text-zinc-200 hover:text-accent-bright transition-colors">
                  {CATEGORIES[r.slug].title}
                </Link>
                <div className="flex items-baseline gap-3 font-terminal tabular-nums">
                  <span className="text-zinc-100 text-lg">${fmt(r.price)}<span className="text-zinc-600 text-xxs">/kg</span></span>
                  <span className="text-xs" style={{ color: r.change >= 0 ? '#34d399' : '#f87171' }}>
                    {r.change >= 0 ? '+' : ''}{r.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-panel py-2 text-xxs text-zinc-600">
            $/kg vivo (INMAG, {lastUpdate}). La variación % es semanal; la diferencia entre categorías se calcula sobre el precio actual.
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {faqItems.map((f, i) => (
              <div key={f.question} className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}>
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <PriceCTA />

        <p className="text-zinc-600 text-xxs text-center mt-6">
          Fuente: INMAG (Mercado Agroganadero) · Actualizado {lastUpdate}.
        </p>
      </div>
    </>
  )
}
