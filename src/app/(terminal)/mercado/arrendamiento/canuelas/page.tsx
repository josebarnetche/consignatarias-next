import { Metadata } from 'next'
import Link from 'next/link'
import marketPrices from '@/lib/data/market-prices.json'
import {
  SectionBreadcrumbSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
  DefinedTermSetSchema,
  type DefinedTermItem,
} from '@/components/seo/JsonLd'

// Rebuild diario: el scraper reescribe market-prices.json (14:00 ART → commit →
// Vercel rebuild). SSG con revalidate para no servir un número viejo si el build
// no corrió por otra vía.
export const revalidate = 86400

const PAGE_URL = 'https://www.consignatarias.com.ar/mercado/arrendamiento/canuelas'

// ── Números vivos (módulo, Server Component) ───────────────────────────────
const inmag = marketPrices.inmag
const arrendamientoOficial = marketPrices.arrendamientoOficial as {
  date: string
  index: number
  periodStart: string
  periodEnd: string
  periodIndex: number
  source: string
}
const lastUpdate = marketPrices.lastUpdate

const fmt = (n: number): string => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const fmt3 = (n: number): string =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const inmagChangeStr = `${inmag.change >= 0 ? '+' : ''}${inmag.change}%`

// Ejemplo canónico de canon MENSUAL (campo tipo, 4 kg/ha/mes, 500 ha) al índice del período.
const EXAMPLE_HA = 500
const EXAMPLE_KG_HA = 4
const exampleCanon = EXAMPLE_HA * EXAMPLE_KG_HA * arrendamientoOficial.index

// ── Datos de citabilidad (const a nivel módulo) ────────────────────────────
const FAQ: { question: string; answer: string }[] = [
  {
    // Head-query: "indice novillo arrendamiento mercado de cañuelas".
    question: '¿Cuál es el índice novillo arrendamiento del Mercado de Cañuelas hoy?',
    answer: `El índice novillo arrendamiento del Mercado Agroganadero de Cañuelas es de $${fmt(arrendamientoOficial.index)} por kilo vivo, al ${arrendamientoOficial.date}. Surge del INMAG —el índice del propio Mercado de Cañuelas—, que hoy cotiza a $${fmt(inmag.current)}/kg (${inmagChangeStr} respecto de la jornada previa). Para liquidar contratos suele usarse el promedio del período, no el valor de un solo día. Actualizado el ${lastUpdate}.`,
  },
  {
    question: '¿Qué relación hay entre el INMAG y el índice de arrendamiento de Cañuelas?',
    answer: `Comparten la fuente, pero no son idénticos día a día. El INMAG (Índice del Mercado Agroganadero) es el promedio ponderado por volumen del precio del novillo que se opera físicamente en el Mercado Agroganadero de Cañuelas. El «índice novillo arrendamiento» se construye a partir del INMAG como un promedio del período —no el valor de una sola jornada—, y por eso puede diferir del INMAG del día. Hoy el INMAG está en $${fmt(inmag.current)}/kg vivo y el índice de arrendamiento del período en $${fmt(arrendamientoOficial.index)}/kg.`,
  },
  {
    question: '¿Cañuelas y Liniers son lo mismo para el arrendamiento?',
    answer: 'El Mercado Agroganadero de Cañuelas es el sucesor operativo del histórico Mercado de Liniers: cuando Liniers cerró, la operatoria de hacienda en pie se trasladó a Cañuelas. El INMAG que hoy publica Cañuelas es la referencia vigente para los contratos que históricamente se ataban a "Liniers". Por eso muchos contratos viejos dicen Liniers y hoy se liquidan con el índice de Cañuelas.',
  },
  {
    question: '¿Cómo se calcula el canon de un arrendamiento en kg de novillo por hectárea?',
    answer: `El canon se pacta en kilos de novillo por hectárea por mes. El cálculo es: canon MENSUAL = kg/ha/mes × índice novillo × hectáreas. Por ejemplo, un contrato de ${EXAMPLE_KG_HA} kg/ha/mes sobre ${EXAMPLE_HA} ha, al índice de Cañuelas de $${fmt(arrendamientoOficial.index)}/kg, da un canon mensual de $${fmt(exampleCanon)} (el canon anual = canon mensual × 12). El valor en kg/ha/mes depende de la aptitud del campo: agrícola de zona núcleo 8–12 kg/ha/mes, ganadero marginal 3–6 kg/ha/mes.`,
  },
  {
    question: '¿Se usa el índice de un día o un promedio del período?',
    answer: `Para liquidar arrendamientos se usa el promedio del período, no el valor de una sola jornada, porque el índice diario es volátil. El índice sugerido para arrendamientos que publica el Mercado Agroganadero al ${arrendamientoOficial.date} es de $${fmt(arrendamientoOficial.index)}/kg, calculado sobre el período ${arrendamientoOficial.periodStart} al ${arrendamientoOficial.periodEnd}. Fuente: ${arrendamientoOficial.source}.`,
  },
  {
    question: '¿Cada cuánto se actualiza el índice de arrendamiento de Cañuelas?',
    answer: `Se actualiza cada día hábil con operaciones en el Mercado Agroganadero de Cañuelas. El último valor cargado corresponde al ${lastUpdate}. Los contratos suelen ajustar con el promedio mensual o del período para evitar la volatilidad diaria.`,
  },
]

const TERMS: DefinedTermItem[] = [
  {
    name: 'Índice novillo arrendamiento (Cañuelas)',
    description: `Precio del novillo en el Mercado Agroganadero de Cañuelas, en pesos por kilo vivo, usado como referencia para calcular y ajustar el canon de los contratos de arrendamiento rural. Al ${arrendamientoOficial.date} es de $${fmt(arrendamientoOficial.index)}/kg. Se pacta en kilos de novillo por hectárea por mes y se liquida al promedio del período (canon anual = canon mensual × 12).`,
    url: PAGE_URL,
  },
  {
    name: 'INMAG',
    description: `Índice del Mercado Agroganadero: promedio ponderado por volumen del precio del novillo operado en Cañuelas. Es la fuente del índice de arrendamiento. Hoy $${fmt(inmag.current)}/kg vivo (${inmagChangeStr}).`,
    url: 'https://www.consignatarias.com.ar/mercado/inmag',
  },
  {
    name: 'Mercado Agroganadero de Cañuelas',
    description:
      'Mercado concentrador de hacienda en pie de Cañuelas (Buenos Aires), sucesor operativo del Mercado de Liniers. Publica el INMAG, referencia de precio del novillo para todo el país.',
    url: 'https://www.consignatarias.com.ar/mercado/canuelas',
  },
]

// Dataset con el número vivo (variableMeasured). El componente compartido no emite
// variableMeasured, así que se inlinea acá —local a esta página, sin tocar helpers
// compartidos— para que una IA lea el índice del día desde el structured data.
function ArrendamientoCanuelasDataset() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Índice Novillo Arrendamiento — Mercado Agroganadero de Cañuelas',
    description:
      'Índice de precios del novillo operado en el Mercado Agroganadero de Cañuelas (INMAG), usado como referencia para calcular el canon de los contratos de arrendamiento rural en Argentina.',
    url: PAGE_URL,
    keywords: [
      'indice novillo arrendamiento cañuelas',
      'índice arrendamiento mercado agroganadero',
      'INMAG arrendamiento',
      'canon arrendamiento rural',
      'precio novillo cañuelas',
    ].join(', '),
    creator: {
      '@type': 'Organization',
      name: 'Mercado Agroganadero de Cañuelas',
      sameAs: 'https://www.mercadoagroganadero.com.ar',
    },
    temporalCoverage: `${arrendamientoOficial.periodStart}/${arrendamientoOficial.periodEnd}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'Cañuelas, Buenos Aires, Argentina' },
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'Índice Novillo Arrendamiento (Cañuelas)',
        value: arrendamientoOficial.index,
        unitText: 'ARS/kg vivo',
        measurementTechnique:
          'Índice sugerido para arrendamientos rurales sobre el novillo del Mercado Agroganadero de Cañuelas',
      },
      {
        '@type': 'PropertyValue',
        name: 'INMAG (novillo Cañuelas)',
        value: inmag.current,
        unitText: 'ARS/kg vivo',
        measurementTechnique: 'Promedio ponderado por volumen del novillo en el Mercado Agroganadero de Cañuelas',
      },
    ],
    dateModified: arrendamientoOficial.date,
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export const metadata: Metadata = {
  title: `Índice Novillo Arrendamiento Cañuelas: $${fmt(arrendamientoOficial.index)}/kg`,
  description: `Índice novillo arrendamiento del Mercado Agroganadero de Cañuelas: $${fmt(arrendamientoOficial.index)}/kg vivo al ${arrendamientoOficial.date}. Se basa en el INMAG ($${fmt(inmag.current)}/kg, ${inmagChangeStr}). Cómo calcular el canon en kg/ha/mes.`,
  keywords: [
    'indice novillo arrendamiento mercado de cañuelas',
    'índice novillo arrendamiento cañuelas',
    'indice arrendamiento cañuelas',
    'INMAG arrendamiento cañuelas',
    'canon arrendamiento rural cañuelas',
    'precio novillo cañuelas arrendamiento',
    'mercado agroganadero cañuelas arrendamiento',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Índice Novillo Arrendamiento Cañuelas: $${fmt(arrendamientoOficial.index)}/kg`,
    description: `Índice de arrendamiento del Mercado Agroganadero de Cañuelas al ${arrendamientoOficial.date}. Basado en el INMAG. Cálculo del canon en kg/ha/mes.`,
    url: PAGE_URL,
    type: 'website',
  },
  alternates: { canonical: PAGE_URL },
}

export default function ArrendamientoCanuelasPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />

      {/* Declara la serie de esta plaza como Dataset citable. Ver el comentario de
          la página madre: buena posición, CTR bajo, la respuesta se da arriba — la
          jugada es ser la fuente que se cita, no pelear el clic. */}
      <DatasetSchema
        name="Índice novillo para arrendamiento — Cañuelas"
        description="Serie del índice novillo usado como referencia del canon de arrendamiento rural, en pesos por kilo vivo. Fuente: Mercado Agroganadero de Cañuelas."
        url="https://www.consignatarias.com.ar/mercado/arrendamiento/canuelas"
        keywords={[
          'indice arrendamiento cañuelas',
          'precio novillo arrendamiento cañuelas',
          'canon de arrendamiento rural',
        ]}
        temporalCoverage="2015-01-05/.."
        updateFrequency="daily"
      />
      <ArrendamientoCanuelasDataset />
      <DefinedTermSetSchema
        name="Índice de arrendamiento y Mercado de Cañuelas"
        description="Términos del índice novillo arrendamiento y su fuente, el INMAG del Mercado Agroganadero de Cañuelas."
        url={PAGE_URL}
        terms={TERMS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Índice novillo arrendamiento Cañuelas: $${fmt(arrendamientoOficial.index)}/kg`}
      />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-6 flex flex-wrap items-center gap-1.5">
          <Link href="/mercado" className="hover:text-accent transition-colors">Mercado</Link>
          <span aria-hidden="true">/</span>
          <Link href="/mercado/arrendamiento" className="hover:text-accent transition-colors">Arrendamiento</Link>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-300">Cañuelas</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 bg-sky-500/10 text-accent text-xs font-medium rounded-full border border-sky-500/20">
            ACTUALIZADO {lastUpdate}
          </span>
          <span className="text-sm text-zinc-500">Mercado Agroganadero de Cañuelas</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-5">
          Índice Novillo Arrendamiento
          <span className="block text-accent">Mercado de Cañuelas</span>
        </h1>

        {/* Answer-first: primera oración citable con el número vivo */}
        <p className="speakable-content text-lg text-zinc-300 leading-relaxed max-w-2xl">
          El índice novillo arrendamiento del Mercado Agroganadero de Cañuelas es de{' '}
          <strong className="text-white">${fmt(arrendamientoOficial.index)}/kg vivo</strong> al{' '}
          {arrendamientoOficial.date}; se basa en el{' '}
          <Link href="/mercado/inmag" className="text-accent hover:underline">INMAG</Link>{' '}
          (${fmt(inmag.current)}/kg, {inmagChangeStr}).
        </p>

        {/* Número-hero */}
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-sky-500/5 to-transparent border border-sky-500/10 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Índice arrendamiento — Cañuelas</div>
            <div className="text-3xl font-terminal tabular-nums text-sky-300">${fmt3(arrendamientoOficial.index)}</div>
            <div className="text-sm text-zinc-500 mt-1">/kg vivo · al {arrendamientoOficial.date}</div>
            <div className="text-xxs text-zinc-600 mt-2">
              Período {arrendamientoOficial.periodStart} a {arrendamientoOficial.periodEnd}
            </div>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">INMAG (fuente del índice)</div>
            <div className="text-3xl font-terminal tabular-nums text-white">${fmt3(inmag.current)}</div>
            <div className={`text-sm mt-1 ${inmag.change >= 0 ? 'text-positive' : 'text-negative'}`}>
              {inmagChangeStr} vs. jornada previa
            </div>
            <div className="text-xxs text-zinc-600 mt-2">
              <Link href="/mercado/inmag" className="text-accent hover:underline">Ver serie histórica del INMAG →</Link>
            </div>
          </div>
        </div>

        {/* INMAG ↔ arrendamiento */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Por qué Cañuelas manda el índice de arrendamiento</h2>
          <div className="space-y-4 text-zinc-400 leading-relaxed max-w-2xl">
            <p>
              El <strong className="text-white">Mercado Agroganadero de Cañuelas</strong> es donde se opera físicamente
              la hacienda en pie que fija el precio de referencia del novillo argentino. Es el sucesor operativo del
              histórico <strong className="text-zinc-200">Mercado de Liniers</strong>: cuando Liniers cerró, la
              operatoria se trasladó a Cañuelas, y con ella el índice que ata los contratos de arrendamiento.
            </p>
            <p>
              El{' '}
              <Link href="/mercado/inmag" className="text-accent hover:underline">INMAG</Link>{' '}
              (Índice del Mercado Agroganadero) es el promedio ponderado por volumen de ese novillo. El
              «índice novillo arrendamiento» sale de la misma fuente, pero es el índice sugerido para
              arrendamientos: un promedio del período construido sobre el INMAG —no el valor diario—, por eso
              puede diferir del INMAG del día. Aun así, resolver «Cañuelas» y «arrendamiento» es resolver una
              misma cosa — el precio del novillo en Cañuelas, hoy ${fmt(inmag.current)}/kg.
            </p>
          </div>
        </section>

        {/* Cómo calcular el canon en kg/ha */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Cómo calcular el canon en kg/ha/mes</h2>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 max-w-2xl">
            <p className="text-zinc-300 font-medium mb-3">
              Canon MENSUAL = kg/ha/mes × índice novillo × hectáreas
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Un contrato de <strong className="text-zinc-200">{EXAMPLE_KG_HA} kg/ha/mes</strong> sobre{' '}
              <strong className="text-zinc-200">{EXAMPLE_HA} ha</strong>, al índice de Cañuelas de{' '}
              <strong className="text-zinc-200">${fmt(arrendamientoOficial.index)}/kg</strong>, da un canon
              mensual de <strong className="text-sky-300">${fmt(exampleCanon)}</strong>. El canon anual = canon
              mensual × 12.
            </p>
            <p className="text-zinc-500 text-xs mt-4">
              El valor en kg/ha/mes depende de la aptitud del campo: agrícola de zona núcleo 8–12 kg/ha/mes,
              ganadero marginal 3–6 kg/ha/mes. Los contratos se liquidan con el promedio del período, no con el
              valor de un solo día.
            </p>
            <p className="text-zinc-600 text-xxs mt-4">
              Para la serie completa y el calculador, ver{' '}
              <Link href="/mercado/arrendamiento" className="text-accent hover:underline">Índice Novillo Arrendamiento</Link>.
            </p>
          </div>
        </section>

        {/* FAQ visible (paridad con el FAQPage schema) */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details key={f.question} className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <h3 className="text-white font-medium pr-4">{f.question}</h3>
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/30 pt-4">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Links internos fuertes */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-white mb-6">Información relacionada</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/mercado/inmag" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 hover:border-sky-500/30 transition-all group">
              <h3 className="text-white font-semibold mb-1 group-hover:text-accent-bright transition-colors">INMAG · índice oficial</h3>
              <p className="text-sm text-zinc-500">Cotización diaria del novillo en Cañuelas y serie histórica.</p>
            </Link>
            <Link href="/mercado/canuelas" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 hover:border-sky-500/30 transition-all group">
              <h3 className="text-white font-semibold mb-1 group-hover:text-accent-bright transition-colors">Mercado de Cañuelas</h3>
              <p className="text-sm text-zinc-500">Precios por categoría y operatoria del Mercado Agroganadero.</p>
            </Link>
            <Link href="/mercado/arrendamiento" className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-5 hover:bg-sky-500/15 transition-all group">
              <h3 className="text-accent font-semibold mb-1">Índice arrendamiento</h3>
              <p className="text-sm text-accent/70">Calculador de canon, cierre mensual y descarga de la serie.</p>
            </Link>
          </div>
          <p className="text-xs text-zinc-600 mt-8">
            Fuente: {arrendamientoOficial.source}. Datos actualizados cada día hábil.
          </p>
        </section>
      </div>
    </>
  )
}
