import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
} from '@/components/seo/JsonLd'

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
    descripcion: string
    extraFaq: { question: string; answer: string }[]
  }
> = {
  novillos: {
    singular: 'novillo',
    title: 'Novillo',
    promedioKg: 430,
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
    descripcion: 'Macho castrado de 250–300 kg, alta demanda para cortes premium.',
    extraFaq: [],
  },
  vaquillonas: {
    singular: 'vaquillona',
    title: 'Vaquillona',
    promedioKg: 320,
    descripcion: 'Hembra joven antes de su primera parición, 280–350 kg.',
    extraFaq: [],
  },
  vacas: {
    singular: 'vaca',
    title: 'Vaca',
    promedioKg: 380,
    descripcion: 'Hembra adulta de descarte, destino faena conserva.',
    extraFaq: [],
  },
  toros: {
    singular: 'toro',
    title: 'Toro',
    promedioKg: 600,
    descripcion: 'Macho entero adulto, faena manufactura.',
    extraFaq: [],
  },
  terneros: {
    singular: 'ternero',
    title: 'Ternero',
    promedioKg: 180,
    descripcion: 'Cría macho de invernada, 160–220 kg, destino feedlot o pastoreo.',
    extraFaq: [
      {
        question: '¿Cuánto sale un ternero vivo en Argentina 2026?',
        answer: '',
      },
    ],
  },
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

  const title = `Precio Kilo Vivo ${c.title} Hoy: $${fmt(price)} (INMAG ${lastUpdate}) | Consignatarias.com.ar`
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

  // Sibling categories for navigation
  const others = ALL_CATEGORIES.filter((x) => x !== categoria).map((slug) => ({
    slug,
    label: CATEGORIES[slug].title,
    price: Math.round(
      (marketPrices.categories as Record<string, { current: number }>)[slug].current,
    ),
  }))

  const faqItems = [
    {
      question: `¿Cuánto está el kilo vivo de ${c.singular} hoy?`,
      answer: `El kilo vivo de ${c.singular} cotiza a $${fmt(price)} hoy según el INMAG del ${lastUpdate}, con variación semanal de ${changeStr}. Referencia del Mercado Agroganadero de Buenos Aires.`,
    },
    {
      question: `¿Cuánto sale un ${c.singular} vivo en Argentina 2026?`,
      answer: `Un ${c.singular} promedio de ${c.promedioKg} kg vale aproximadamente $${fmt(promedioPeso)} a precio de mercado ($${fmt(price)}/kg × ${c.promedioKg} kg). El precio varía según peso, terminación y plaza.`,
    },
    {
      question: `¿Cuál es el precio del kilo vivo de ${c.singular} en Argentina?`,
      answer: `$${fmt(price)} por kilo vivo de ${c.singular}, actualizado el ${lastUpdate}. Es la referencia diaria del Mercado Agroganadero.`,
    },
    ...c.extraFaq.map((f) =>
      f.answer
        ? f
        : {
            ...f,
            answer: `El kilo vivo de ${c.singular} está a $${fmt(price)} (${lastUpdate}). Un ${c.singular} promedio de ${c.promedioKg} kg sale $${fmt(promedioPeso)} a precio de mercado.`,
          },
    ),
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
        <p className="text-zinc-400 text-sm mb-6">
          Actualizado {lastUpdate} desde el Mercado Agroganadero (INMAG) ·{' '}
          <span style={{ color: changeColor }}>{changeStr} semanal</span>
        </p>

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
