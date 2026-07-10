import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-la-cria-y-recria`

/* ------------------------------------------------------------------ */
/*  Número vivo: el producto de la cría es el ternero. Su precio de     */
/*  mercado fechado ancla la definición con un dato real.               */
/* ------------------------------------------------------------------ */
const ternero = Math.round(marketPrices.categories.terneros.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Cría',
    description:
      'Primera etapa del ciclo ganadero. La vaca madre (vientre) gesta durante nueve meses y amamanta un ternero hasta el destete, alrededor de los 6-8 meses de vida. El producto de la cría es el ternero al destete, que se vende o pasa a la etapa de recría.',
    url: PAGE_URL,
  },
  {
    name: 'Recría',
    description:
      'Etapa intermedia del ciclo ganadero, posterior al destete. El ternero destetado se desarrolla —gana peso y estructura sobre pasturas o verdeos— hasta quedar listo para la invernada o el engorde final. No busca terminar el animal para faena, sino prepararlo.',
    url: PAGE_URL,
  },
  {
    name: 'Rodeo de cría',
    description:
      'Conjunto de vientres (vacas y vaquillonas) destinados a la reproducción en un establecimiento, junto con los toros y la ternerada del año. Es el capital productivo de un campo de cría: cada vientre debe destetar un ternero por año.',
  },
  {
    name: 'Índice de destete',
    description:
      'Indicador clave de eficiencia de la cría: porcentaje de terneros destetados sobre la cantidad de vientres entorados. Un índice de destete del 80% significa que de cada 100 vacas servidas se destetaron 80 terneros. Mide cuántos terneros efectivamente produce el rodeo.',
  },
  {
    name: 'Ternero',
    description:
      'Cría bovina desde el nacimiento hasta el destete (aproximadamente 6-8 meses y 160-200 kg). Es el producto de la cría y la materia prima de la recría y la invernada. En el mercado se comercializa por kilo vivo como categoría propia.',
    url: `${BASE_URL}/categorias-de-hacienda`,
  },
  {
    name: 'Vientre',
    description:
      'Hembra bovina en edad reproductiva —vaca o vaquillona— destinada a gestar y amamantar terneros. Los vientres son el capital de un rodeo de cría; su fertilidad y el índice de destete determinan la producción anual de terneros.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué produce la cría?',
    answer: `La cría produce el ternero al destete: la vaca madre gesta y amamanta un ternero hasta los 6-8 meses de vida, y ese ternero destetado es el producto que se vende o pasa a la recría. A precio de mercado, el ternero se comercializa a $${fmt(ternero)}/kg vivo (INMAG del ${lastUpdate}). La eficiencia de la cría se mide por el índice de destete: cuántos terneros se destetan por cada 100 vientres servidos.`,
  },
  {
    question: '¿Cuánto dura la recría?',
    answer:
      'La recría dura habitualmente entre 6 y 12 meses, dependiendo del sistema y del peso de entrada y salida. Arranca con el ternero destetado (160-200 kg) y termina cuando el animal alcanza el peso y desarrollo para pasar a la invernada o al engorde final (según el sistema, entre 280 y 350 kg). En esquemas pastoriles puede extenderse; en recrías intensivas se acorta.',
  },
  {
    question: '¿Cuál es la diferencia entre cría y recría?',
    answer: `La diferencia es la etapa del animal: la cría trabaja con la vaca madre y produce el ternero hasta el destete; la recría toma ese ternero destetado y lo desarrolla hasta dejarlo listo para la invernada o el engorde. La cría es el vientre y su ternero; la recría es el ternero solo, creciendo. El producto de la cría (el ternero, hoy a $${fmt(ternero)}/kg vivo, INMAG del ${lastUpdate}) es la materia prima de la recría.`,
  },
]

export const metadata: Metadata = {
  title: 'Qué es la cría y la recría en ganadería: definición y diferencia',
  description:
    'La cría es la primera etapa del ciclo ganadero —la vaca madre gesta y amamanta un ternero hasta el destete— y la recría es la etapa siguiente, donde ese ternero destetado se desarrolla hasta quedar listo para la invernada. Definición, índice de destete, diferencia entre ambas y dónde encajan en el ciclo.',
  keywords: [
    'qué es la cría y la recría en ganadería',
    'que es la cria y recria',
    'diferencia entre cría y recría',
    'qué produce la cría',
    'cuánto dura la recría',
    'ciclo ganadero cría recría invernada',
    'índice de destete',
    'rodeo de cría',
    'ternero al destete',
    'etapas de la ganadería bovina',
  ],
  openGraph: {
    title: 'Qué es la cría y la recría en ganadería: definición y diferencia',
    description:
      'La cría produce el ternero al destete; la recría lo desarrolla hasta la invernada. Definición citable, índice de destete y dónde encaja cada etapa en el ciclo cría → recría → invernada → terminación.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsLaCriaYRecriaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="que-es-la-cria-y-recria"
        sectionName="Qué es la cría y la recría"
      />
      <DefinedTermSetSchema
        name="Cría y recría en ganadería — definiciones"
        description="Definiciones citables de cría, recría, rodeo de cría, índice de destete, ternero y vientre en el ciclo ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es la cría y la recría en ganadería"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es la cría y la recría en ganadería
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          La cría es la primera etapa del ciclo ganadero —la vaca madre gesta y amamanta un ternero
          hasta el destete—, y la recría es la etapa siguiente, donde ese ternero destetado se
          desarrolla hasta quedar listo para la invernada o el engorde final.
        </p>

        <p className="text-zinc-400 mb-8">
          Son dos eslabones consecutivos del mismo negocio ganadero. La cría trabaja con el vientre y
          su producto es el ternero al destete; la recría toma ese ternero y lo hace crecer. A precio
          de mercado, el ternero de la cría se vende a ${fmt(ternero)}/kg vivo (INMAG del {lastUpdate}).
          Ese valor es una referencia de mercado, no un precio que fije esta página.
        </p>

        {/* La cría */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          La cría: vaca-ternero y el índice de destete
        </h2>
        <p className="text-zinc-400 mb-4">
          La cría es el sistema vaca-ternero. El rodeo de cría está formado por vientres (vacas y
          vaquillonas) que se sirven una vez al año; cada vientre gesta durante unos nueve meses y
          amamanta al ternero hasta el destete, alrededor de los 6-8 meses de vida y 160-200 kg. El
          producto que sale del campo de cría es el ternero al destete: se vende como categoría propia
          —hoy a ${fmt(ternero)}/kg vivo (INMAG del {lastUpdate})— o pasa a la etapa de recría dentro
          del mismo ciclo.
        </p>
        <p className="text-zinc-400 mb-8">
          La eficiencia de la cría se mide con el índice de destete: el porcentaje de terneros
          destetados sobre los vientres entorados. Un índice del 80% significa que de cada 100 vacas
          servidas se destetaron 80 terneros. Es el número que resume cuántos terneros produce
          realmente el rodeo, y de él depende la rentabilidad de un campo de cría.
        </p>

        {/* La recría */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          La recría: del destete a la invernada
        </h2>
        <p className="text-zinc-400 mb-8">
          La recría arranca donde termina la cría: con el ternero ya destetado. En esta etapa el animal
          se desarrolla —gana peso y estructura sobre pasturas, verdeos o, en sistemas intensivos, con
          suplementación— hasta quedar listo para la invernada o el engorde final. La recría no busca
          terminar el animal para faena; lo prepara. Suele durar entre 6 y 12 meses, llevando al
          ternero desde los 160-200 kg del destete hasta 280-350 kg, según el sistema y el objetivo de
          peso de salida.
        </p>

        {/* Dónde encaja en el ciclo */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Dónde encaja en el ciclo completo (cría → recría → invernada → terminación)
        </h2>
        <p className="text-zinc-400 mb-4">
          Cría y recría son las dos primeras etapas de la cadena de producción de carne bovina. El
          ciclo completo es una secuencia:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Cría:</span> vaca madre → ternero al destete. Produce la
            materia prima.
          </li>
          <li>
            <span className="text-zinc-300">Recría:</span> ternero destetado → animal desarrollado.
            Prepara al animal, sin terminarlo.
          </li>
          <li>
            <span className="text-zinc-300">Invernada / engorde:</span> el animal se termina —a campo o
            en feedlot— hasta el peso de faena.
          </li>
          <li>
            <span className="text-zinc-300">Terminación:</span> el ajuste final de peso y grado de
            gordura antes de salir para el frigorífico.
          </li>
        </ul>
        <p className="text-zinc-400 mb-8">
          Un mismo establecimiento puede hacer el ciclo completo o especializarse en una sola etapa:
          hay campos exclusivamente de cría (venden el ternero), de recría, o de invernada que compran
          terneros y novillitos para terminarlos. La cría y la recría son, en definitiva, las dos
          patas que le dan de comer a la invernada y a la terminación.
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

        {/* Links internos — cluster definicional */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/que-es-la-invernada" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la invernada →
          </Link>
          <Link href="/que-es-el-destete" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el destete
          </Link>
          <Link href="/que-es-un-feedlot" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es un feedlot
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
          Precio del ternero de referencia del mercado (INMAG / Mercado Agroganadero), no fijado por
          esta página. Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
