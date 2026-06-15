import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import { AnswerBlock } from '@/components/seo/AnswerBlock'
import { DataStamp } from '@/components/seo/DataStamp'
import { CitaBlock } from '@/components/seo/CitaBlock'
import PriceWhatsAppShare from '@/components/share/PriceWhatsAppShare'
import { getDetailedRowsForCategory, CATEGORY_PREFIX } from '@/components/market/PriceRangeTable'

/* ============================================================
   /precios/[categoria] — captures high-intent "precio del kilo
   vivo de novillo" type queries that rank #1 on Google but had
   0 CTR because the snippet didn't answer the question.
   ============================================================ */

type CategorySlug =
  | 'novillos'
  | 'novillitos'
  | 'vaquillonas'
  | 'vacas'
  | 'toros'
  | 'terneros'

const CATEGORIES: Record<
  CategorySlug,
  {
    singular: string
    title: string
    promedioKg: number
    /** Spanish article + adjective so generated copy stays grammatical
        ("un novillo vivo" vs "una vaca viva"). */
    articulo: 'un' | 'una'
    vivoAdj: 'vivo' | 'viva'
    descripcion: string
    extraFaq: { question: string; answer: string }[]
  }
> = {
  novillos: {
    singular: 'novillo',
    title: 'Novillo',
    promedioKg: 430,
    articulo: 'un',
    vivoAdj: 'vivo',
    descripcion: 'Macho castrado de más de 300 kg, destino faena de exportación o consumo interno.',
    extraFaq: [
      {
        question: '¿Cuánto pesa un novillo terminado?',
        answer: 'Un novillo terminado para faena pesa entre 400 y 480 kg vivo. El peso promedio de remate ronda los 430 kg.',
      },
    ],
  },
  novillitos: {
    singular: 'novillito',
    title: 'Novillito',
    promedioKg: 280,
    articulo: 'un',
    vivoAdj: 'vivo',
    descripcion: 'Macho castrado de 250–300 kg, alta demanda para cortes premium.',
    extraFaq: [],
  },
  vaquillonas: {
    singular: 'vaquillona',
    title: 'Vaquillona',
    promedioKg: 320,
    articulo: 'una',
    vivoAdj: 'viva',
    descripcion: 'Hembra joven antes de su primera parición, 280–350 kg.',
    extraFaq: [],
  },
  vacas: {
    singular: 'vaca',
    title: 'Vaca',
    promedioKg: 380,
    articulo: 'una',
    vivoAdj: 'viva',
    descripcion: 'Hembra adulta de descarte, destino faena conserva.',
    extraFaq: [],
  },
  toros: {
    singular: 'toro',
    title: 'Toro',
    promedioKg: 600,
    articulo: 'un',
    vivoAdj: 'vivo',
    descripcion: 'Macho entero adulto, faena manufactura.',
    extraFaq: [],
  },
  terneros: {
    singular: 'ternero',
    title: 'Ternero',
    promedioKg: 180,
    articulo: 'un',
    vivoAdj: 'vivo',
    descripcion: 'Cría macho de invernada, 160–220 kg, destino feedlot o pastoreo.',
    extraFaq: [],
  },
}

/* Exact conversational phrasings people actually search per category (Search
   Console). Each maps to a direct, number-first, honest answer built at runtime
   with the live INMAG price. Recovers answer-eligibility for queries like
   "cuánto sale una vaca viva en argentina 2026" / "kilo de novillo en pie". */
const CONVERSATIONAL_QUESTIONS: Record<CategorySlug, string[]> = {
  novillos: ['¿Cuánto está el kilo de novillo en pie?', '¿A cuánto está el novillo gordo hoy?'],
  novillitos: ['¿Cuánto está el kilo de novillito en pie?'],
  vaquillonas: ['¿Cuánto sale una vaquillona en Argentina 2026?'],
  vacas: ['¿Cuánto sale una vaca viva en Argentina 2026?', '¿Cuánto cuesta una vaca adulta en Argentina?'],
  toros: ['¿Cuánto sale un toro en pie en Argentina?'],
  terneros: ['¿Cuánto sale un ternero vivo en Argentina 2026?', '¿A cuánto está el kilo de ternero hoy?'],
}

const ALL_CATEGORIES = Object.keys(CATEGORIES) as CategorySlug[]

export function generateStaticParams() {
  return ALL_CATEGORIES.map((categoria) => ({ categoria }))
}

const fmt = (n: number) => n.toLocaleString('es-AR')

function isValidCategoria(s: string): s is CategorySlug {
  return ALL_CATEGORIES.includes(s as CategorySlug)
}

function getCategoryData(slug: CategorySlug) {
  const cat = CATEGORIES[slug]
  const data = (
    marketPrices.categories as Record<
      string,
      { current: number; prev: number; change: number }
    >
  )[slug]
  return { ...cat, ...data }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>
}): Promise<Metadata> {
  const { categoria } = await params
  if (!isValidCategoria(categoria)) return { title: 'Categoría no encontrada' }

  const c = getCategoryData(categoria)
  const price = Math.round(c.current)
  const changeStr = `${c.change >= 0 ? '+' : ''}${c.change}%`
  const lastUpdate = marketPrices.lastUpdate

  const title = `Precio Kilo Vivo ${c.title} Hoy: $${fmt(price)} (INMAG ${lastUpdate})`
  const description = `Precio del kilo vivo de ${c.singular} hoy: $${fmt(price)} (${changeStr} semanal). Un ${c.singular} promedio de ${c.promedioKg} kg ronda los $${fmt(price * c.promedioKg)}. Actualizado ${lastUpdate} desde Mercado Agroganadero.`

  return {
    title,
    description,
    keywords: [
      `precio kilo vivo ${c.singular}`,
      `precio ${c.singular}`,
      `kilo de ${c.singular}`,
      `kilo vivo de ${c.singular}`,
      `cuanto esta el kilo vivo de ${c.singular}`,
      `cuanto sale un ${c.singular} vivo`,
      `kg ${c.singular}`,
      'hacienda en pie',
      'mercado ganadero argentina',
    ],
    openGraph: {
      title: `Precio Kilo Vivo ${c.title} Hoy $${fmt(price)} — INMAG ${lastUpdate}`,
      description,
      url: `https://www.consignatarias.com.ar/precios/${categoria}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/precios/${categoria}`,
    },
  }
}

function ProductSchema({
  name,
  price,
}: {
  name: string
  price: number
}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `Cotización de referencia del kilo vivo de ${name.toLowerCase()} según el INMAG.`,
    category: 'Ganado bovino en pie',
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'ARS',
      priceValidUntil: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      availability: 'https://schema.org/InStock',
      eligibleQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'KGM' },
      seller: {
        '@type': 'Organization',
        name: 'Mercado Agroganadero',
      },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}

function ArticleSchema({
  headline,
  description,
}: {
  headline: string
  description: string
}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    datePublished: marketPrices.lastUpdate,
    dateModified: marketPrices.lastUpdate,
    author: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
    publisher: {
      '@type': 'Organization',
      name: 'Consignatarias.com.ar',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.consignatarias.com.ar/Consignatariaslogo.png',
      },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}

export default async function PreciosCategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>
}) {
  const { categoria } = await params
  if (!isValidCategoria(categoria)) notFound()

  const c = getCategoryData(categoria)
  const price = Math.round(c.current)
  const prev = Math.round(c.prev)
  const changeStr = `${c.change >= 0 ? '+' : ''}${c.change}%`
  const changeColor = c.change >= 0 ? '#34d399' : '#f87171'
  const lastUpdate = marketPrices.lastUpdate
  const promedioPeso = price * c.promedioKg

  // Observed MAG sub-category figures (P1 shared filter) — distinct from the modeled INMAG headline.
  const observed = getDetailedRowsForCategory(categoria)
  const headline = observed.length ? observed.reduce((a, b) => (b.cabezas > a.cabezas ? b : a)) : null
  const magDetailDate = (marketPrices.detailedCategories as { date?: string })?.date ?? lastUpdate
  const subcatPrefix = CATEGORY_PREFIX[categoria]?.[0] ?? ''
  const cleanName = (cat: string) => (subcatPrefix ? cat.replace(new RegExp('^' + subcatPrefix, 'i'), '').trim() : cat)

  // Server-built citation string (CitaBlock copies it; observed/national = "precio de referencia", no estimate tag).
  const citation = `INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, ${lastUpdate} — $${fmt(price)}/kg vivo de ${c.singular} (precio de referencia)`

  // Sibling categories for navigation
  const others = ALL_CATEGORIES.filter((x) => x !== categoria).map((slug) => ({
    slug,
    label: CATEGORIES[slug].title,
    price: Math.round(
      (marketPrices.categories as Record<string, { current: number }>)[slug].current,
    ),
  }))

  // Direct, number-first answer for each conversational phrasing, built with the
  // live price. Honest: leads with the INMAG reference, then the per-head figure.
  const convoAnswer = (q: string): string => {
    const head = `El kilo vivo de ${c.singular} está a $${fmt(price)} (INMAG, ${lastUpdate}; ${changeStr} semanal). ${c.articulo[0].toUpperCase()}${c.articulo.slice(1)} ${c.singular} ${c.vivoAdj} de ${c.promedioKg} kg ronda los $${fmt(promedioPeso)} a precio de referencia.`
    if (q.includes('en pie')) {
      return `El kilo de ${c.singular} en pie (peso vivo) cotiza a $${fmt(price)} según el INMAG del ${lastUpdate} (${changeStr} semanal). Es la referencia del Mercado Agroganadero; el precio realizado varía según peso, terminación y plaza.`
    }
    if (q.includes('adulta')) {
      return `Una vaca adulta de descarte se referencia en $${fmt(price)}/kg vivo (INMAG, ${lastUpdate}). Una vaca de ${c.promedioKg} kg ronda los $${fmt(promedioPeso)}. El valor final depende de estado, terminación y plaza de venta.`
    }
    return head
  }

  const faqItems = [
    {
      question: `¿Cuánto está el kilo vivo de ${c.singular} hoy?`,
      answer: `El kilo vivo de ${c.singular} cotiza a $${fmt(price)} hoy según el INMAG del ${lastUpdate}, con variación semanal de ${changeStr}. Referencia del Mercado Agroganadero de Buenos Aires.`,
    },
    {
      question: `¿Cuál es el precio del kilo vivo de ${c.singular} en Argentina?`,
      answer: `$${fmt(price)} por kilo vivo de ${c.singular}, actualizado el ${lastUpdate}. Es la referencia diaria del Mercado Agroganadero.`,
    },
    ...CONVERSATIONAL_QUESTIONS[categoria].map((question) => ({ question, answer: convoAnswer(question) })),
    ...(headline
      ? [{
          question: `¿Cuánto vale el ${c.singular} ${cleanName(headline.category).toLowerCase()}?`,
          answer: `El ${c.singular} ${cleanName(headline.category).toLowerCase()} promedió $${fmt(Math.round(headline.avgPrice))}/kg (rango $${fmt(headline.minPrice)}–$${fmt(headline.maxPrice)}, ${fmt(headline.cabezas)} cabezas) en el Mercado Agroganadero del ${magDetailDate}, según precios observados por categoría.`,
        }]
      : []),
    ...c.extraFaq,
  ]

  return (
    <>
      <SectionBreadcrumbSchema section={`precios/${categoria}`} sectionName={`Precio ${c.title}`} />
      <FAQPageSchema items={faqItems} />
      <ProductSchema name={`${c.title} en pie`} price={price} />
      <ArticleSchema
        headline={`Precio del kilo vivo de ${c.singular} hoy: $${fmt(price)}`}
        description={`Cotización diaria del kilo vivo de ${c.singular} en Argentina, INMAG ${lastUpdate}.`}
      />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/precios/${categoria}`}
        headline={`Precio del kilo vivo de ${c.singular} hoy`}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">
            Mercado
          </Link>
          <span className="mx-2">/</span>
          <Link href="/precios/hacienda-en-pie" className="hover:text-zinc-300">
            Precios
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{c.title}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Precio del kilo vivo de {c.singular} hoy:{' '}
          <span style={{ color: '#fbbf24' }}>${fmt(price)}</span>
        </h1>
        <p className="text-zinc-400 text-sm mb-4">
          <DataStamp isoDate={lastUpdate} /> desde el Mercado Agroganadero (INMAG) ·{' '}
          <span style={{ color: changeColor }}>{changeStr} semanal</span>
        </p>
        <AnswerBlock
          question={`Precio del kilo vivo de ${c.singular} hoy`}
          answer={
            <>
              El kilo vivo de {c.singular} cotiza <strong className="text-white">${fmt(price)}/kg</strong> de
              referencia (INMAG, Mercado Agroganadero de Cañuelas; {lastUpdate}, {changeStr} semanal).{' '}
              {`${c.articulo.charAt(0).toUpperCase()}${c.articulo.slice(1)}`} {c.singular} promedio de {c.promedioKg} kg
              ronda los <strong className="text-white">${fmt(promedioPeso)}</strong>. El precio realizado varía según
              peso, terminación y la plaza o remate donde se venda.
            </>
          }
        />
        {headline && (
          <AnswerBlock
            question={`Precio observado del ${c.singular} ${cleanName(headline.category).toLowerCase()} (MAG ${magDetailDate})`}
            answer={
              <>
                El {c.singular} {cleanName(headline.category).toLowerCase()} promedió{' '}
                <strong className="text-white">${fmt(Math.round(headline.avgPrice))}/kg</strong> (rango ${fmt(headline.minPrice)}–${fmt(headline.maxPrice)},{' '}
                {fmt(headline.cabezas)} cabezas) en el remate observado del Mercado Agroganadero del {magDetailDate}. Es el
                promedio realizado por categoría, distinto del INMAG de referencia (${fmt(price)}/kg).
              </>
            }
          />
        )}
        <CitaBlock citation={citation} sourceUrl={`https://www.consignatarias.com.ar/precios/${categoria}`} />
        <PriceWhatsAppShare singular={c.singular} price={price} change={c.change} lastUpdate={lastUpdate} url={`https://www.consignatarias.com.ar/precios/${categoria}`} className="mb-6" />

        {/* Big number panel */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Cotización actual</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border">
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                Hoy
              </div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">
                ${fmt(price)}
              </div>
              <div className="text-zinc-600 text-xxs">$/kg vivo</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                Semana previa
              </div>
              <div className="text-zinc-400 text-2xl font-terminal tabular-nums">
                ${fmt(prev)}
              </div>
              <div className="text-zinc-600 text-xxs">$/kg vivo</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                Variación
              </div>
              <div
                className="text-2xl font-terminal tabular-nums"
                style={{ color: changeColor }}
              >
                {changeStr}
              </div>
              <div className="text-zinc-600 text-xxs">vs semana previa</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                Promedio {c.promedioKg}kg
              </div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">
                ${fmt(promedioPeso)}
              </div>
              <div className="text-zinc-600 text-xxs">por cabeza</div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Sobre {c.title}</div>
          <div className="px-panel py-5">
            <p className="text-zinc-300 text-sm leading-relaxed">{c.descripcion}</p>
          </div>
        </div>

        {/* Otras categorías */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Otras categorías</div>
          <div className="divide-y divide-terminal-border">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/precios/${o.slug}`}
                className="px-panel py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
              >
                <span className="text-zinc-300 text-data">{o.label}</span>
                <span className="text-zinc-400 font-terminal tabular-nums text-data">
                  ${fmt(o.price)} /kg
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ visible */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {faqItems.map((f, i) => (
              <div
                key={f.question}
                className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}
              >
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 text-xxs text-center">
          Fuente: INMAG (Mercado Agroganadero de Buenos Aires) · Actualizado diariamente ·{' '}
          <Link href="/mercado" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
            Ver todas las cotizaciones
          </Link>
        </p>
      </div>
    </>
  )
}
