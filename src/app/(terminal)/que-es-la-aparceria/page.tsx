import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  TechArticleSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-la-aparceria`

/* ------------------------------------------------------------------ */
/*  Números vivos — la aparcería es conceptual, pero el canon de       */
/*  arrendamiento se suele expresar en kg de novillo: usamos el precio */
/*  vivo del novillo como referencia comparativa. lastUpdate = sello.  */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)
const novillo = price('novillos')

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Aparcería',
    description:
      'Contrato rural en el que una parte (el dador) aporta el campo, la hacienda o ambos, y la otra (el aparcero) aporta el trabajo y la gestión, para repartirse los frutos o utilidades por un porcentaje pactado. A diferencia del arrendamiento, no hay un precio fijo: ambas partes comparten el resultado —y por lo tanto el riesgo— de la explotación. Está regulada por la Ley 13.246 de arrendamientos y aparcerías rurales.',
    url: PAGE_URL,
  },
  {
    name: 'Aparcería agrícola',
    description:
      'Modalidad de aparcería en la que el dador aporta la tierra y el aparcero el trabajo agrícola, repartiéndose la cosecha (o su valor) según el porcentaje pactado. El clásico « al tanto por ciento » de la agricultura: el dador cobra un porcentaje del grano producido en vez de un canon fijo.',
    url: PAGE_URL,
  },
  {
    name: 'Aparcería pecuaria',
    description:
      'Modalidad de aparcería ganadera en la que el dador aporta hacienda o campo y el aparcero el cuidado y trabajo del rodeo, repartiéndose las crías, los frutos o las utilidades. Se distingue de la capitalización de hacienda por su marco legal: la aparcería pecuaria es un contrato nominado de la Ley 13.246, mientras la capitalización es un acuerdo de aparcería o innominado más flexible.',
    url: PAGE_URL,
  },
  {
    name: 'Arrendamiento rural',
    description:
      'Contrato por el que el arrendatario paga al dueño del campo un precio cierto y fijo (el canon) por el uso y goce de la tierra durante un plazo. El canon se pacta en dinero o, muy habitualmente, en kilos de novillo o quintales de grano por hectárea. El riesgo productivo lo asume el arrendatario: el dueño cobra igual haya buena o mala campaña.',
    url: `${BASE_URL}/mercado/arrendamiento`,
  },
  {
    name: 'Capitalización de hacienda',
    description:
      'Acuerdo por el que el dueño de un campo recibe hacienda de un tercero (el capitalista) para engordarla o criarla, y ambos reparten el kilo producido o la utilidad según un porcentaje. Es la forma pecuaria más cercana a la aparcería: quien pone el campo y el trabajo comparte resultado con quien pone los animales, sin canon fijo de por medio.',
    url: `${BASE_URL}/que-es-la-capitalizacion-de-hacienda`,
  },
  {
    name: 'Canon',
    description:
      'Precio cierto y fijo que paga el arrendatario por el uso del campo, típicamente expresado en kilos de novillo por hectárea y por mes (o quintales de grano por hectárea y por campaña); el total anual es el canon mensual multiplicado por doce. Es el rasgo que separa al arrendamiento de la aparcería: en el arrendamiento hay canon, en la aparcería hay reparto de frutos.',
    url: `${BASE_URL}/como-se-calcula-el-canon-de-arrendamiento`,
  },
  {
    name: 'Ley 13.246',
    description:
      'Ley de Arrendamientos y Aparcerías Rurales de Argentina (1948, con modificaciones posteriores). Regula tanto el arrendamiento —precio fijo por el uso de la tierra— como la aparcería —reparto de frutos entre dador y aparcero—, fijando plazos mínimos, derechos y obligaciones de las partes.',
    url: PAGE_URL,
  },
]

/* ------------------------------------------------------------------ */
/*  Tabla comparativa — fuente única para el <table> visible           */
/* ------------------------------------------------------------------ */
type ContractRow = {
  aspecto: string
  aparceria: string
  arrendamiento: string
  capitalizacion: string
}
const CONTRACTS: ContractRow[] = [
  {
    aspecto: 'Quién aporta el campo',
    aparceria: 'El dador',
    arrendamiento: 'El dueño (arrendador)',
    capitalizacion: 'El dueño del campo',
  },
  {
    aspecto: 'Quién aporta el trabajo / la hacienda',
    aparceria: 'El aparcero (trabajo y gestión; a veces la hacienda)',
    arrendamiento: 'El arrendatario (todo el capital de trabajo)',
    capitalizacion: 'El capitalista pone la hacienda; el dueño pone campo y trabajo',
  },
  {
    aspecto: 'Cómo se cobra',
    aparceria: 'Porcentaje de los frutos o utilidades',
    arrendamiento: 'Canon fijo (kg de novillo o $/ha)',
    capitalizacion: 'Reparto del kilo producido o de la utilidad por %',
  },
  {
    aspecto: 'Quién asume el riesgo de campaña',
    aparceria: 'Compartido entre dador y aparcero',
    arrendamiento: 'El arrendatario (el dueño cobra igual)',
    capitalizacion: 'Compartido entre dueño y capitalista',
  },
  {
    aspecto: 'Marco legal',
    aparceria: 'Ley 13.246 (contrato nominado)',
    arrendamiento: 'Ley 13.246 (contrato nominado)',
    capitalizacion: 'Aparcería pecuaria o contrato innominado',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first; cada respuesta arranca con el dato             */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es la aparcería?',
    answer:
      'La aparcería es el contrato rural en el que una parte aporta el campo o la hacienda y la otra el trabajo y la gestión, y ambas se reparten los frutos o utilidades por un porcentaje pactado. No hay precio fijo: a diferencia del arrendamiento, dador y aparcero comparten el resultado de la explotación, sea buena o mala la campaña. Está regulada por la Ley 13.246.',
  },
  {
    question: '¿Cuál es la diferencia entre aparcería y arrendamiento?',
    answer: `La diferencia central es cómo se cobra y quién asume el riesgo. En el arrendamiento, el arrendatario paga un canon fijo por el uso del campo —típicamente en kilos de novillo o $/ha (el novillo hoy vale $${fmt(novillo)}/kg de referencia, ${lastUpdate})— y asume solo él el riesgo de la campaña. En la aparcería no hay canon: dador y aparcero se reparten los frutos por un porcentaje, así que comparten tanto la ganancia como el riesgo. Arrendamiento = precio cierto; aparcería = reparto de resultado.`,
  },
  {
    question: '¿Y la diferencia con la capitalización de hacienda?',
    answer:
      'La capitalización de hacienda es, en la práctica, la forma pecuaria más parecida a la aparcería: el dueño del campo pone la tierra y el trabajo, un tercero (el capitalista) pone los animales, y reparten el kilo producido o la utilidad por porcentaje. La diferencia es de encuadre: la aparcería pecuaria es un contrato nominado de la Ley 13.246, mientras la capitalización suele instrumentarse como aparcería pecuaria o como contrato innominado más flexible. En ambos hay reparto de resultado, no canon fijo.',
  },
  {
    question: '¿Quién asume el riesgo en la aparcería?',
    answer:
      'En la aparcería el riesgo es compartido: como el pago es un porcentaje de los frutos, si la campaña es mala ambas partes cobran menos, y si es buena ambas ganan más. Ese reparto del riesgo es lo que la distingue del arrendamiento, donde el dueño del campo cobra el canon completo independientemente del resultado y el arrendatario carga solo con el riesgo climático y de precios.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es la aparcería: contrato rural vs arrendamiento y capitalización',
  description: `La aparcería es el contrato rural donde una parte aporta el campo o la hacienda y la otra el trabajo, y reparten los frutos por un porcentaje —a diferencia del arrendamiento, que paga un canon fijo. Diferencias con arrendamiento y capitalización, y quién asume el riesgo. Referencia ${lastUpdate}.`,
  keywords: [
    'que es la aparceria',
    'que es la aparceria contrato',
    'aparceria vs arrendamiento',
    'diferencia entre aparceria y arrendamiento',
    'aparceria agricola',
    'aparceria pecuaria',
    'aparceria rural argentina',
    'ley 13246 arrendamientos y aparcerias',
    'aparceria vs capitalizacion de hacienda',
    'contrato de aparceria',
  ],
  openGraph: {
    title: 'Qué es la aparcería: contrato rural vs arrendamiento y capitalización',
    description:
      'La aparcería reparte los frutos por porcentaje entre quien pone el campo y quien pone el trabajo; el arrendamiento paga un canon fijo. Diferencias con arrendamiento y capitalización, y quién asume el riesgo.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsLaAparceriaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DefinedTermSetSchema
        name="Aparcería, arrendamiento y capitalización — definiciones"
        description="Definiciones citables de aparcería (agrícola y pecuaria), arrendamiento rural, capitalización de hacienda, canon y Ley 13.246 en el marco de los contratos rurales argentinos."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es la aparcería: diferencia con arrendamiento y capitalización"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es la aparcería: contrato rural vs arrendamiento y capitalización"
        description="La aparcería como contrato rural de reparto de frutos por porcentaje, frente al arrendamiento (canon fijo) y la capitalización de hacienda. Marco de la Ley 13.246."
        url={PAGE_URL}
        datePublished="2026-07-10"
        dateModified={lastUpdate}
        citations={[
          {
            name: 'Ley 13.246 de Arrendamientos y Aparcerías Rurales',
            url: 'https://www.argentina.gob.ar/normativa',
          },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Aparcería
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Qué es la aparcería: contrato rural vs arrendamiento y capitalización
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La aparcería es el contrato rural en el que una parte aporta el campo o la hacienda y la
          otra aporta el trabajo y la gestión, y ambas se reparten los frutos o utilidades por un{' '}
          <strong>porcentaje pactado</strong> —a diferencia del arrendamiento, que paga un{' '}
          <strong>canon fijo</strong> en kilos de novillo o en pesos por hectárea.
        </p>

        <p className="mb-4">
          Dicho de otro modo: en el arrendamiento el dueño del campo cobra un precio cierto y el
          arrendatario carga con todo el riesgo de la campaña; en la aparcería no hay precio fijo,
          sino <strong>reparto de resultado</strong>, de manera que dador y aparcero comparten tanto
          la ganancia como el riesgo. Ambos contratos están regulados por la{' '}
          <strong>Ley 13.246 de arrendamientos y aparcerías rurales</strong>. Esta página es
          información de referencia conceptual; la instrumentación de cada contrato se acuerda entre
          las partes y con asesoramiento profesional.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Aparcería agrícola y aparcería pecuaria
        </h2>
        <p className="mb-4">
          La aparcería toma dos formas según la actividad. En la{' '}
          <strong>aparcería agrícola</strong>, el dador aporta la tierra y el aparcero el trabajo de
          la siembra y la cosecha, repartiéndose el grano (o su valor) por el porcentaje pactado —el
          clásico « al tanto por ciento » de la agricultura, donde el dueño cobra un porcentaje de la
          producción en lugar de un canon. En la <strong>aparcería pecuaria</strong>, el dador aporta
          hacienda o campo y el aparcero cuida y trabaja el rodeo, repartiéndose las crías, los
          frutos o las utilidades. La aparcería pecuaria es el pariente cercano de la capitalización
          de hacienda, pero con encuadre legal propio en la Ley 13.246.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Aparcería vs arrendamiento vs capitalización
        </h2>
        <p className="mb-4">
          Los tres contratos ponen a producir un campo, pero se diferencian en{' '}
          <strong>quién aporta qué</strong>, <strong>cómo se cobra</strong> y{' '}
          <strong>quién asume el riesgo</strong>:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Aspecto</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Aparcería</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Arrendamiento
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Capitalización
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTRACTS.map((row) => (
                <tr key={row.aspecto} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{row.aspecto}</td>
                  <td className="px-3 py-2 text-zinc-300">{row.aparceria}</td>
                  <td className="px-3 py-2 text-zinc-400">{row.arrendamiento}</td>
                  <td className="px-3 py-2 text-zinc-400">{row.capitalizacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Cuadro conceptual de referencia. El canon de arrendamiento se suele expresar en kilos de
          novillo (precio de referencia del mercado, INMAG/MAG, hoy ${fmt(novillo)}/kg vivo al{' '}
          {lastUpdate}, no fijado por esta página). Cada contrato se instrumenta según lo que
          acuerden las partes y la Ley 13.246.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Quién asume el riesgo en cada contrato
        </h2>
        <p className="mb-4">
          La clave económica es el riesgo. En el <strong>arrendamiento</strong>, el dueño del campo
          cobra su canon completo haya sequía o campaña récord: el riesgo climático y de precios lo
          carga íntegramente el arrendatario. En la <strong>aparcería</strong> y en la{' '}
          <strong>capitalización</strong>, como el pago es un porcentaje de los frutos, el riesgo se
          reparte: si la campaña es mala, ambas partes cobran menos; si es buena, ambas ganan más.
          Por eso el arrendamiento le conviene a quien busca ingreso previsible por su tierra, y la
          aparcería o la capitalización a quien prefiere compartir el resultado —y capturar el
          potencial de una buena campaña— a cambio de asumir parte del riesgo.
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

        {/* Rol pilar — enlazado interno denso al cluster de contratos rurales */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Contratos rurales y arrendamiento
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link
              href="/mercado/arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Arrendamiento rural →
            </Link>
            <Link
              href="/como-se-calcula-el-canon-de-arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo se calcula el canon →
            </Link>
            <Link
              href="/impuesto-de-sellos-arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Impuesto de sellos →
            </Link>
            <Link
              href="/que-es-la-capitalizacion-de-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Capitalización de hacienda →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link
              href="/categorias-de-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Categorías de hacienda →
            </Link>{' '}
            ·{' '}
            <Link
              href="/glosario"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Glosario ganadero →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Información de referencia conceptual sobre contratos rurales (Ley 13.246); no constituye
            asesoramiento legal ni fija precios. El canon citado es precio de referencia del mercado
            (INMAG/MAG).
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
