import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
  TechArticleSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-el-mag`

/* ------------------------------------------------------------------ */
/*  Números vivos — el scraper reescribe el JSON 14:00 ART y el        */
/*  revalidate=86400 fuerza el rebuild, dejando el valor en el HTML.   */
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const inmag = marketPrices.inmag
const inmagCurrent = fmt(Math.round(inmag.current))
const inmagPrev = fmt(Math.round(inmag.prev))
const inmagChange = inmag.change
const inmagSource = inmag.source

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet + no visible */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'MAG',
    description:
      'Mercado Agroganadero de Cañuelas. Mercado concentrador de hacienda en pie del partido de Cañuelas (provincia de Buenos Aires) que en 2022 reemplazó al histórico Mercado de Liniers como principal plaza de formación del precio de referencia del ganado bovino argentino. Concentra la oferta y la demanda de invernada y faena, y opera con remate a la vista.',
    url: PAGE_URL,
  },
  {
    name: 'Mercado de Liniers',
    description:
      'Mercado concentrador de hacienda que funcionó en el barrio porteño de Mataderos (Liniers), Buenos Aires, desde 1901 hasta 2022. Durante más de un siglo fue la referencia del precio de la hacienda en Argentina; cerró y trasladó su operación al Mercado Agroganadero (MAG) de Cañuelas por razones sanitarias, urbanas y de infraestructura.',
    url: `${BASE_URL}/mercado/liniers`,
  },
  {
    name: 'INMAG',
    description:
      'Índice Novillo Mercado Agroganadero. Precio promedio ponderado del novillo en pie que surge de las operaciones diarias del MAG de Cañuelas, expresado en pesos por kilo vivo. Es el sucesor directo del histórico índice de Liniers y funciona como precio de referencia del ganado bovino argentino.',
    url: `${BASE_URL}/mercado/inmag`,
  },
  {
    name: 'Hacienda en pie',
    description:
      'Ganado bovino vivo, comercializado por kilo de peso vivo antes de la faena, en oposición a la carne en gancho o en res. El MAG concentra la compraventa de hacienda en pie: los animales llegan vivos, se pesan y se rematan por kilo vivo.',
  },
  {
    name: 'Remate a la vista',
    description:
      'Modalidad de venta en la que la hacienda se ofrece físicamente en los corrales del mercado y los compradores pujan viendo los animales, lote por lote. Es el mecanismo por el que el MAG forma el precio: el valor no está fijado de antemano, sino que sale de la puja pública sobre el ganado presente.',
  },
  {
    name: 'Oferta y demanda',
    description:
      'Fuerzas que determinan el precio en el MAG. La oferta es la cantidad de hacienda que los productores envían al mercado cada rueda; la demanda es la cantidad que frigoríficos, matarifes y consumo están dispuestos a comprar. El cruce de ambas en el remate a la vista fija el precio del día, que luego se resume en el INMAG.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first, con número vivo interpolado por template str.  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el MAG (Mercado Agroganadero de Cañuelas)?',
    answer: `El MAG es el Mercado Agroganadero de Cañuelas, el principal mercado concentrador de hacienda en pie de Argentina. En 2022 reemplazó al histórico Mercado de Liniers y es donde se forma el precio de referencia del ganado bovino por oferta y demanda, con remate a la vista. Su índice, el INMAG, cotiza hoy (${INMAG_DATE}) a $${inmagCurrent}/kg vivo para el novillo. Es un precio de referencia del mercado, no fijado por esta página.`,
  },
  {
    question: '¿Por qué cerró el Mercado de Liniers?',
    answer:
      'El Mercado de Liniers cerró en 2022, tras más de 120 años de operación en el barrio porteño de Mataderos, por razones sanitarias, de urbanización creciente alrededor del predio y de infraestructura obsoleta para el volumen de hacienda. Su función de concentración y formación de precio se trasladó al Mercado Agroganadero (MAG) de Cañuelas, un predio nuevo y de mayor escala en la provincia de Buenos Aires.',
  },
  {
    question: '¿Cómo se forma el precio en el MAG?',
    answer: `El precio en el MAG se forma por oferta y demanda mediante remate a la vista: la hacienda llega viva a los corrales, se pesa y se remata por kilo vivo lote por lote, con los compradores (frigoríficos, matarifes, consumo) pujando frente a los animales. El precio del día no está fijado de antemano; surge de esa puja pública y se resume en el INMAG, que hoy (${INMAG_DATE}) marca $${inmagCurrent}/kg vivo.`,
  },
  {
    question: '¿Qué es el INMAG?',
    answer: `El INMAG (Índice Novillo Mercado Agroganadero) es el precio promedio ponderado del novillo en pie que surge de las operaciones diarias del MAG de Cañuelas, expresado en pesos por kilo vivo. Es el sucesor del índice de Liniers y la referencia del ganado bovino argentino. Al ${INMAG_DATE} cotiza a $${inmagCurrent}/kg vivo (rueda previa $${inmagPrev}, variación ${inmagChange > 0 ? '+' : ''}${inmagChange}%). Es un valor de referencia, no fijado por esta página.`,
  },
]

export const metadata: Metadata = {
  title: `Qué es el MAG (Mercado Agroganadero de Cañuelas): MAG vs Liniers e INMAG ${INMAG_DATE.slice(0, 4)}`,
  description: `El MAG es el Mercado Agroganadero de Cañuelas que en 2022 reemplazó al histórico Mercado de Liniers; ahí se forma el precio de referencia del ganado (INMAG) por oferta y demanda a la vista. INMAG hoy (${INMAG_DATE}): $${inmagCurrent}/kg vivo. Historia, MAG vs Liniers y cómo se forma el precio.`,
  keywords: [
    'que es el mag',
    'que es el mercado agroganadero de cañuelas',
    'mag vs liniers',
    'mercado agroganadero cañuelas',
    'mercado de liniers cierre',
    'que es el inmag',
    'precio de referencia del ganado',
    'mercado concentrador de hacienda',
    'precio del novillo en pie mag',
    'cañuelas mercado hacienda',
  ],
  openGraph: {
    title: 'Qué es el MAG (Mercado Agroganadero de Cañuelas): MAG vs Liniers',
    description: `El mercado concentrador de hacienda de Cañuelas que en 2022 reemplazó a Liniers y forma el precio de referencia del ganado (INMAG). Hoy $${inmagCurrent}/kg vivo (${INMAG_DATE}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElMagPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-mag" sectionName="Qué es el MAG" />
      <DefinedTermSetSchema
        name="Mercado Agroganadero (MAG) — definiciones"
        description="Definiciones citables del MAG (Mercado Agroganadero de Cañuelas), el Mercado de Liniers, el INMAG, la hacienda en pie, el remate a la vista y la oferta y demanda en la formación del precio del ganado argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="INMAG — Índice Novillo Mercado Agroganadero (Cañuelas)"
        description={`Precio de referencia del novillo en pie en el Mercado Agroganadero de Cañuelas (MAG) al ${INMAG_DATE}: $${inmagCurrent}/kg vivo (rueda previa $${inmagPrev}, variación ${inmagChange > 0 ? '+' : ''}${inmagChange}%). Serie diaria por oferta y demanda a la vista. Precio de referencia del mercado, no fijado por esta página.`}
        url={`${BASE_URL}/mercado/inmag`}
        keywords={['INMAG', 'mercado agroganadero', 'cañuelas', 'novillo en pie', 'precio del ganado', 'MAG', 'liniers']}
        dateModified={lastUpdate}
        creator={inmagSource}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el MAG (Mercado Agroganadero de Cañuelas): MAG vs Liniers"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es el MAG (Mercado Agroganadero de Cañuelas): historia, MAG vs Liniers y precio"
        description="El Mercado Agroganadero de Cañuelas (MAG) como sucesor del Mercado de Liniers en la formación del precio de referencia del ganado argentino (INMAG), por oferta y demanda a la vista."
        url={PAGE_URL}
        dateModified={lastUpdate}
        proficiencyLevel="Beginner"
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Qué es el MAG
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el MAG (Mercado Agroganadero de Cañuelas): MAG vs Liniers
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El MAG es el Mercado Agroganadero de Cañuelas, el principal mercado concentrador de
          hacienda en pie de Argentina que en 2022 reemplazó al histórico Mercado de Liniers; ahí se
          forma el precio de referencia del ganado bovino —el INMAG, hoy ({INMAG_DATE}) en{' '}
          <strong className="text-zinc-100">${inmagCurrent}/kg vivo</strong>— por oferta y demanda,
          con remate a la vista.
        </p>

        <p className="text-zinc-400 mb-8">
          El mercado funciona en el partido de Cañuelas, provincia de Buenos Aires. Los productores
          envían la hacienda viva, se pesa y se remata por kilo vivo lote por lote; los compradores
          —frigoríficos, matarifes y consumo— pujan viendo los animales. De ese cruce sale el precio
          del día, que se resume en el INMAG (Índice Novillo Mercado Agroganadero). El valor que
          publica esta página es información de referencia del mercado, no un precio fijado por
          consignatarias.com.ar.
        </p>

        {/* INMAG vivo */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-4 py-3 mb-8">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">
            INMAG · Novillo en pie · MAG Cañuelas
          </p>
          <p className="text-zinc-100 text-2xl font-medium">
            ${inmagCurrent}
            <span className="text-zinc-500 text-sm font-normal"> /kg vivo</span>
          </p>
          <p className="text-zinc-500 text-xxs mt-1">
            Rueda previa ${inmagPrev} · Variación {inmagChange > 0 ? '+' : ''}
            {inmagChange}% · Fuente {inmagSource} · Actualizado {lastUpdate}
          </p>
          <p className="text-zinc-500 text-xxs mt-2">
            Precio de referencia del mercado (INMAG/MAG), no fijado por esta página.{' '}
            <Link href="/mercado/inmag" className="text-accent hover:text-accent-bright transition-colors">
              Ver el INMAG en vivo →
            </Link>
          </p>
        </div>

        {/* Historia */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          De Liniers a Cañuelas: por qué se mudó el mercado
        </h2>
        <p className="text-zinc-400 mb-4">
          Durante más de un siglo, el precio de la hacienda argentina se formó en el Mercado de
          Liniers, en el barrio porteño de Mataderos, que abrió en 1901. El crecimiento urbano
          alrededor del predio, las exigencias sanitarias y una infraestructura que quedó chica para
          el volumen de hacienda llevaron a su cierre en 2022. Ese año, la función de concentración
          y de formación de precio se trasladó al Mercado Agroganadero de Cañuelas, un predio nuevo y
          de mayor escala en la provincia de Buenos Aires.
        </p>
        <p className="text-zinc-400 mb-8">
          El cambio fue de sede y de escala, no de mecanismo: el MAG mantiene el remate a la vista y
          la comercialización de hacienda en pie por kilo vivo. El índice de referencia también
          cambió de nombre —de la cotización de Liniers al INMAG— pero cumple la misma función: ser
          el precio del novillo que mira todo el mercado.
        </p>

        {/* MAG vs Liniers */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">MAG vs Liniers: qué cambió</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">&nbsp;</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Mercado de Liniers</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">MAG (Cañuelas)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300 font-medium">Ubicación</td>
                <td className="px-3 py-2 text-zinc-400">Mataderos, Ciudad de Buenos Aires</td>
                <td className="px-3 py-2 text-zinc-400">Cañuelas, provincia de Buenos Aires</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300 font-medium">Vigencia</td>
                <td className="px-3 py-2 text-zinc-400">1901–2022</td>
                <td className="px-3 py-2 text-zinc-400">Desde 2022 (activo)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300 font-medium">Índice de referencia</td>
                <td className="px-3 py-2 text-zinc-400">Cotización del novillo de Liniers</td>
                <td className="px-3 py-2 text-zinc-400">INMAG (Índice Novillo Mercado Agroganadero)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300 font-medium">Mecanismo</td>
                <td className="px-3 py-2 text-zinc-400">Remate a la vista, hacienda en pie</td>
                <td className="px-3 py-2 text-zinc-400">Remate a la vista, hacienda en pie</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-300 font-medium">Precio hoy</td>
                <td className="px-3 py-2 text-zinc-400">—</td>
                <td className="px-3 py-2 text-zinc-200">${inmagCurrent}/kg vivo ({INMAG_DATE})</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cómo se forma el precio */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo se forma el precio en el MAG</h2>
        <p className="text-zinc-400 mb-4">
          El precio no se fija de antemano: sale de la puja pública sobre el ganado presente. El
          circuito de cada rueda es:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Ingreso y pesaje:</span> la hacienda llega viva a los
            corrales y se pesa; se comercializa por kilo de peso vivo.
          </li>
          <li>
            <span className="text-zinc-300">Oferta:</span> la cantidad de animales que los
            productores mandan al mercado ese día, por categoría (novillo, novillito, vaca, etc.).
          </li>
          <li>
            <span className="text-zinc-300">Demanda:</span> frigoríficos, matarifes y consumo pujan
            lote por lote frente a los animales, en el remate a la vista.
          </li>
          <li>
            <span className="text-zinc-300">Precio y cierre:</span> el cruce de oferta y demanda fija
            el valor del día, que se pondera por volumen y se resume en el INMAG.
          </li>
        </ul>

        {/* FAQ visible — mismo array que el schema */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-terminal-border pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos densos */}
        <div className="border-t border-terminal-border pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/mercado/inmag" className="text-accent hover:text-accent-bright transition-colors">
            INMAG en vivo →
          </Link>
          <Link href="/mercado/canuelas" className="text-accent hover:text-accent-bright transition-colors">
            Mercado de Cañuelas →
          </Link>
          <Link href="/mercado/liniers" className="text-accent hover:text-accent-bright transition-colors">
            Mercado de Liniers →
          </Link>
          <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
            Precio del novillo en pie →
          </Link>
          <Link href="/indices" className="text-accent hover:text-accent-bright transition-colors">
            Índices del mercado →
          </Link>
          <Link href="/metodologia" className="text-accent hover:text-accent-bright transition-colors">
            Metodología →
          </Link>
          <Link href="/categorias-de-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Categorías de hacienda
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Precio de referencia del mercado (INMAG/MAG), no fijado por esta página. Actualizado:{' '}
          {lastUpdate} · Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
