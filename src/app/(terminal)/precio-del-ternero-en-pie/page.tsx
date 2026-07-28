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
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/precio-del-ternero-en-pie`

/* ------------------------------------------------------------------ */
/*  Números vivos — interpolados en build; el scraper reescribe el     */
/*  JSON a las 14:00 ART y revalidate=86400 fuerza el rebuild diario.  */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const ternero = price('terneros')
const novillito = price('novillitos')
const novillo = price('novillos')
const vaquillona = price('vaquillonas')
const vaca = price('vacas')

// Valor de referencia de un ternero tipo de destete (180 kg de peso vivo).
const PESO_TERNERO = 180
const valorTernero = ternero * PESO_TERNERO

/* ------------------------------------------------------------------ */
/*  Estacionalidad — mismo array alimenta la tabla y el schema Dataset  */
/*  no numérico; describe cómo la zafra mueve la oferta y el precio.    */
/* ------------------------------------------------------------------ */
const SEASONS = [
  {
    periodo: 'Marzo – Mayo',
    fase: 'Zafra de terneros',
    oferta: 'Alta (pico anual)',
    efecto: 'Presiona el precio a la baja',
    detalle:
      'Se destetan y venden los terneros nacidos en la parición de primavera; la oferta se concentra y el $/kg tiende a ceder.',
  },
  {
    periodo: 'Junio – Agosto',
    fase: 'Invierno',
    oferta: 'Baja',
    efecto: 'Sostiene o firma el precio',
    detalle:
      'Pasada la zafra queda menos ternero disponible; el invernador que necesita reponer paga mejor por kilo.',
  },
  {
    periodo: 'Septiembre – Noviembre',
    fase: 'Primavera',
    oferta: 'Media',
    efecto: 'Precio estable a firme',
    detalle:
      'Arranca la nueva parición; la oferta de terneros para venta todavía es acotada y el pasto valoriza la recría.',
  },
  {
    periodo: 'Diciembre – Febrero',
    fase: 'Verano',
    oferta: 'Media-baja',
    efecto: 'Precio firme',
    detalle:
      'Anticipo de la zafra siguiente; el ternero liviano escasea y se paga por su potencial de engorde.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — citables por asistentes IA (patrón /glosario). */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Ternero',
    description:
      'Bovino macho de menos de 1 año, generalmente al destete, de 160 a 200 kg de peso vivo. Es la salida comercial del criador después del destete y la categoría de invernada por excelencia: se vende para recría o engorde, no para faena. Suele liderar el precio por kilo vivo por su potencial de crecimiento.',
    url: PAGE_URL,
  },
  {
    name: 'Ternera',
    description:
      'Bovino hembra de menos de 1 año al destete, de peso vivo similar al ternero macho. Según su destino se cría para reposición del rodeo (futura vaquillona y vaca de cría) o se termina para faena liviana; como invernada suele cotizar algo por debajo del ternero macho.',
  },
  {
    name: 'Invernada',
    description:
      'Hacienda joven —típicamente el ternero y la ternera de destete— que se compra para recriar y engordar hasta terminarla. No es un animal terminado: su precio por kilo vivo refleja el potencial de aumento de peso por delante, por eso paga más caro que la hacienda gorda.',
    url: `${BASE_URL}/que-es-la-invernada`,
  },
  {
    name: 'Destete',
    description:
      'Separación del ternero de su madre, en general a los 6–8 meses y 160–200 kg. Marca el fin de la etapa de cría y el momento en que el criador vende el ternero como invernada; concentra la oferta y define la zafra de terneros.',
    url: `${BASE_URL}/que-es-el-destete`,
  },
  {
    name: 'Zafra de terneros',
    description:
      'Concentración estacional de la venta de terneros de destete, en Argentina sobre todo entre marzo y mayo, cuando llegan al mercado los nacidos en la parición de primavera. Al aumentar la oferta en pocas semanas, la zafra suele presionar el precio por kilo a la baja.',
  },
  {
    name: 'Kilo vivo',
    description:
      'Precio por kilogramo de peso del animal en pie (vivo), antes de la faena. Es la unidad en la que se comercializa la hacienda en el remate y en el Mercado Agroganadero; el valor del ternero surge de multiplicar su peso vivo por el $/kg de la categoría.',
    url: `${BASE_URL}/categorias-de-hacienda`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — cada respuesta arranca con el dato (answer-first) e          */
/*  interpola números vivos con template strings.                      */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿A cuánto está el kilo de ternero hoy?',
    answer: `El kilo de ternero vivo en pie está hoy (${INMAG_DATE}) a $${fmt(ternero)}/kg como precio de referencia del Mercado Agroganadero (INMAG/MAG). Es la categoría que más vale por kilo del panel, por encima del novillito ($${fmt(novillito)}) y el novillo ($${fmt(novillo)}). Un ternero tipo de destete de ${PESO_TERNERO} kg equivale así a unos $${fmt(valorTernero)} de referencia. Es un valor de referencia del mercado, no fijado por esta página.`,
  },
  {
    question: '¿Cuándo conviene vender terneros?',
    answer: `Conviene vender terneros fuera del pico de la zafra, que en Argentina se concentra entre marzo y mayo: en esos meses se desteta y sale a la venta la mayor cantidad de terneros y la oferta concentrada presiona el $/kg a la baja. En invierno (junio–agosto), con menos ternero disponible, el precio por kilo tiende a sostenerse o firmar. Hoy el ternero cotiza $${fmt(ternero)}/kg vivo de referencia (${lastUpdate}); la decisión también depende de la carga de pasto y del costo de retener el animal.`,
  },
  {
    question: '¿Por qué el ternero vale más por kg que el novillo?',
    answer: `El ternero vale más por kilo que el novillo porque es hacienda de invernada con potencial de crecimiento por delante, no un animal terminado para faena. Hoy el ternero cotiza $${fmt(ternero)}/kg vivo y el novillo $${fmt(novillo)}/kg (referencia INMAG/MAG, ${INMAG_DATE}). El comprador paga la promesa de kilos futuros: cada kilo de ternero se convierte en varios kilos de novillo durante la recría y el engorde, y esa expectativa se refleja en el precio por kilo.`,
  },
]

export const metadata: Metadata = {
  title: `Precio del ternero en pie hoy: $${fmt(ternero)}/kg vivo (${lastUpdate}) y estacionalidad`,
  description: `El kilo de ternero vivo en pie está hoy (${INMAG_DATE}) a $${fmt(ternero)}/kg como precio de referencia del Mercado Agroganadero (INMAG/MAG): es la categoría de invernada más buscada por el criador que vende post-destete. Cuánto está el ternero por kilo, cómo lo mueve la zafra de terneros (marzo–mayo) y por qué el invierno sostiene el precio.`,
  keywords: [
    'cuanto esta el kilo de ternero vivo en pie',
    'cuanto esta el kilo de ternero vivo',
    'precio del ternero en pie',
    'precio del ternero hoy',
    'precio ternero por kilo',
    'cuanto vale un ternero',
    'precio kilo vivo ternero',
    'precio invernada',
    'zafra de terneros',
    'precio ternero de destete',
  ],
  openGraph: {
    title: `Precio del ternero en pie hoy: $${fmt(ternero)}/kg vivo`,
    description: `El kilo de ternero vivo en pie está hoy a $${fmt(ternero)}/kg de referencia (INMAG/MAG, ${INMAG_DATE}). Precio por kilo, estacionalidad y por qué la invernada vale más que la hacienda gorda.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function PrecioDelTerneroEnPiePage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DefinedTermSetSchema
        name="Precio del ternero en pie — definiciones"
        description="Definiciones citables de ternero, ternera, invernada, destete, zafra de terneros y kilo vivo en el mercado ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="Precio del ternero en pie — Mercado Agroganadero"
        description={`Precio de referencia por kilo vivo del ternero de invernada en el Mercado Agroganadero de Buenos Aires al ${INMAG_DATE}: $${fmt(ternero)}/kg vivo. Comparado con novillito ($${fmt(novillito)}), novillo ($${fmt(novillo)}), vaquillona ($${fmt(vaquillona)}) y vaca ($${fmt(vaca)}). Fuente INMAG/MAG.`}
        url={PAGE_URL}
        keywords={['precio ternero', 'ternero en pie', 'kilo vivo', 'invernada', 'zafra de terneros', 'mercado agroganadero', 'INMAG']}
        dateModified={lastUpdate}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Precio del ternero en pie hoy: $/kg vivo y estacionalidad"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Precio del ternero en pie
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio del ternero en pie hoy: $/kg vivo y estacionalidad
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El kilo de ternero vivo en pie está hoy ({INMAG_DATE}) a{' '}
          <strong>${fmt(ternero)}/kg</strong> como precio de referencia del Mercado Agroganadero
          (INMAG/MAG); es la categoría que más vale por kilo, por encima del novillito (
          ${fmt(novillito)}) y el novillo (${fmt(novillo)}).
        </p>

        <p className="mb-4">
          Es un <strong>precio de referencia del mercado (INMAG/MAG), no fijado por esta página</strong>:
          se mide por kilo vivo en el Mercado Agroganadero de Buenos Aires y se actualiza a diario. Un
          ternero tipo de destete de {PESO_TERNERO} kg equivale, a ese valor, a unos{' '}
          <strong>${fmt(valorTernero)}</strong> de referencia. El ternero es la <strong>salida del
          criador</strong>: cuando termina la etapa de cría, el productor lo desteta y lo vende como
          invernada para que otro lo recríe y engorde. Por eso es la categoría más buscada por quien
          vende hacienda, y su precio por kilo se mueve fuerte con la estación del año.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Por qué el ternero vale más por kilo
        </h2>
        <p className="mb-4">
          El ternero es <strong>invernada</strong>, no hacienda terminada: el comprador paga por los
          kilos que el animal todavía va a ganar durante la recría y el engorde. Cada kilo de ternero
          se convierte en varios kilos de novillo, y esa promesa de crecimiento se refleja en el
          precio por kilo. Por eso hoy el ternero (${fmt(ternero)}/kg vivo) cotiza por encima del
          novillito (${fmt(novillito)}), el novillo (${fmt(novillo)}) y la vaquillona (
          ${fmt(vaquillona)}), y muy por arriba de la vaca de descarte (${fmt(vaca)}), que es un
          animal adulto camino a faena.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Estacionalidad: la zafra de terneros y el invierno
        </h2>
        <p className="mb-4">
          El precio del ternero tiene un patrón estacional marcado por la{' '}
          <strong>zafra de terneros</strong>. Entre <strong>marzo y mayo</strong> se destetan y salen
          a la venta los terneros nacidos en la parición de primavera: la oferta se concentra en pocas
          semanas y el $/kg tiende a ceder. Pasada la zafra, en <strong>invierno</strong> (junio–agosto)
          queda menos ternero disponible y el invernador que necesita reponer paga mejor, lo que
          sostiene o firma el precio por kilo.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Estacionalidad del ternero por período
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Período</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Fase</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Oferta</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Efecto en el precio
                </th>
              </tr>
            </thead>
            <tbody>
              {SEASONS.map((s) => (
                <tr key={s.periodo} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap">
                    {s.periodo}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{s.fase}</td>
                  <td className="px-3 py-2 text-zinc-300">{s.oferta}</td>
                  <td className="px-3 py-2 text-zinc-400">{s.efecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Patrón estacional orientativo del ternero de invernada en la zona pampeana; la intensidad
          de cada año depende del clima, la carga de pasto y la relación con el maíz. No es una
          cotización.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Precio de referencia por categoría (kilo vivo)
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Destino</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio ref. $/kg
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/mercado/terneros"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Ternero / Ternera
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Invernada (recría y engorde)</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(ternero)}</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/mercado/novillitos"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Novillito
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Faena liviana</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(novillito)}</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/mercado/novillos"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Novillo
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Consumo pesado / exportación</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(novillo)}</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/mercado/vaquillonas"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Vaquillona
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Reposición o faena</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(vaquillona)}</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/mercado/vacas"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Vaca
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Descarte / manufactura</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(vaca)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Precio por kilo vivo del Mercado Agroganadero (INMAG y panel de categorías, {INMAG_DATE}).
          Precio de referencia del mercado (INMAG/MAG), no fijado por esta página; cada firma acuerda
          el precio final con el productor.
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

        {/* Enlazado interno denso a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir leyendo
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/que-es-el-destete" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el destete →
            </Link>
            <Link href="/que-es-la-invernada" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la invernada →
            </Link>
            <Link href="/que-es-la-cria-y-recria" className="text-accent hover:text-accent-bright transition-colors">
              Cría y recría →
            </Link>
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/mercado/terneros" className="text-accent hover:text-accent-bright transition-colors">
              Precio del ternero en vivo →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado" className="text-accent hover:text-accent-bright transition-colors">
              Mercado y precios de referencia →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precio de referencia del mercado (Mercado Agroganadero / INMAG); no lo fija esta página.
            El ternero se comercializa por kilo vivo y su valor final se acuerda en cada operación.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
