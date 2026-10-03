import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import { DESCARGA_PRECIOS, FUENTE_MAG } from '@/lib/seo/schemas'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import { RematesDeInvernada, TERNERO_ESTIMADO_NOTA } from '@/components/precios/TerneroEstimado'

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

// `ternero` NO es un precio observado: el Mercado Agroganadero no opera terneros y el
// scraper lo calcula como INMAG × 1,10. Toda la página lo presenta como estimación.
// Ternero tipo de destete (180 kg de peso vivo).
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
    answer: `No hay un precio observado del ternero en el Mercado Agroganadero, porque ahí no se operan terneros. Nuestra estimación de hoy (${INMAG_DATE}) es $${fmt(ternero)} por kilo vivo, calculada como INMAG × 1,10: un ternero de destete de ${PESO_TERNERO} kg rondaría los $${fmt(valorTernero)}. El precio real lo marcan los remates de invernada, y cambia con el peso, la raza, la sanidad y la zona.`,
  },
  {
    question: '¿Cuándo conviene vender terneros?',
    answer: 'Conviene vender terneros fuera del pico de la zafra, que en Argentina se concentra entre marzo y mayo: en esos meses se desteta y sale a la venta la mayor cantidad de terneros y la oferta concentrada presiona el precio por kilo a la baja. En invierno (junio–agosto), con menos ternero disponible, el precio tiende a sostenerse o firmar. La decisión también depende del pasto que tengas y de lo que cuesta retener el animal.',
  },
  {
    question: '¿Por qué el ternero suele valer más por kilo que el novillo?',
    answer: 'Porque es hacienda de invernada, con crecimiento por delante, y no un animal terminado para faena. El que compra paga los kilos que el animal todavía va a ganar en la recría y el engorde. Por eso en los remates de invernada el ternero liviano suele pagarse más por kilo que el novillo gordo, aunque la diferencia cambia con el año y con la relación entre el maíz y la carne.',
  },
]

export const metadata: Metadata = {
  title: 'Precio del ternero en pie: cómo se forma, la zafra y los remates de invernada',
  description: 'Cómo se forma el precio del ternero en pie: por qué se vende en remates de invernada y no en el Mercado Agroganadero, cómo lo mueve la zafra de marzo a mayo, una estimación diaria rotulada como tal y los próximos remates.',
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
    title: 'Precio del ternero en pie: cómo se forma y cuándo conviene vender',
    description: 'Por qué el ternero se vende en remates de invernada, cómo lo mueve la zafra y una estimación diaria rotulada como tal.',
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
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" pageName="Precio del ternero en pie" pagePath="/precio-del-ternero-en-pie" />
      <DefinedTermSetSchema
        name="Precio del ternero en pie — definiciones"
        description="Definiciones citables de ternero, ternera, invernada, destete, zafra de terneros y kilo vivo en el mercado ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="Precio del ternero en pie — Mercado Agroganadero"
        description={`Estimación del kilo vivo del ternero de invernada al ${INMAG_DATE}: $${fmt(ternero)}/kg vivo (INMAG × 1,10; el Mercado Agroganadero no opera terneros, no es un precio observado). Comparado con novillito ($${fmt(novillito)}), novillo ($${fmt(novillo)}), vaquillona ($${fmt(vaquillona)}) y vaca ($${fmt(vaca)}). Base: INMAG del Mercado Agroganadero.`}
        url={PAGE_URL}
        keywords={['precio ternero', 'ternero en pie', 'kilo vivo', 'invernada', 'zafra de terneros', 'mercado agroganadero', 'INMAG']}
        dateModified={INMAG_DATE}
        license={null}
        fuente={FUENTE_MAG}
        distribution={[DESCARGA_PRECIOS]}
        temporalCoverage={INMAG_DATE}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Precio del ternero en pie: cómo se forma y cuándo conviene vender"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Precio del ternero en pie
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio del ternero en pie: cómo se forma y cuándo conviene vender
        </h1>

        {/* Answer-first: primera oración autocontenida y citable, sin vender la
            estimación como dato observado. */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El precio del ternero se forma en los remates de invernada y las ferias de campo: el Mercado
          Agroganadero no opera terneros, así que no hay un precio observado ahí. Nuestra estimación de
          hoy ({INMAG_DATE}) es <strong>${fmt(ternero)} por kilo vivo</strong>.
        </p>
        <p className="text-xs text-zinc-500 mb-4">{TERNERO_ESTIMADO_NOTA}</p>

        <p className="mb-4">
          A ese valor, un ternero de destete de {PESO_TERNERO} kg rondaría los{' '}
          <strong>${fmt(valorTernero)}</strong>, pero tomalo como orientación, no como precio. El ternero
          es la <strong>salida del criador</strong>: cuando termina la etapa de cría, el productor lo
          desteta y lo vende como invernada para que otro lo recríe y engorde. Lo que se paga de verdad
          depende del peso, la raza, la sanidad, la zona y el momento del año. Para el número del día y
          su explicación, mirá el{' '}
          <Link href="/precios/terneros" className="text-accent hover:text-accent-bright">precio del ternero hoy</Link>;
          para lo que realmente se pagó por las demás categorías, por peso, el{' '}
          <Link href="/vr" className="text-accent hover:text-accent-bright">precio por categoría y peso</Link>.
        </p>

        <RematesDeInvernada />

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Por qué el ternero vale más por kilo
        </h2>
        <p className="mb-4">
          El ternero es <strong>invernada</strong>, no hacienda terminada: el comprador paga por los
          kilos que el animal todavía va a ganar durante la recría y el engorde. Cada kilo de ternero
          se convierte en varios kilos de novillo, y esa promesa de crecimiento se refleja en el
          precio por kilo. Por eso en los remates de invernada el ternero liviano suele pagarse más
          por kilo que el novillito, el novillo y la vaquillona, y bastante más que la vaca de
          descarte, que es un animal adulto camino a faena.
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
                    href="/precios/terneros"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Ternero / Ternera
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-400">Invernada (recría y engorde)</td>
                <td className="px-3 py-2 text-right text-zinc-200">~${fmt(ternero)} (estimado)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  <Link
                    href="/precios/novillitos"
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
                    href="/precios/novillos"
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
                    href="/precios/vaquillonas"
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
                    href="/precios/vacas"
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
          Precio por kilo vivo del Mercado Agroganadero (INMAG y panel de categorías, {INMAG_DATE}),
          salvo el ternero, que es una estimación (INMAG × 1,10). Cada firma acuerda el precio final
          con el productor.
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
            <Link href="/precios/terneros" className="text-accent hover:text-accent-bright transition-colors">
              Precio del ternero hoy →
            </Link>{' '}
            ·{' '}
            <Link href="/vr" className="text-accent hover:text-accent-bright transition-colors">
              Lo que realmente se pagó, por categoría y peso →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado/terneros" className="text-accent hover:text-accent-bright transition-colors">
              Evolución y estacionalidad →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado" className="text-accent hover:text-accent-bright transition-colors">
              Mercado y precios de referencia →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            El valor del ternero de esta página es una estimación sobre el INMAG (× 1,10), no un precio
            observado. El ternero se comercializa por kilo vivo y su valor final se acuerda en cada remate.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
