import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/cuanto-vale-un-toro`

// Números vivos — interpolados en build; el scraper reescribe el JSON a las 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

// Mercado 1 — TORO GORDO / DE FAENA: se cotiza por kilo vivo en el MAG (categoría toros).
const toroKg = price('toros')
const usdBlue = marketPrices.usdBlue.current
const toroUsdKg = Math.round((toroKg / usdBlue) * 100) / 100
const faena700 = toroKg * 700
const faena850 = toroKg * 850
const faena1000 = toroKg * 1000

// Mercado 2 — TORO REPRODUCTOR: se vende POR CABEZA en remates de cabaña, no por kilo.
// Rangos de referencia de plaza (no salen del panel INMAG): PC/pedigrí comercial vs. elite.
const REPRO_USD_MIN = 2500
const REPRO_USD_MAX = 6000
const REPRO_ELITE_USD = 10000
const reproArsMin = REPRO_USD_MIN * usdBlue
const reproArsMax = REPRO_USD_MAX * usdBlue

// FUENTE ÚNICA de la tabla: cada fila alimenta el HTML visible; precio = referencia de plaza.
type Row = {
  categoria: string
  detalle: string
  unidad: string
  referencia: string
}

const ROWS: Row[] = [
  {
    categoria: 'Toro reproductor PC / pedigrí (Angus, Hereford)',
    detalle: 'Comercial, apto de servicio, en remate de cabaña',
    unidad: 'por cabeza',
    referencia: `USD ${fmt(REPRO_USD_MIN)}–${fmt(REPRO_USD_MAX)} (≈ $${fmt(reproArsMin)}–$${fmt(reproArsMax)})`,
  },
  {
    categoria: 'Toro de cabaña de punta / cabeza de remate',
    detalle: 'Genética destacada, EPD superiores, demanda de reposición',
    unidad: 'por cabeza',
    referencia: `USD ${fmt(REPRO_ELITE_USD)} o más`,
  },
  {
    categoria: 'Toro de faena / descarte (refugo)',
    detalle: 'Toro entero adulto que sale del rodeo hacia faena de manufactura',
    unidad: 'por kilo vivo',
    referencia: `$${fmt(toroKg)}/kg → $${fmt(faena700)}–$${fmt(faena1000)} (700–1000 kg)`,
  },
]

// Entidades citables — cada término con @id estable url#slug.
const TERMINOS = [
  {
    name: 'Toro',
    description:
      'Bovino macho entero (no castrado) adulto, de 700 a 1000 kg de peso vivo. Según su destino se comercializa en dos mercados distintos: como reproductor por cabeza en remates de cabaña, o como toro de faena por kilo vivo cuando se descarta del rodeo.',
    url: `${PAGE_URL}#toro`,
  },
  {
    name: 'Toro reproductor',
    description:
      'Toro seleccionado para servicio, que aporta la mitad de la genética de la próxima generación de terneros. Se vende por cabeza en remates de cabaña y su precio depende de la raza, los datos productivos (EPD), la circunferencia escrotal, la sanidad y la aptitud reproductiva, no de su peso.',
    url: `${PAGE_URL}#toro-reproductor`,
  },
  {
    name: 'PC / pedigrí',
    description:
      'Categorías de registro genealógico. Un toro de pedigrí (PP, Puro de Pedigrí) tiene padre y madre inscriptos y controlados; un toro PC (Puro por Cruza o Puro Controlado) alcanza el estándar racial por generaciones sucesivas de absorción. El registro respalda el valor del reproductor en remate.',
    url: `${PAGE_URL}#pc-pedigri`,
  },
  {
    name: 'EPD',
    description:
      'Diferencia Esperada de Progenie (Expected Progeny Difference). Estimación del desempeño que un toro transmite a su descendencia en caracteres como peso al destete, peso final, área de ojo de bife o facilidad de parto. Los EPD son el principal dato objetivo que sostiene el precio de un reproductor.',
    url: `${PAGE_URL}#epd`,
  },
  {
    name: 'Circunferencia escrotal',
    description:
      'Medida del perímetro del escroto del toro, correlacionada con la producción de semen y la precocidad sexual de su progenie. Es parte de la evaluación de aptitud reproductiva (capacidad de servicio) que se controla antes de vender un toro reproductor.',
    url: `${PAGE_URL}#circunferencia-escrotal`,
  },
  {
    name: 'Toro de refugo',
    description:
      'Toro que se descarta del servicio —por edad, problemas de fertilidad, aplomos o sanidad— y se destina a faena. Se vende por kilo vivo como toro de manufactura, con el menor precio por kilo del panel de categorías del Mercado Agroganadero.',
    url: `${PAGE_URL}#toro-de-refugo`,
  },
]

// FAQ — answer-first, con números vivos interpolados.
const FAQ = [
  {
    question: '¿Cuánto sale un toro Angus reproductor en Argentina?',
    answer: `Un toro Angus reproductor con pedigrí o Puro por Cruza, apto de servicio, se vende por cabeza en remates de cabaña y ronda de referencia entre USD ${fmt(REPRO_USD_MIN)} y USD ${fmt(REPRO_USD_MAX)} (≈ $${fmt(reproArsMin)} a $${fmt(reproArsMax)} al dólar $${fmt(usdBlue)}). Los toros de cabaña de punta, con EPD destacados, superan los USD ${fmt(REPRO_ELITE_USD)}. Es un precio de referencia del mercado, no fijado por esta página: el valor real lo define cada remate según genética, sanidad y demanda.`,
  },
  {
    question: '¿Cuánto vale un toro de faena por kilo vivo?',
    answer: `Un toro de faena o descarte se paga por kilo vivo, no por cabeza: hoy vale alrededor de $${fmt(toroKg)}/kg (≈ USD ${toroUsdKg}/kg) según el panel de categorías del Mercado Agroganadero al ${lastUpdate}. Un toro entero de 700 a 1000 kg equivale a unos $${fmt(faena700)} a $${fmt(faena1000)} por cabeza. Es la referencia mayorista del animal en pie para faena de manufactura, no fijada por esta página.`,
  },
  {
    question: '¿Por qué un toro reproductor vale más que uno de faena?',
    answer: `Porque son dos mercados distintos. El toro de faena se paga por su carne, a $${fmt(toroKg)}/kg vivo (MAG, ${lastUpdate}) —el menor precio por kilo del panel, por ser carne de manufactura de un animal viejo—. El toro reproductor se paga por su genética: un solo toro sirve decenas de vacas por temporada y define el peso, la conformación y la fertilidad de toda su progenie, por eso se cotiza por cabeza y no por kilo. Un reproductor comercial puede valer varias veces lo que ese mismo animal rendiría a faena.`,
  },
  {
    question: '¿Dónde se compran los toros reproductores?',
    answer:
      'Los toros reproductores se compran en remates de cabaña —presenciales o por pantalla— donde las cabañas presentan sus planteles con datos de raza, EPD, circunferencia escrotal y sanidad, y una consignataria conduce la subasta. También se venden por venta particular directa de cabaña. El toro de descarte, en cambio, se comercializa por kilo vivo en el mercado concentrador o a través de una consignataria como el resto de la hacienda gorda.',
  },
]

export const metadata: Metadata = {
  title: `Cuánto Vale un Toro en Argentina 2026: Reproductor y de Faena`,
  description: `Un toro reproductor PC/pedigrí (Angus, Hereford) ronda USD ${fmt(REPRO_USD_MIN)}–${fmt(REPRO_USD_MAX)} por cabeza en remate de cabaña; un toro de faena vale ~$${fmt(toroKg)}/kg vivo (Mercado Agroganadero, ${lastUpdate}). Dos mercados distintos, con tabla de precios de referencia.`,
  keywords: [
    'cuanto vale un toro reproductor argentina',
    'cuanto sale un toro',
    'precio de un toro',
    'precio de toros',
    'cuanto cuesta un toro angus',
    'precio toro reproductor',
    'precio toro angus',
    'precio toro hereford',
    'cuanto vale un toro de faena',
    'valor de un toro reproductor',
    'toro por kilo vivo',
  ],
  openGraph: {
    title: `Cuánto vale un toro en Argentina 2026: reproductor y de faena`,
    description: `Toro reproductor PC/pedigrí desde USD ${fmt(REPRO_USD_MIN)} por cabeza; toro de faena ~$${fmt(toroKg)}/kg vivo (MAG, ${lastUpdate}). Dos mercados, precios de referencia.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoValeUnToroPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DefinedTermSetSchema
        name="Toro reproductor y toro de faena — categorías del mercado ganadero argentino"
        description="Definiciones de toro, toro reproductor, PC/pedigrí, EPD, circunferencia escrotal y toro de refugo, con los dos mercados en que se comercializa el toro bovino en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Cuánto vale un toro en Argentina 2026: reproductor y de faena`}
      />
      <DatasetSchema
        name="Precio del toro de faena en el Mercado Agroganadero"
        description={`Precio del kilo vivo del toro de faena / descarte en el panel de categorías del Mercado Agroganadero de Buenos Aires: $${fmt(toroKg)}/kg (≈ USD ${toroUsdKg}/kg) al ${lastUpdate}. Referencia mayorista del animal en pie para faena de manufactura.`}
        url={PAGE_URL}
        keywords={['toro', 'toro de faena', 'precio kilo vivo', 'mercado agroganadero', 'INMAG', 'hacienda', 'Argentina']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Cuánto vale un toro
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto vale un toro en Argentina en 2026
        </h1>

        {/* Answer-first: primera oración autocontenida y citable, con los dos rangos */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Un <strong>toro reproductor</strong> con pedigrí o Puro por Cruza (Angus o Hereford) se
          vende por cabeza en remates de cabaña y ronda entre{' '}
          <strong>USD {fmt(REPRO_USD_MIN)} y USD {fmt(REPRO_USD_MAX)}</strong> (≈ $
          {fmt(reproArsMin)}–${fmt(reproArsMax)}); un <strong>toro de faena o descarte</strong> se
          vende por kilo vivo a <strong>${fmt(toroKg)}/kg</strong> (≈ $
          {fmt(faena700)}–${fmt(faena1000)} por cabeza de 700 a 1000 kg), según el precio de
          referencia del Mercado Agroganadero al {lastUpdate}.
        </p>

        <p className="mb-4">
          El toro se cotiza en <strong>dos mercados que no hay que confundir</strong>. El{' '}
          <strong>reproductor</strong> se paga por su genética —por cabeza, en remate de cabaña— y
          su valor lo definen la raza, los datos productivos (EPD), la circunferencia escrotal, la
          sanidad y la demanda de reposición, no su peso. El <strong>toro gordo o de refugo</strong>{' '}
          se paga por su carne —por kilo vivo, como el resto de la hacienda gorda— y hoy equivale a
          unos <strong>USD {toroUsdKg}/kg</strong> (dólar $
          {fmt(usdBlue)}). Los dos son precios de referencia del mercado, no fijados por esta
          página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Precio del toro según categoría
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Detalle</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Unidad</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio de referencia
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.categoria} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{r.categoria}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.detalle}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.unidad}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">{r.referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          El toro de faena se cotiza por kilo vivo en el panel de categorías del Mercado
          Agroganadero (${fmt(toroKg)}/kg, {INMAG_DATE}). Los valores del reproductor son rangos de
          referencia de plaza en remates de cabaña, no una serie del panel INMAG: son precio de
          referencia del mercado, no fijado por esta página, y el valor real de cada toro se define
          en el remate.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Toro reproductor: se vende por cabeza en remates de cabaña
        </h2>
        <p className="mb-4">
          El reproductor se compra por lo que transmite a su descendencia. Un solo toro sirve
          decenas de vacas por temporada, así que su genética —peso al destete, peso final,
          conformación, fertilidad— define la mitad del rodeo futuro. Por eso se cotiza por cabeza y
          no por kilo, y por eso las cabañas lo presentan con datos objetivos: raza y registro (PC o
          pedigrí), EPD, circunferencia escrotal y evaluación de aptitud reproductiva. Un toro PC o
          de pedigrí comercial, apto de servicio, ronda de referencia entre USD{' '}
          {fmt(REPRO_USD_MIN)} y USD {fmt(REPRO_USD_MAX)} por cabeza; los toros de cabaña de punta,
          con EPD destacados, superan los USD {fmt(REPRO_ELITE_USD)}.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Toro de faena o descarte: se vende por kilo vivo
        </h2>
        <p className="mb-4">
          El <strong>toro de refugo</strong> —el que sale del servicio por edad, fertilidad o
          aplomos— se destina a faena de manufactura y se paga por kilo vivo como el resto de la
          hacienda gorda. Hoy vale unos <strong>${fmt(toroKg)}/kg</strong> vivo (Mercado
          Agroganadero, {lastUpdate}), el menor precio por kilo del panel de categorías, porque es
          carne de un animal adulto y pesado. Un toro entero de 850 kg equivale a unos{' '}
          <strong>${fmt(faena850)}</strong>; según el peso, de $
          {fmt(faena700)} (700 kg) a ${fmt(faena1000)} (1000 kg). Es la referencia mayorista del
          animal en pie, no el precio de la carne en la carnicería.
        </p>

        {/* FAQ visible — mismo array que el schema */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {FAQ.map((f) => (
            <div key={f.question} className="border-l-2 border-terminal-border pl-3">
              <dt className="text-zinc-200 font-medium mb-1">{f.question}</dt>
              <dd className="text-zinc-400">{f.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos densos a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto vale una vaca? →
            </Link>
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
            <Link href="/razas-bovinas-argentina" className="text-accent hover:text-accent-bright transition-colors">
              Razas bovinas →
            </Link>
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              Cómo funciona un remate →
            </Link>
            <Link href="/remates" className="text-accent hover:text-accent-bright transition-colors">
              Remates ganaderos →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/mercado/toros" className="text-accent hover:text-accent-bright transition-colors">
              Precio del toro en el Mercado Agroganadero →
            </Link>{' '}
            serie diaria del kilo vivo, histórico y variación.
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            El toro reproductor se comercializa por cabeza en remates de cabaña; el toro de faena,
            por kilo vivo en el Mercado Agroganadero. Precios de referencia del mercado (MAG /
            INMAG); esta página no fija precios.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
