import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-el-destete`

/* ------------------------------------------------------------------ */
/*  Número vivo: el destete es un concepto de manejo, no una serie.    */
/*  El único dato vivo es el precio de referencia del ternero (el      */
/*  producto del destete), como puente opcional a /precio-del-ternero. */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)
const ternero = price('terneros')

/* ------------------------------------------------------------------ */
/*  Etapas del destete — mismo array para HowToSchema y HTML visible   */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Evaluar la condición corporal de la vaca y el estado del ternero',
    text:
      'Antes de destetar se mira la condición corporal del rodeo de cría y la edad y peso de los terneros. La vaca de cría necesita recuperar reservas para volver a preñarse; el ternero tiene que estar en condiciones de rumiar y aprovechar pasto o ración.',
  },
  {
    name: 'Definir el tipo de destete: convencional, precoz o hiperprecoz',
    text:
      'El destete convencional se hace a los 6–8 meses (150–200 días). El destete precoz se adelanta a los 60–90 días para aliviar a la vaca en años secos o de poca oferta forrajera, y el hiperprecoz baja de los 60 días. Cuanto antes se desteta, más manejo y suplementación requiere el ternero.',
  },
  {
    name: 'Separar el ternero de la vaca y adaptarlo',
    text:
      'Se aparta el ternero al pie y se lo acostumbra a comer sin leche materna, con acceso a agua, pasto y ración de arranque. El aparte reduce el estrés si se hace con encierre y suplemento las primeras semanas.',
  },
  {
    name: 'Destinar el ternero a recría o a venta',
    text:
      'Terminado el destete, el ternero pasa a recría en el mismo campo o se vende como ternero de invernada. La vaca, ya sin el ternero al pie, recupera condición corporal y queda en mejor estado para el próximo servicio.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Destete',
    description:
      'Separación del ternero de la vaca para cortar el amamantamiento. Cierra la etapa de cría: libera a la madre para que recupere condición corporal y se vuelva a preñar, y manda al ternero a recría o a la venta. El destete convencional se hace a los 6–8 meses de edad.',
    url: PAGE_URL,
  },
  {
    name: 'Destete precoz',
    description:
      'Destete adelantado a los 60–90 días de edad del ternero, antes del momento convencional. Se usa para aliviar a la vaca de cría en años secos o de escasez de pasto, de modo que la madre no pierda estado y mantenga la preñez. Exige suplementar y manejar más al ternero, que todavía es chico.',
  },
  {
    name: 'Ternero al pie',
    description:
      'Ternero que todavía mama y anda junto a la vaca antes del destete. Mientras está al pie, la cría depende de la leche de la madre; destetarlo es lo que corta esa dependencia y define la categoría de ternero de invernada.',
  },
  {
    name: 'Recría',
    description:
      'Etapa que sigue al destete: el ternero destetado se cría hasta llegar a peso de invernada o de reposición. Puede hacerse en el mismo campo de cría o venderse a un invernador que lo lleve a terminación.',
    url: `${BASE_URL}/que-es-la-cria-y-recria`,
  },
  {
    name: 'Condición corporal de la vaca',
    description:
      'Medida del estado de reservas (grasa y músculo) de la vaca de cría, en una escala de 1 a 5 o 1 a 9. La vaca con ternero al pie gasta reservas en producir leche; el destete —sobre todo el precoz— es la herramienta para que recupere condición y vuelva a preñarse a tiempo.',
  },
  {
    name: 'Rodeo de cría',
    description:
      'Conjunto de vacas y vaquillonas destinadas a producir terneros. Es el eslabón inicial de la ganadería bovina; su producto es el ternero, que tras el destete pasa a recría, invernada o venta.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — copian lo que la gente escribe / le pregunta a un asistente. */
/*  Cada respuesta arranca con el dato (answer-first).                 */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el destete?',
    answer:
      'El destete es la separación del ternero de la vaca para cortar el amamantamiento. Cierra la etapa de cría: la madre queda libre para recuperar condición corporal y volver a preñarse, y el ternero pasa a recría o se vende como ternero de invernada. Es una de las decisiones de manejo más importantes del rodeo de cría.',
  },
  {
    question: '¿A qué edad se desteta el ternero?',
    answer:
      'El destete convencional se hace a los 6–8 meses de edad (unos 150–200 días), cuando el ternero ya rumia y puede vivir de pasto o ración sin la leche de la madre. El momento exacto depende de la oferta forrajera, la condición de la vaca y el sistema del campo; en años buenos se estira, en años secos se adelanta.',
  },
  {
    question: '¿Qué es el destete precoz y cuándo conviene?',
    answer:
      'El destete precoz es adelantar el destete a los 60–90 días de edad del ternero, antes del momento convencional. Conviene en años secos o de poca oferta de pasto, cuando la vaca de cría está perdiendo condición corporal: al sacarle el ternero al pie, la madre deja de producir leche, recupera estado y mantiene la preñez. El costo es que el ternero, todavía chico, requiere más suplementación y manejo.',
  },
  {
    question: '¿Qué se hace con el ternero después del destete?',
    answer:
      `Después del destete el ternero pasa a recría en el mismo campo o se vende como ternero de invernada a un engordador. El ternero es la categoría de mayor precio por kilo del mercado: el precio de referencia del ternero está en $${fmt(ternero)}/kg vivo (INMAG/MAG, no fijado por esta página). Es el ingreso principal del criador y por eso el destete se planifica en función de a qué peso y en qué momento conviene vender.`,
  },
]

export const metadata: Metadata = {
  title: 'Qué es el destete y qué es el destete precoz en ganadería',
  description:
    'El destete es la separación del ternero de la vaca para que la madre recupere condición y el ternero pase a recría o venta. El destete precoz se adelanta a los 60–90 días para aliviar a la vaca en años secos. Qué es, a qué edad se desteta, cuándo conviene el precoz y qué se hace con el ternero después.',
  keywords: [
    'que es el destete',
    'que es el destete precoz en ganaderia',
    'destete precoz',
    'a que edad se desteta el ternero',
    'destete de terneros',
    'destete convencional',
    'destete hiperprecoz',
    'ternero al pie',
    'condicion corporal de la vaca',
    'destete y recria',
  ],
  openGraph: {
    title: 'Qué es el destete y qué es el destete precoz en ganadería',
    description:
      'El destete separa al ternero de la vaca: la madre recupera condición y el ternero pasa a recría o venta. El destete precoz se adelanta a los 60–90 días para aliviar la vaca en años secos.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElDestetePage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-destete" sectionName="Qué es el destete" />
      <DefinedTermSetSchema
        name="Destete — definiciones"
        description="Definiciones citables de destete, destete precoz, ternero al pie, recría, condición corporal de la vaca y rodeo de cría en la ganadería de cría argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el destete y qué es el destete precoz"
        cssSelectors={['h1', '.speakable-content']}
      />
      <HowToSchema
        name="Etapas del destete del ternero"
        description="Etapas del destete en el rodeo de cría: evaluar la condición corporal de la vaca y el estado del ternero, definir el tipo de destete (convencional, precoz o hiperprecoz), separar y adaptar al ternero, y destinarlo a recría o venta."
        steps={PASOS}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el destete y qué es el destete precoz
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El destete es la separación del ternero de la vaca para cortar el amamantamiento: la madre
          recupera condición corporal y se vuelve a preñar, y el ternero pasa a recría o a la venta. El
          destete precoz es el mismo corte pero adelantado a los 60–90 días, para aliviar a la vaca en
          años secos.
        </p>

        <p className="text-zinc-400 mb-8">
          Es una de las decisiones de manejo más importantes del rodeo de cría, porque separa dos
          objetivos que compiten: que la vaca críe el ternero y que la vaca se vuelva a preñar. Mientras
          el ternero está al pie, la vaca gasta reservas en producir leche y le cuesta recuperar
          condición. El destete corta esa dependencia. El destete convencional se hace a los 6–8 meses;
          el precoz se adelanta cuando falta pasto para que la madre no pierda estado. Esta página es
          información de referencia sobre el concepto de manejo, no una recomendación veterinaria para un
          campo en particular.
        </p>

        {/* Destete convencional vs precoz */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Destete convencional, precoz e hiperprecoz
        </h2>
        <p className="text-zinc-400 mb-4">
          La diferencia entre los tres es la edad a la que se separa el ternero de la vaca. Cuanto más
          se adelanta, más se alivia a la madre, pero más manejo y suplementación necesita el ternero:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Convencional (6–8 meses):</span> el destete de todos los
            años, cuando el ternero ya rumia y puede vivir de pasto sin la leche de la madre.
          </li>
          <li>
            <span className="text-zinc-300">Precoz (60–90 días):</span> se adelanta para aliviar a la
            vaca de cría en años secos o de poca oferta forrajera. La madre deja de dar leche, recupera
            condición corporal y mantiene la preñez.
          </li>
          <li>
            <span className="text-zinc-300">Hiperprecoz (menos de 60 días):</span> destete de
            emergencia o de altísima intensificación; el ternero es muy chico y depende por completo de
            una ración de arranque bien manejada.
          </li>
        </ul>

        {/* Etapas del destete */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Etapas del destete</h2>
        <p className="text-zinc-400 mb-4">
          Más allá del tipo, el destete sigue la misma secuencia de manejo:
        </p>
        <ol className="text-zinc-400 mb-8 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-300">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        {/* Por qué importa el destete precoz */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Por qué el destete precoz protege la preñez
        </h2>
        <p className="text-zinc-400 mb-8">
          La vaca de cría con ternero al pie prioriza producir leche antes que recuperar reservas, y una
          vaca en baja condición corporal se preña tarde o no se preña. En un año seco, sacarle el
          ternero temprano es la herramienta más directa para que la madre remonte estado a tiempo para
          el próximo servicio. El destete precoz sacrifica algo de kilo en el ternero al momento del
          aparte —que se recupera en la recría— a cambio de sostener la preñez del rodeo, que es el
          producto real del negocio de cría.
        </p>

        {/* El ternero después del destete */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          El ternero después del destete: recría o venta
        </h2>
        <p className="text-zinc-400 mb-8">
          Terminado el destete, el ternero pasa a recría en el mismo campo o se vende como ternero de
          invernada. El ternero es la categoría de mayor precio por kilo del mercado: el precio de
          referencia está hoy en{' '}
          <span className="text-zinc-300">${fmt(ternero)}/kg vivo</span> (INMAG/MAG, precio de
          referencia del mercado, no fijado por esta página). Ese valor es el ingreso principal del
          criador, por eso el destete se planifica en función de a qué peso y en qué momento conviene
          vender el ternero.
        </p>

        {/* FAQ visible (refuerza el schema y da respuesta extraíble) */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/precio-del-ternero-en-pie" className="text-zinc-500 hover:text-accent transition-colors">
            Precio del ternero en pie →
          </Link>
          <Link href="/que-es-la-cria-y-recria" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la cría y recría
          </Link>
          <Link href="/que-es-la-invernada" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la invernada
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
          Información de referencia sobre el manejo del rodeo de cría; el precio del ternero es de
          referencia del mercado (INMAG/MAG), no fijado por esta página. Actualizado:{' '}{lastUpdate}.
          Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
