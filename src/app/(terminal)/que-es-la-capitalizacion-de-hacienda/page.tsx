import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  HowToSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-la-capitalizacion-de-hacienda`

/* ------------------------------------------------------------------ */
/*  Números vivos — la capitalización reparte kilos producidos; el     */
/*  novillo/ternero de referencia sirven para dimensionar el reparto.  */
/*  lastUpdate = sello de frescura.                                    */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)
const novillo = price('novillos')
const ternero = price('terneros')

/* ------------------------------------------------------------------ */
/*  Estructura del contrato — mismo array para HowToSchema y <ol>      */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Entrada de la hacienda y pesada',
    text:
      'El capitalizador (dueño de los animales) entrega la hacienda al dueño del campo y se pesa a la entrada. Ese peso inicial queda registrado —de puño y letra o en balanza— porque es la base sobre la que se medirá el aumento de kilos. Se pactan también la categoría, el número de cabezas y la duración.',
  },
  {
    name: 'Engorde y manejo a cargo del campo',
    text:
      'Durante el ciclo, el dueño del campo aporta el pasto o la ración y todo el manejo: sanidad, recorrida, agua, potreros. La hacienda sigue siendo del capitalizador, pero el resultado productivo —cuántos kilos gana cada animal— depende del pasto y del trabajo que pone el campo.',
  },
  {
    name: 'Salida y pesada final',
    text:
      'Terminado el engorde, se vuelve a pesar. La diferencia entre el peso de salida y el de entrada es el aumento de kilos producido: el «kilo puesto» por el campo, que es lo que efectivamente se reparte entre las partes.',
  },
  {
    name: 'Reparto del aumento por porcentaje pactado',
    text:
      'El aumento de kilos (o su valor a precio de referencia del mercado) se reparte según el porcentaje acordado al inicio —por ejemplo 50/50 o 60/40 a favor del campo. El capitalizador recupera su hacienda con más peso; el dueño del campo cobra su parte del kilo producido sin haber comprado los animales.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Capitalización de hacienda',
    description:
      'Acuerdo por el que el dueño de un campo recibe animales de un tercero (el capitalizador) para engordarlos, y ambos se reparten el aumento de kilos —o su valor— según un porcentaje pactado. El capitalizador pone la hacienda; el dueño del campo pone el pasto y el manejo. No hay canon fijo: lo que se reparte es el kilo producido, de modo que ambas partes comparten el resultado y el riesgo del engorde.',
    url: PAGE_URL,
  },
  {
    name: 'Contrato de pastoreo',
    description:
      'Acuerdo por el que el dueño del campo cede el pasto para que un tercero engorde su hacienda, cobrando por ello. En su forma más simple se paga por cabeza y por día (o por kilo de aumento); cuando en lugar de una tarifa fija se reparte el aumento de kilos por porcentaje, el pastoreo se estructura como capitalización de hacienda. Es el género del que la capitalización es una modalidad de reparto.',
    url: PAGE_URL,
  },
  {
    name: 'Hotelería de hacienda',
    description:
      'Modalidad de pastoreo en la que el dueño del campo cobra una tarifa cierta por «alojar» y engordar la hacienda de un tercero —típicamente por cabeza y por día, o por kilo producido— sin repartir resultado. Se distingue de la capitalización en que el campo cobra un precio fijo por el servicio y no asume el riesgo del engorde, mientras que en la capitalización cobra un porcentaje del kilo ganado.',
    url: PAGE_URL,
  },
  {
    name: 'Aumento de peso',
    description:
      'Kilos que gana la hacienda entre la pesada de entrada y la de salida —el «kilo puesto» por el campo. Es la variable central de la capitalización: el reparto no se hace sobre el valor total del animal sino sobre esos kilos producidos durante el ciclo de engorde.',
    url: PAGE_URL,
  },
  {
    name: 'Porcentaje de reparto',
    description:
      'Proporción pactada en la que se divide el aumento de kilos (o su valor) entre el dueño del campo y el capitalizador —por ejemplo 50/50, 55/45 o 60/40. Refleja el peso relativo de los aportes: cuánto pone cada parte y cómo se comparte el resultado del engorde.',
    url: PAGE_URL,
  },
  {
    name: 'Invernador',
    description:
      'Productor que engorda hacienda —la lleva del destete o la recría hasta el peso de terminación. En la capitalización, el dueño del campo suele actuar como invernador: aporta el pasto y el manejo para producir kilos sobre animales que son de un tercero, en lugar de comprar la hacienda con capital propio.',
    url: `${BASE_URL}/que-es-la-invernada`,
  },
]

/* ------------------------------------------------------------------ */
/*  Tabla de aportes y reparto — fuente única para el <table> visible  */
/* ------------------------------------------------------------------ */
type AporteRow = {
  aspecto: string
  campo: string
  capitalizador: string
}
const APORTES: AporteRow[] = [
  {
    aspecto: 'Qué aporta',
    campo: 'El pasto o la ración, el agua, los potreros y todo el manejo',
    capitalizador: 'La hacienda (los animales a engordar)',
  },
  {
    aspecto: 'De quién es la hacienda',
    campo: 'No es del campo; la tiene en engorde',
    capitalizador: 'Sigue siendo del capitalizador durante todo el ciclo',
  },
  {
    aspecto: 'Qué se mide',
    campo: 'El aumento de kilos entre entrada y salida (el «kilo puesto»)',
    capitalizador: 'El mismo aumento de kilos —la base es compartida',
  },
  {
    aspecto: 'Cómo cobra',
    campo: 'Un porcentaje del aumento de kilos o de su valor',
    capitalizador: 'Recupera su hacienda con más peso, neto de la parte del campo',
  },
  {
    aspecto: 'Quién asume el riesgo',
    campo: 'Compartido: si la campaña es mala, hay menos kilos para repartir',
    capitalizador: 'Compartido: pone el capital-hacienda y arriesga mortandad y precio',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first; cada respuesta arranca con el dato             */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es capitalizar hacienda?',
    answer:
      'Capitalizar hacienda es recibir animales de un tercero para engordarlos en el propio campo y repartirse el aumento de kilos por un porcentaje pactado. El dueño de los animales (el capitalizador) pone la hacienda; el dueño del campo pone el pasto y el manejo. No hay compra ni canon fijo: lo que se divide entre las partes es el kilo producido durante el engorde, así que ambas comparten tanto la ganancia como el riesgo de la campaña.',
  },
  {
    question: '¿Quién pone qué en la capitalización?',
    answer:
      'El capitalizador pone la hacienda —los animales, que siguen siendo suyos todo el ciclo— y el dueño del campo pone el pasto (o la ración), el agua y todo el manejo: sanidad, recorrida, potreros. El resultado productivo depende del campo, porque de su pasto y su trabajo sale el aumento de kilos; el capital-animal y el riesgo de mortandad los carga el capitalizador. Por eso el reparto premia a las dos partes en proporción a lo que aportan.',
  },
  {
    question: '¿Cómo se reparte en la capitalización de hacienda?',
    answer: `Se reparte el aumento de kilos —la diferencia entre la pesada de salida y la de entrada— según el porcentaje pactado al inicio, habitualmente 50/50 o 60/40 a favor del campo. Si esos kilos se valorizan, se toma un precio de referencia del mercado (por ejemplo el novillo a $${fmt(novillo)}/kg vivo o el ternero a $${fmt(ternero)}/kg, INMAG/MAG al ${INMAG_DATE}, no fijado por esta página). El capitalizador retira su hacienda con más peso y el dueño del campo cobra su parte del kilo producido sin haber comprado los animales.`,
  },
  {
    question: '¿Cuál es la diferencia con el pastoreo y con la aparcería?',
    answer:
      'La diferencia está en cómo cobra el campo y quién asume el riesgo. En el pastoreo u hotelería de hacienda el campo cobra una tarifa cierta por cabeza/día o por kilo, sin arriesgar resultado. En la capitalización el campo cobra un porcentaje del aumento de kilos, así que comparte el resultado del engorde. La aparcería pecuaria es el mismo mecanismo de reparto pero como contrato nominado de la Ley 13.246: en la práctica la capitalización se instrumenta como aparcería pecuaria o como contrato innominado más flexible. En todos, lo que separa a la capitalización del arrendamiento es que no hay canon fijo, hay reparto del kilo producido.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es la capitalización de hacienda: contrato de pastoreo y engorde',
  description: `La capitalización de hacienda es el acuerdo donde el dueño del campo recibe animales de un tercero para engordarlos y reparten el aumento de kilos por un porcentaje: el capitalizador pone la hacienda, el campo el pasto y el manejo. Cómo se estructura el reparto, quién pone qué y diferencia con pastoreo y aparcería. Referencia ${lastUpdate}.`,
  keywords: [
    'que es la capitalizacion de hacienda',
    'que es la capitalizacion de hacienda contrato de pastoreo',
    'capitalizar hacienda',
    'contrato de pastoreo',
    'hoteleria de hacienda',
    'capitalizacion de hacienda como se reparte',
    'capitalizacion vs aparceria',
    'capitalizacion de hacienda porcentaje',
    'engorde a porcentaje de kilos',
    'invernada a capitalizacion',
  ],
  openGraph: {
    title: 'Qué es la capitalización de hacienda: contrato de pastoreo y engorde',
    description:
      'El dueño del campo recibe hacienda de un tercero para engordarla y reparten el aumento de kilos por porcentaje. Quién pone qué, cómo se estructura el reparto y diferencia con pastoreo y aparcería.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsLaCapitalizacionDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DefinedTermSetSchema
        name="Capitalización de hacienda, pastoreo y engorde — definiciones"
        description="Definiciones citables de capitalización de hacienda, contrato de pastoreo, hotelería de hacienda, aumento de peso, porcentaje de reparto e invernador en el marco de los contratos de engorde ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo se estructura una capitalización de hacienda"
        description="Estructura del contrato de capitalización: entrada de la hacienda y pesada, engorde y manejo a cargo del campo, salida y pesada final, y reparto del aumento de kilos por el porcentaje pactado."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es la capitalización de hacienda: contrato de pastoreo y engorde"
        cssSelectors={['h1', '.speakable-content']}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Capitalización de hacienda
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Qué es la capitalización de hacienda: contrato de pastoreo y engorde
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La capitalización de hacienda es el acuerdo por el que el dueño de un campo recibe animales
          de un tercero para engordarlos y ambos se reparten el <strong>aumento de kilos</strong> —o
          su valor— según un <strong>porcentaje pactado</strong>: el capitalizador pone la hacienda y
          el dueño del campo pone el pasto y el manejo.
        </p>

        <p className="mb-4">
          Dicho de otro modo, no hay compra de hacienda ni canon fijo de por medio: los animales
          siguen siendo del capitalizador y lo que se divide entre las partes es el{' '}
          <strong>kilo producido</strong> durante el engorde. Por eso ambas comparten el resultado y
          el riesgo de la campaña: si el pasto rinde y la hacienda gana kilos, ganan los dos; si la
          campaña es mala, hay menos kilos para repartir. Es la forma pecuaria más cercana a la
          aparcería. Esta página es información de referencia conceptual; la instrumentación de cada
          contrato se acuerda entre las partes y con asesoramiento profesional.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Quién pone qué</h2>
        <p className="mb-4">
          La capitalización junta dos aportes complementarios: el{' '}
          <strong>capital-hacienda</strong> de un lado y el <strong>pasto y el manejo</strong> del
          otro. El capitalizador —muchas veces un criador o un inversor ganadero— tiene los animales
          pero no el campo o el pasto para terminarlos; el dueño del campo tiene pasto y capacidad de
          manejo pero no quiere inmovilizar capital comprando hacienda. El contrato los une:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Aspecto</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Dueño del campo
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Capitalizador
                </th>
              </tr>
            </thead>
            <tbody>
              {APORTES.map((row) => (
                <tr key={row.aspecto} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{row.aspecto}</td>
                  <td className="px-3 py-2 text-zinc-300">{row.campo}</td>
                  <td className="px-3 py-2 text-zinc-400">{row.capitalizador}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Cuadro conceptual de referencia. El aumento de kilos se valoriza a precio de referencia del
          mercado (INMAG/MAG; novillo hoy ${fmt(novillo)}/kg vivo, ternero ${fmt(ternero)}/kg al{' '}
          {INMAG_DATE}, no fijado por esta página). Cada capitalización se instrumenta según lo que
          acuerden las partes.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cómo se estructura: entrada, engorde, salida y reparto
        </h2>
        <p className="mb-4">
          El ciclo tiene cuatro momentos, y todos giran alrededor de la{' '}
          <strong>balanza</strong>: lo que se reparte no es el animal entero sino los kilos que ganó
          entre que entró y salió.
        </p>
        <ol className="mb-4 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-200 font-medium">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Capitalización, pastoreo, hotelería y aparcería
        </h2>
        <p className="mb-4">
          Todas estas figuras engordan hacienda ajena en un campo, pero se separan por{' '}
          <strong>cómo cobra el campo</strong> y <strong>quién asume el riesgo</strong>. En el{' '}
          <strong>pastoreo</strong> o la <strong>hotelería de hacienda</strong>, el campo cobra una
          tarifa cierta —por cabeza y por día, o por kilo— y no arriesga resultado. En la{' '}
          <strong>capitalización</strong>, el campo cobra un porcentaje del aumento de kilos, de modo
          que comparte el resultado del engorde. La <strong>aparcería pecuaria</strong> es ese mismo
          reparto pero encuadrado como contrato nominado de la Ley 13.246; en la práctica la
          capitalización se instrumenta como aparcería pecuaria o como contrato innominado más
          flexible. Y frente al <strong>arrendamiento</strong> —que paga un canon fijo por el uso de
          la tierra— la diferencia es tajante: en la capitalización no hay canon, hay reparto del kilo
          producido.
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

        {/* Rol pilar — enlazado interno denso al cluster de contratos y engorde */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Contratos rurales y engorde
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link
              href="/que-es-la-aparceria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es la aparcería →
            </Link>
            <Link
              href="/mercado/arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Arrendamiento rural →
            </Link>
            <Link
              href="/que-es-la-invernada"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es la invernada →
            </Link>
            <Link
              href="/que-es-un-feedlot"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es un feedlot →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link
              href="/como-se-calcula-el-canon-de-arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo se calcula el canon →
            </Link>{' '}
            ·{' '}
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
            Información de referencia conceptual sobre contratos de engorde y pastoreo; no constituye
            asesoramiento legal ni fija precios. Los kilos citados se valorizan a precio de referencia
            del mercado (INMAG/MAG), no fijado por esta página.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
