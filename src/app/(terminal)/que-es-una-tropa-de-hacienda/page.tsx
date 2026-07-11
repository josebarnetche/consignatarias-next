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

export const revalidate = 86400 // daily rebuild via Vercel

const PAGE_URL = 'https://www.consignatarias.com.ar/que-es-una-tropa-de-hacienda'

// Página conceptual (glosario): el único dato vivo es lastUpdate; el precio de
// referencia del novillo se cita como ancla de mercado (INMAG/MAG), no lo fija esta página.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')

// Entidades citables — cada término del glosario con @id estable.
const TERMINOS = [
  {
    name: 'Tropa',
    description:
      'Conjunto de animales de características homogéneas —misma categoría, peso y origen— que se comercializa o traslada como una única unidad. Es la unidad práctica de venta y de movimiento de la hacienda: una tropa se pesa, se documenta y se ofrece en bloque en el remate o la venta directa.',
    url: 'https://www.consignatarias.com.ar/que-es-una-tropa-de-hacienda',
  },
  {
    name: 'Lote',
    description:
      'Agrupamiento de animales que se ofrece o vende junto en una operación o remate. En la práctica «lote» y «tropa» se usan casi como sinónimos; el matiz es que el lote es la unidad de venta en la rueda (lo que se martilla de una vez) y la tropa es el conjunto homogéneo que se arma y traslada, que puede subdividirse en varios lotes.',
    url: 'https://www.consignatarias.com.ar/que-es-una-tropa-de-hacienda#lote',
  },
  {
    name: 'Tropa de faena',
    description:
      'Tropa cuyo destino es el frigorífico: animales terminados (novillos, novillitos, vacas o vaquillonas gordas) que se envían a faena. Se documenta y traslada como unidad hacia la planta habilitada y se liquida por kilo vivo o por rendimiento al gancho según lo acordado.',
    url: 'https://www.consignatarias.com.ar/que-es-una-tropa-de-hacienda#tropa-de-faena',
  },
  {
    name: 'Hacienda homogénea',
    description:
      'Conjunto de animales parejos entre sí en categoría, peso, edad y estado, que por su uniformidad se vende mejor y a mejor precio. La homogeneidad es el criterio central para armar una tropa: cuanto más pareja, más previsible el resultado para el comprador.',
    url: 'https://www.consignatarias.com.ar/que-es-una-tropa-de-hacienda#homogeneidad',
  },
  {
    name: 'Categoría de hacienda',
    description:
      'Clasificación del bovino por sexo, edad y peso —ternero, novillito, novillo, vaquillona, vaca, toro y MEJ— que define el destino comercial del animal. Es el primer eje de homogeneidad de una tropa: una tropa se arma, ante todo, por categoría.',
    url: 'https://www.consignatarias.com.ar/categorias-de-hacienda',
  },
]

// FAQ — answer-first; el único número vivo es lastUpdate (y el novillo como ancla de referencia).
const FAQ = [
  {
    question: '¿Qué es una tropa de hacienda?',
    answer:
      'Una tropa de hacienda es un conjunto de animales de características homogéneas —misma categoría, peso y origen— que se comercializa o traslada como una única unidad. Es la forma habitual de mover y vender la hacienda en Argentina: la tropa se pesa, se documenta con DT-e y se ofrece en bloque en el remate o la venta directa, en lugar de negociar animal por animal.',
  },
  {
    question: '¿Cuántos animales tiene una tropa?',
    answer:
      'No hay un número fijo: una tropa puede ir de unas pocas decenas a varios cientos de cabezas según el rodeo, el camión y la operación. Lo que la define no es la cantidad sino la homogeneidad —que los animales sean parejos en categoría, peso y origen—. En la práctica, el tamaño lo condicionan la capacidad de los camiones jaula y el lote que se quiere ofrecer en la rueda.',
  },
  {
    question: '¿Tropa y lote son lo mismo?',
    answer:
      'En el uso corriente sí, se emplean casi como sinónimos. El matiz es que la tropa es el conjunto homogéneo que se arma y traslada como unidad, mientras que el lote es la unidad de venta que se ofrece o martilla de una vez en el remate. Una tropa grande puede subdividirse en varios lotes para venderse, y un lote puede coincidir exactamente con una tropa.',
  },
  {
    question: '¿Cómo se arma una tropa para vender?',
    answer:
      `Una tropa se arma agrupando animales lo más parejos posible en categoría, peso, edad y estado, porque la hacienda homogénea se vende mejor y a mejor precio. El productor separa por categoría (por ejemplo, novillos —hoy con un precio de referencia de $${fmt(novillo)}/kg vivo al ${lastUpdate}, según el INMAG/MAG, no fijado por esta página—), empareja pesos, da de alta el movimiento y documenta el traslado con DT-e. Cuanto más uniforme la tropa, más previsible el resultado para el comprador.`,
  },
]

export const metadata: Metadata = {
  title: `Qué es una tropa de hacienda: definición, tamaño y documentación (${lastUpdate.slice(0, 4)})`,
  description:
    'Una tropa de hacienda es un conjunto de animales homogéneos —misma categoría, peso y origen— que se comercializa o traslada como una unidad. Diferencia con lote y tropa de faena, cómo se arma y cómo se documenta con DT-e y guía.',
  keywords: [
    'qué es una tropa de hacienda',
    'tropa de ganado',
    'tropa de faena',
    'lote de hacienda',
    'qué es una tropa',
    'tropa y lote diferencia',
    'cuántos animales tiene una tropa',
    'cómo armar una tropa para vender',
    'hacienda homogénea',
    'unidad de comercialización de ganado',
  ],
  openGraph: {
    title: 'Qué es una tropa de hacienda',
    description:
      'Definición citable: una tropa de hacienda es un conjunto de animales homogéneos que se comercializa o traslada como una unidad. Tropa, lote y tropa de faena; documentación DT-e y guía.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsUnaTropaDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-una-tropa-de-hacienda" sectionName="Tropa" />
      <DefinedTermSetSchema
        name="Tropa de hacienda — definiciones"
        description="Definiciones citables de tropa, lote, tropa de faena, hacienda homogénea y categoría de hacienda en el comercio ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es una tropa de hacienda"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es una tropa de hacienda: definición, tamaño y documentación"
        description="Una tropa de hacienda es un conjunto de animales homogéneos que se comercializa o traslada como una unidad. Diferencia con lote y tropa de faena, criterios de homogeneidad y documentación con DT-e y guía."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'SENASA — Documento de Tránsito Electrónico (DT-e)', url: 'https://www.senasa.gob.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/glosario" className="hover:text-accent transition-colors">
            Glosario
          </Link>{' '}
          / Tropa
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Qué es una tropa de hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Una <strong>tropa de hacienda</strong> es un conjunto de animales de características
          homogéneas —misma categoría, peso y origen— que se comercializa o traslada como una única
          unidad; es la forma habitual de mover y vender la hacienda en Argentina, con un precio de
          mercado de referencia (por ejemplo, el novillo a ${fmt(novillo)}/kg vivo al {lastUpdate},
          según el INMAG/MAG) que esta página no fija.
        </p>

        <p className="mb-4">
          En lugar de negociar animal por animal, el productor arma una tropa con hacienda pareja y
          la ofrece en bloque: la tropa se pesa, se documenta y se traslada como una sola pieza
          comercial. Por eso «tropa» es, a la vez, una <strong>unidad de comercialización</strong>
          {' '}(lo que se vende junto) y una <strong>unidad de traslado</strong> (lo que se mueve
          junto, en los camiones jaula). La cotización por kilo vivo del Mercado Agroganadero
          (INMAG/MAG) es una referencia del mercado, actualizada a diario ({lastUpdate}); el precio
          final de cada tropa lo acuerdan las partes con la consignataria interviniente.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Qué define una tropa (homogeneidad por categoría, peso y origen)
        </h2>
        <p className="mb-3">
          Lo que convierte a un grupo de animales en una tropa no es el número sino la{' '}
          <strong>homogeneidad</strong>. Cuanto más parejos son los animales, mejor se vende la
          tropa y mejor precio obtiene, porque el comprador puede prever el resultado. Tres ejes
          definen esa uniformidad:
        </p>
        <ul className="mb-4 space-y-1 list-disc list-inside marker:text-accent">
          <li>
            <strong>Categoría:</strong> el primer criterio. Una tropa se arma, ante todo, por{' '}
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              categoría de hacienda
            </Link>{' '}
            —ternero, novillito, novillo, vaquillona, vaca o toro—; no se mezclan categorías en una
            misma tropa.
          </li>
          <li>
            <strong>Peso y edad:</strong> dentro de la categoría, los animales se emparejan por peso
            y estado (grado de terminación o de invernada), para que el lote sea parejo a la vista y
            en la balanza.
          </li>
          <li>
            <strong>Origen:</strong> hacienda de un mismo establecimiento y manejo sanitario, con su
            RENSPA y su documentación, es más homogénea y más simple de trasladar y liquidar.
          </li>
        </ul>

        <h2 className="text-zinc-200 text-lg font-medium mb-2">
          Tropa, lote y tropa de faena
        </h2>
        <p className="mb-3" id="lote">
          <strong>Tropa</strong> y <strong>lote</strong> se usan casi como sinónimos, pero conviene
          el matiz. La <strong>tropa</strong> es el conjunto homogéneo que se arma y traslada como
          unidad; el <strong>lote</strong> es la unidad de venta que se ofrece o martilla de una vez
          en la rueda. Una tropa grande puede subdividirse en varios lotes para venderse, y un lote
          puede coincidir exactamente con una tropa.
        </p>
        <p className="mb-4" id="tropa-de-faena">
          La <strong>tropa de faena</strong> es la tropa cuyo destino es el frigorífico: animales
          terminados (novillos, novillitos o vacas y vaquillonas gordas) que se envían a planta
          habilitada y se liquidan por kilo vivo o por{' '}
          <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
            rendimiento al gancho
          </Link>{' '}
          según lo acordado. Se distingue de la tropa de invernada o de cría, cuyo destino es la
          recría o el engorde en otro campo, no la faena inmediata.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          La tropa en el remate y en la documentación (DT-e, guía)
        </h2>
        <p className="mb-3" id="homogeneidad">
          En el{' '}
          <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
            remate ganadero
          </Link>
          , la tropa es la unidad que se ofrece: la consignataria la presenta pesada y clasificada,
          y el martillero la vende como lote (o la subdivide). Cuanto más homogénea la tropa, más
          firme la puja, porque el comprador sabe qué está llevando.
        </p>
        <p className="mb-4">
          Para moverse, toda tropa necesita respaldo documental. El traslado se ampara con el{' '}
          <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
            DT-e (Documento de Tránsito Electrónico)
          </Link>{' '}
          del SENASA, y según la jurisdicción con la{' '}
          <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
            guía de hacienda
          </Link>{' '}
          provincial o municipal. El productor da de alta el movimiento, declara categoría y
          cantidad, y la documentación acompaña a la tropa durante todo el traslado. Los trámites
          oficiales se gestionan ante el organismo correspondiente (senasa.gob.ar); esta página es
          informativa.
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
            Seguir por
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el DT-e →
            </Link>
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Guía de hacienda →
            </Link>
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              Cómo funciona un remate →
            </Link>
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los precios y comisiones citados son de referencia del mercado (INMAG/MAG); esta página
            no fija precios ni tarifas. Los trámites de traslado y documentación se gestionan ante el
            organismo oficial (SENASA).
          </p>
          <p className="mt-1">
            Actualizado: {lastUpdate} · Memola Medios S.A.S.
          </p>
        </footer>
      </article>
    </>
  )
}
