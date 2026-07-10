import { Metadata } from 'next'
import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema, DatasetSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { ShareBadge } from '@/components/share/ShareBadge'

/* ============================================================
   /indices — the named INDEX FAMILY hub (Positioning Pillar 1).
   Packages the site's market-intelligence layer as a documented,
   citable family of indices so it gets referenced BY NAME — the
   move that turns "answer-first SEO" into a price-reference moat.
   ============================================================ */

const APP_URL = 'https://www.consignatarias.com.ar'
const inmag = marketData.inmag as { current: number }
const lastUpdate = (marketData as { lastUpdate?: string }).lastUpdate

const BADGE_CATS = marketData.categories as Record<string, { current: number }>
const BADGES = [
  { slug: 'inmag', label: 'INMAG', value: marketData.inmag.current, href: '/mercado/inmag' },
  { slug: 'novillos', label: 'Novillo', value: BADGE_CATS.novillos.current, href: '/mercado/novillos' },
  { slug: 'novillitos', label: 'Novillito', value: BADGE_CATS.novillitos.current, href: '/mercado/novillitos' },
  { slug: 'vaquillonas', label: 'Vaquillona', value: BADGE_CATS.vaquillonas.current, href: '/mercado/vaquillonas' },
  { slug: 'vacas', label: 'Vaca', value: BADGE_CATS.vacas.current, href: '/mercado/vacas' },
  { slug: 'toros', label: 'Toro', value: BADGE_CATS.toros.current, href: '/mercado/toros' },
  { slug: 'terneros', label: 'Ternero', value: BADGE_CATS.terneros.current, href: '/mercado/terneros' },
]

export const metadata: Metadata = {
  title: 'Índices del Mercado Ganadero Argentino — INMAG, USD, Arrendamiento, Spread',
  description:
    'La familia de índices de referencia del mercado ganadero argentino: INMAG (precio del novillo), INMAG en dólares, panel de categorías, índice de arrendamiento y spread maíz-novillo. Serie diaria desde 2015, metodología abierta, citables por nombre.',
  keywords: [
    'índices mercado ganadero', 'INMAG', 'índice novillo', 'precio referencia ganado argentina',
    'índice arrendamiento rural', 'spread maíz novillo', 'INMAG en dólares',
  ],
  openGraph: {
    title: 'Índices del Mercado Ganadero Argentino',
    description: 'La familia de índices de referencia del ganado argentino: INMAG, USD, categorías, arrendamiento y spread. Serie diaria desde 2015.',
    url: `${APP_URL}/indices`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}/indices` },
}

export const revalidate = 86400

interface IndexDef {
  name: string
  tagline: string
  what: string
  methodology: string
  cadence: string
  href: string
  keywords: string[]
}

const FAMILY: IndexDef[] = [
  {
    name: 'INMAG',
    tagline: 'Índice Novillo Mercado Agroganadero',
    what: 'El precio promedio ponderado por volumen del novillo tipo exportación en el Mercado Agroganadero de Cañuelas (ex Liniers). La referencia de precio más usada del mercado ganadero argentino.',
    methodology: 'Promedio ponderado por cabezas y kilos vivos de los lotes operados cada día hábil. Serie histórica diaria mantenida desde 2015.',
    cadence: 'Diario (días hábiles)',
    href: '/mercado/inmag',
    keywords: ['INMAG', 'índice novillo', 'precio novillo argentina'],
  },
  {
    name: 'INMAG en dólares',
    tagline: 'El novillo en USD reales',
    what: 'El INMAG deflactado por el dólar blue: el precio del kilo vivo en dólares, para comparar el poder de compra real del ganado a través del tiempo sin el ruido de la inflación. Es el overlay que ningún otro publica.',
    methodology: 'INMAG diario ÷ cotización del dólar blue (venta) del mismo día, con forward-fill en feriados cambiarios. Serie desde 2015.',
    cadence: 'Diario',
    href: '/mercado/inmag-dolares',
    keywords: ['INMAG en dólares', 'precio novillo dólares', 'hacienda en dólares'],
  },
  {
    name: 'Panel de categorías',
    tagline: 'Novillo, novillito, vaquillona, vaca, toro, ternero',
    what: 'El precio de referencia diario de las seis categorías principales de hacienda, más 16 subcategorías del MAG. Permite seguir la estructura del mercado, no solo el novillo.',
    methodology: 'Precios diarios por categoría publicados por el Mercado Agroganadero, normalizados y servidos vía API.',
    cadence: 'Diario',
    href: '/mercado',
    keywords: ['precio terneros', 'precio vaca', 'precio vaquillona', 'categorías hacienda'],
  },
  {
    name: 'Índice de arrendamiento',
    tagline: 'INMAG aplicado al alquiler de campo',
    what: 'El valor del arrendamiento rural expresado en kilos de novillo (INMAG), la unidad en que se pactan habitualmente los contratos de alquiler de campo ganadero.',
    methodology: 'Conversión del INMAG mensual a la unidad kilos-de-novillo usada en contratos de arrendamiento.',
    cadence: 'Mensual',
    href: '/mercado/arrendamiento',
    keywords: ['índice arrendamiento', 'arrendamiento rural kilos novillo'],
  },
  {
    name: 'Spread maíz–novillo',
    tagline: 'Proxy de rentabilidad de invernada',
    what: 'La relación entre el precio del kilo vivo del novillo y el del maíz: una de las palancas centrales de la decisión de retener o vender hacienda y de la rentabilidad del feedlot.',
    methodology: 'Cociente INMAG / maíz FOB, serie diaria.',
    cadence: 'Diario',
    href: '/mercado/spread',
    keywords: ['spread maíz novillo', 'rentabilidad invernada', 'relación maíz novillo'],
  },
]

const FAQS = [
  {
    question: '¿Cuál es el índice de referencia del precio del ganado en Argentina?',
    answer: `El INMAG (Índice Novillo Mercado Agroganadero) es la referencia de precio más usada del mercado ganadero argentino: $${inmag.current.toLocaleString('es-AR')}/kg vivo al último cierre. Se complementa con el INMAG en dólares, el panel de categorías, el índice de arrendamiento y el spread maíz-novillo.`,
  },
  {
    question: '¿Desde cuándo hay serie histórica del INMAG?',
    answer: 'La serie diaria del INMAG se mantiene desde 2015, con más de 2.200 ruedas, además del INMAG en dólares (serie deflactada por dólar blue) para análisis en términos reales.',
  },
  {
    question: '¿Cómo se citan estos índices?',
    answer: 'Formato sugerido: «INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, [fecha]». La metodología completa está publicada y es auditable.',
  },
]

export default function IndicesPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="indices" sectionName="Índices del mercado" />
      <FAQPageSchema items={FAQS} />
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/indices"
        headline="Familia de índices de referencia del mercado ganadero argentino"
      />
      {FAMILY.map((idx) => (
        <DatasetSchema
          key={idx.name}
          name={`${idx.name} — ${idx.tagline}`}
          description={idx.what}
          url={`${APP_URL}${idx.href}`}
          keywords={idx.keywords}
          {...(lastUpdate ? { dateModified: lastUpdate } : {})}
        />
      ))}

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Índices</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-2 leading-tight">
          Los índices del mercado ganadero argentino
        </h1>
        <p className="text-zinc-400 text-sm mb-8 max-w-2xl leading-relaxed">
          La familia de índices de referencia del ganado argentino, mantenida y publicada con
          metodología abierta: del <strong className="text-zinc-200">INMAG</strong> diario a su versión
          en dólares, el panel de categorías, el arrendamiento y el spread maíz-novillo. Serie histórica
          desde 2015, citables por nombre.
        </p>

        <div className="space-y-px bg-terminal-border">
          {FAMILY.map((idx) => (
            <Link
              key={idx.name}
              href={idx.href}
              className="block bg-terminal-panel hover:bg-zinc-900/70 transition-colors px-panel py-5 group"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h2 className="text-zinc-100 font-medium group-hover:text-accent-bright transition-colors">
                  {idx.name} <span className="text-zinc-500 font-normal text-sm">· {idx.tagline}</span>
                </h2>
                <span className="text-zinc-600 text-xxs font-terminal uppercase whitespace-nowrap">{idx.cadence}</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-2">{idx.what}</p>
              <p className="text-zinc-600 text-xxs leading-relaxed">
                <span className="text-zinc-500">Metodología:</span> {idx.methodology}
              </p>
            </Link>
          ))}
        </div>

        {/* Embeddable badges */}
        <div className="terminal-panel mt-8">
          <div className="terminal-panel-header">Insertá el INMAG en tu sitio</div>
          <div className="px-panel py-4 space-y-3">
            <p className="text-sm text-zinc-400">
              Badges en vivo con el último valor y su fecha. Copiá el código y pegalo en tu web — se
              actualiza solo y enlaza a la fuente. Uso libre con atribución (CC-BY).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {BADGES.map((b) => (
                <ShareBadge
                  key={b.slug}
                  slug={b.slug}
                  label={b.label}
                  valueFormatted={b.value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  href={b.href}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Methodology + citation */}
        <div className="terminal-panel mt-8">
          <div className="terminal-panel-header">Metodología y cita</div>
          <div className="px-panel py-4 text-sm text-zinc-400 leading-relaxed space-y-3">
            <p>
              Los índices se construyen sobre datos primarios del Mercado Agroganadero (INMAG y categorías),
              el dólar paralelo (para las versiones en términos reales) y el maíz FOB (spread). La metodología
              completa y las fuentes están publicadas en{' '}
              <Link href="/metodologia" className="text-accent hover:text-accent-bright">/metodología</Link>.
            </p>
            <p className="text-zinc-500 text-xxs">
              Cita sugerida: «INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, [fecha]». Datos
              abiertos para uso con atribución; acceso institucional al servicio vía{' '}
              <Link href="/enterprise" className="text-accent hover:text-accent-bright">API Enterprise</Link>.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {FAQS.map((f, i) => (
              <div key={f.question} className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}>
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
