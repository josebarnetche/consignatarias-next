import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/precio-del-novillo-en-pie`

/* ------------------------------------------------------------------ */
/*  Número vivo — import estático del JSON (SSG). El scraper reescribe  */
/*  market-prices.json a las 14:00 ART y revalidate=86400 fuerza el     */
/*  rebuild diario, así el valor queda interpolado en el HTML estático. */
/* ------------------------------------------------------------------ */
const inmag = marketPrices.inmag as {
  current: number
  prev: number
  change: number
  unit: string
  source: string
  series: { date: string; value: number; volume: number }[]
}
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

// Dato vivo principal: INMAG (índice novillo) en $/kg vivo, y el panel de novillo.
const inmagPrice = Math.round(inmag.current)
const novillo = price('novillos')
const unit = inmag.unit // '$/kg vivo'
const changeAbs = Math.abs(inmag.change)
const changeDir = inmag.change > 0 ? 'subió' : inmag.change < 0 ? 'bajó' : 'quedó sin cambios'

// Serie: últimas 7 ruedas, más reciente primero, para la tabla y el schema.
const SERIE = inmag.series.slice(-7).reverse()

/* ------------------------------------------------------------------ */
/*  Términos definidos — entidades citables (patrón /glosario)         */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Novillo',
    description:
      'Macho bovino castrado de más de 2 años, de 400 a 500 kg de peso vivo. Es la categoría de referencia del mercado ganadero argentino: sobre ella se construye el INMAG y es la base del consumo pesado y la exportación. Su precio se expresa en pesos por kilo vivo.',
    url: `${BASE_URL}/mercado/novillos`,
  },
  {
    name: 'Novillito',
    description:
      'Macho bovino castrado de 1 a 2 años, de 300 a 390 kg de peso vivo. Categoría de faena liviana, muy demandada por el consumo interno por su terminación más temprana que la del novillo. También se cotiza por kilo vivo.',
    url: `${BASE_URL}/mercado/novillitos`,
  },
  {
    name: 'Kilo vivo',
    description:
      'Unidad de comercialización de la hacienda en pie: el precio se pauta por cada kilogramo de peso del animal vivo, antes de la faena. El valor total de un animal es su peso vivo multiplicado por el precio por kilo de su categoría. Se distingue del «precio al gancho», que es por kilo de res faenada.',
  },
  {
    name: 'INMAG',
    description:
      'Índice Novillo Mercado Agroganadero: precio promedio ponderado por volumen del novillo en el Mercado Agroganadero, en pesos por kilo vivo. Es el termómetro diario de referencia del precio del novillo en pie en Argentina; se publica desde 2015.',
    url: `${BASE_URL}/mercado/inmag`,
  },
  {
    name: 'MAG',
    description:
      'Mercado Agroganadero de Cañuelas (provincia de Buenos Aires): el mercado concentrador donde se forma el precio de referencia de la hacienda en pie. Reemplazó al histórico Mercado de Liniers en 2022, heredando su función de plaza testigo del precio del ganado argentino.',
    url: `${BASE_URL}/mercado/canuelas`,
  },
  {
    name: 'Liniers / Cañuelas',
    description:
      'El Mercado de Liniers fue durante décadas la plaza testigo del precio de la hacienda en Buenos Aires; en 2022 su operatoria se trasladó al Mercado Agroganadero (MAG) de Cañuelas, que hoy cumple ese rol. Por eso muchos productores siguen diciendo «precio Liniers» al referirse al precio que hoy se forma en Cañuelas.',
    url: `${BASE_URL}/mercado/liniers`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first, cada respuesta arranca con el número vivo      */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿A cuánto está el kilo de novillo en pie hoy?',
    answer: `Hoy (${lastUpdate}) el kilo de novillo en pie está a $${fmt(inmagPrice)} por kilo vivo según el INMAG, el índice del Mercado Agroganadero. Respecto de la rueda anterior el precio ${changeDir} ${fmt(changeAbs)}%. Es un precio de referencia del mercado (INMAG/MAG), no fijado por esta página; cada firma acuerda el precio final con el productor.`,
  },
  {
    question: '¿Dónde se forma el precio del novillo en pie?',
    answer: `El precio del novillo en pie se forma en el Mercado Agroganadero (MAG) de Cañuelas, provincia de Buenos Aires, la plaza testigo que en 2022 reemplazó al histórico Mercado de Liniers. Ahí se rematan miles de cabezas por rueda y el promedio ponderado por volumen del novillo es el INMAG, hoy en $${fmt(inmagPrice)}/kg vivo (${lastUpdate}). Por eso muchos productores todavía dicen «precio Liniers».`,
  },
  {
    question: '¿Cuánto vale un novillo entero en pesos?',
    answer: `El valor de un novillo entero es su peso vivo por el precio por kilo. A $${fmt(inmagPrice)}/kg vivo (INMAG, ${lastUpdate}), un novillo de 450 kg vale unos $${fmt(inmagPrice * 450)} y uno de 400 kg unos $${fmt(inmagPrice * 400)}. Es una referencia orientativa según el peso; el precio final lo acuerda cada firma con el productor.`,
  },
  {
    question: '¿A cuánto está el novillo en dólares?',
    answer: `El precio del novillo en pie en dólares se obtiene dividiendo el INMAG en pesos ($${fmt(inmagPrice)}/kg vivo, ${lastUpdate}) por el tipo de cambio. Como el dólar se mueve todos los días, ese valor conviene mirarlo actualizado en la página del novillo en dólares, donde el índice se convierte con la cotización vigente.`,
  },
  {
    question: '¿Es lo mismo el precio del novillo que el del novillito?',
    answer: `No: son categorías distintas. Hoy (${lastUpdate}) el novillo cotiza a $${fmt(novillo)}/kg vivo (categoría de referencia del INMAG) y el novillito, de faena más liviana, a $${fmt(price('novillitos'))}/kg. El novillo es macho castrado de más de 2 años y 400–500 kg; el novillito tiene 1–2 años y 300–390 kg. Ambos son precios de referencia del mercado.`,
  },
]

export const metadata: Metadata = {
  title: `Precio del novillo en pie hoy: $${fmt(inmagPrice)}/kg vivo (${lastUpdate}) — Liniers/Cañuelas`,
  description: `A cuánto está el kilo de novillo en pie hoy (${lastUpdate}): $${fmt(inmagPrice)} por kilo vivo según el INMAG del Mercado Agroganadero (ex-Liniers, Cañuelas). Precio de referencia en pesos, actualizado a diario. Novillo de panel $${fmt(novillo)}/kg.`,
  keywords: [
    'a cuanto esta el kilo de novillo en pie hoy',
    'a cuánto está el kilo de novillo en pie',
    'precio del novillo en pie hoy',
    'precio del novillo en pie',
    'cuánto está el kilo de novillo en liniers',
    'precio del kilo de novillo',
    'precio novillo cañuelas',
    'precio novillo mercado agroganadero',
    'cuanto vale un novillo en pie',
    'precio kilo vivo novillo',
    'inmag novillo hoy',
  ],
  openGraph: {
    title: `Precio del novillo en pie hoy: $${fmt(inmagPrice)}/kg vivo`,
    description: `A cuánto está el kilo de novillo en pie hoy (${lastUpdate}): $${fmt(inmagPrice)}/kg vivo según el INMAG del Mercado Agroganadero (Cañuelas, ex-Liniers). Precio de referencia en pesos.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function PrecioDelNovilloEnPiePage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="precio-del-novillo-en-pie"
        sectionName="Precio del novillo en pie"
      />
      <DefinedTermSetSchema
        name="Precio del novillo en pie — definiciones"
        description="Definiciones citables de novillo, novillito, kilo vivo, INMAG, MAG y Liniers/Cañuelas en la comercialización de hacienda en pie en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="Índice del novillo en pie — INMAG (Mercado Agroganadero)"
        description={`Precio de referencia del novillo en pie en pesos por kilo vivo según el INMAG (Índice Novillo Mercado Agroganadero). Al ${lastUpdate}: $${fmt(inmagPrice)}/kg vivo. Serie diaria del Mercado Agroganadero de Cañuelas (ex-Liniers).`}
        url={PAGE_URL}
        keywords={['precio del novillo en pie', 'novillo', 'kilo vivo', 'INMAG', 'mercado agroganadero', 'cañuelas', 'liniers']}
        dateModified={lastUpdate}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Precio del novillo en pie hoy"
        cssSelectors={['h1', '.speakable-content']}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Precio del novillo en pie
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio del novillo en pie hoy: ${fmt(inmagPrice)}/kg vivo
        </h1>

        {/* Answer-first: primera oración autocontenida, citable, con el número vivo */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Hoy ({lastUpdate}) el kilo de novillo en pie está a{' '}
          <strong>${fmt(inmagPrice)} por kilo vivo</strong> según el INMAG, el índice del Mercado
          Agroganadero; respecto de la rueda anterior el precio {changeDir} {fmt(changeAbs)}%.
        </p>

        <p className="mb-4">
          Es un <strong>precio de referencia del mercado</strong> (INMAG / MAG), medido en{' '}
          {unit} y actualizado a diario ({lastUpdate}); no lo fija esta página. El INMAG es el
          promedio ponderado por volumen del novillo en el{' '}
          <Link href="/mercado/canuelas" className="text-accent hover:text-accent-bright transition-colors">
            Mercado Agroganadero de Cañuelas
          </Link>
          , la plaza que en 2022 reemplazó al histórico Mercado de Liniers. Por eso muchos
          productores todavía dicen «precio Liniers» al hablar del precio que hoy se forma en
          Cañuelas. En el panel de categorías, el novillo cotiza a{' '}
          <strong>${fmt(novillo)}/kg vivo</strong>.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Precio del novillo en pie: últimas ruedas
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Fecha</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  INMAG $/kg vivo
                </th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Volumen (cab.)
                </th>
              </tr>
            </thead>
            <tbody>
              {SERIE.map((r, i) => (
                <tr key={r.date} className="border-b border-terminal-border/60">
                  <td className="px-3 py-2 text-zinc-300">
                    {r.date}
                    {i === 0 ? (
                      <span className="text-xxs text-accent uppercase tracking-wider">
                        {' '}· última
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-200">${fmt(Math.round(r.value))}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{fmt(r.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Serie del INMAG en el Mercado Agroganadero ({inmag.source}), últimas ruedas al{' '}
          {lastUpdate}. Precio de referencia por kilo vivo, no fijado por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cuánto vale un novillo entero en pesos
        </h2>
        <p className="mb-4">
          El valor de un animal en pie es su <strong>peso vivo</strong> multiplicado por el precio
          por kilo. A ${fmt(inmagPrice)}/kg vivo ({lastUpdate}), un novillo de 450 kg ronda los{' '}
          <strong>${fmt(inmagPrice * 450)}</strong> y uno de 400 kg unos{' '}
          <strong>${fmt(inmagPrice * 400)}</strong>. Es una cuenta orientativa según el peso y la
          terminación de la hacienda; el precio final lo acuerda cada firma consignataria con el
          productor en la operación.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Dónde se forma el precio: del Mercado de Liniers a Cañuelas
        </h2>
        <p className="mb-4">
          El precio testigo del novillo se forma por oferta y demanda en el{' '}
          <strong>Mercado Agroganadero (MAG) de Cañuelas</strong>, que en 2022 heredó la función del
          Mercado de Liniers como plaza de referencia del ganado argentino. Cada rueda se rematan
          miles de cabezas y el promedio ponderado por volumen del novillo es el INMAG. Para verlo en
          dólares, el mismo índice se convierte con la cotización vigente; y para el detalle
          metodológico e histórico están las páginas de mercado enlazadas abajo.
        </p>

        {/* FAQ visible — mismo array que el schema */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {FAQ.map((f) => (
            <div key={f.question} className="border-l-2 border-terminal-border pl-4">
              <dt className="text-zinc-200 font-medium mb-1">{f.question}</dt>
              <dd className="text-zinc-400">{f.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos densos a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir el precio del novillo
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/el-novillo-en-dolares" className="text-accent hover:text-accent-bright transition-colors">
              El novillo en dólares →
            </Link>
            <Link href="/mercado/inmag" className="text-accent hover:text-accent-bright transition-colors">
              Índice INMAG →
            </Link>
            <Link href="/mercado/canuelas" className="text-accent hover:text-accent-bright transition-colors">
              Mercado de Cañuelas →
            </Link>
            <Link href="/indices" className="text-accent hover:text-accent-bright transition-colors">
              Todos los índices →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/que-es-el-mag" className="text-accent hover:text-accent-bright transition-colors">
              ¿Qué es el MAG? →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado/novillos" className="text-accent hover:text-accent-bright transition-colors">
              Novillo en vivo →
            </Link>{' '}
            ·{' '}
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precio de referencia del mercado (INMAG / Mercado Agroganadero), no fijado por esta
            página; cada firma acuerda el precio final con el productor.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
