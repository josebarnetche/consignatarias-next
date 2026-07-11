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
const PAGE_URL = `${BASE_URL}/que-es-el-equivalente-vaca`

/* ------------------------------------------------------------------ */
/*  Número vivo: término conceptual, sin serie propia. El único dato   */
/*  vivo es el precio de referencia del novillo (contexto de mercado)  */
/*  y la fecha de actualización (sello de frescura).                   */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)
const novillo = price('novillos')

/* ------------------------------------------------------------------ */
/*  Coeficientes de EV por categoría — fuente única de la tabla.       */
/*  Valores de referencia (tipo INTA); la vaca de cría de 400 kg = 1,00*/
/* ------------------------------------------------------------------ */
const COEFICIENTES = [
  {
    categoria: 'Vaca de cría (preñada, con ternero al pie)',
    ev: '1,00',
    nota: 'Unidad de referencia: 400 kg que gesta y cría un ternero.',
  },
  {
    categoria: 'Toro',
    ev: '1,20',
    nota: 'Mayor peso y mantenimiento; suele ser la categoría más pesada del rodeo.',
  },
  {
    categoria: 'Novillo (más de 2 años)',
    ev: '1,10',
    nota: 'Animal de recría/terminación avanzada, en pleno crecimiento.',
  },
  {
    categoria: 'Novillito (1 a 2 años)',
    ev: '0,75',
    nota: 'Macho joven en recria; requerimiento intermedio.',
  },
  {
    categoria: 'Vaquillona (1 a 2 años)',
    ev: '0,70',
    nota: 'Hembra de reposición en desarrollo, antes del primer servicio.',
  },
  {
    categoria: 'Ternero/a (destete a 1 año)',
    ev: '0,55',
    nota: 'Categoría más liviana; el consumo crece a medida que gana peso.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario.   */
/*  Anclan el cluster de soporte de carga (carga animal, receptividad). */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Equivalente vaca (EV)',
    description:
      'Unidad de medida del requerimiento de una vaca de cría de 400 kg que gesta y cría un ternero por año. Se usa como patrón para expresar el consumo de las distintas categorías de un rodeo con un número comparable: cada categoría vale una fracción o un múltiplo de ese requerimiento (su coeficiente de EV).',
    url: PAGE_URL,
  },
  {
    name: 'Receptividad',
    description:
      'Cantidad de animales —medida en equivalentes vaca— que un potrero o campo puede sostener por hectárea sin degradar el pasto, en función de la oferta forrajera. Se expresa habitualmente en EV/ha/año y es el límite biológico que fija cuánta hacienda entra en cada unidad de superficie.',
    url: PAGE_URL,
  },
  {
    name: 'Carga animal',
    description:
      'Número de animales, expresado en equivalentes vaca por hectárea, que efectivamente pastorea un campo en un período dado. A diferencia de la receptividad (lo que el campo puede sostener), la carga es la decisión de manejo: cuántos EV/ha se ponen a pastorear.',
    url: `${BASE_URL}/como-se-calcula-la-carga-animal`,
  },
  {
    name: 'Requerimiento',
    description:
      'Necesidad de energía y forraje de un animal para mantenerse, crecer, gestar o producir. El EV traduce ese requerimiento a una escala única: por eso una vaca de cría vale 1,00 y un ternero al destete algo más de la mitad.',
    url: PAGE_URL,
  },
  {
    name: 'Unidad ganadera',
    description:
      'Concepto equivalente al EV usado para homogeneizar rodeos de categorías distintas en una sola cifra comparable. En Argentina la referencia habitual es el equivalente vaca; en otros sistemas se emplean unidades análogas (unidad gran ganado, animal unit), siempre con el mismo objetivo: comparar consumo entre categorías.',
    url: PAGE_URL,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first: cada respuesta arranca con el dato.            */
/*  Mismo array para FAQPageSchema y el <dl> visible.                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el equivalente vaca?',
    answer:
      'El equivalente vaca (EV) es la unidad que mide el requerimiento de una vaca de cría de 400 kg que gesta y cría un ternero por año. Sirve como patrón para comparar el consumo de las distintas categorías de un rodeo: a cada categoría se le asigna un coeficiente respecto de esa vaca, que vale 1,00. Es una herramienta de manejo del pasto, no un valor comercial.',
  },
  {
    question: '¿Cuánto es un EV en kilos?',
    answer:
      'Un equivalente vaca no es un peso fijo, sino un requerimiento: el de una vaca de cría de unos 400 kg de peso vivo que consume alrededor de 8 a 10 kg de materia seca por día (del orden de 3.000 a 3.600 kg de materia seca al año). Los 400 kg son la referencia del animal patrón; lo que el EV mide es su necesidad de forraje, no su valor de venta.',
  },
  {
    question: '¿Cuántos EV es un novillo?',
    answer:
      'Un novillo de más de 2 años equivale de forma aproximada a 1,10 EV, es decir, requiere algo más que una vaca de cría; un novillito de 1 a 2 años ronda 0,75 EV. Son valores de referencia: el coeficiente exacto depende del peso, la etapa y la ganancia de peso buscada. A modo de contexto de mercado, el novillo cotiza hoy a $' +
      fmt(novillo) +
      '/kg vivo (' +
      lastUpdate +
      '), precio de referencia del mercado (INMAG/MAG), no fijado por esta página.',
  },
  {
    question: '¿Para qué sirve el EV?',
    answer:
      'El EV sirve para calcular la carga animal y comparar la receptividad de los campos. Al llevar terneros, vaquillonas, novillos, toros y vacas a una misma unidad, permite sumar rodeos de categorías distintas y expresar cuántos animales entran por hectárea (EV/ha). Es la base para dimensionar un potrero, ordenar un arrendamiento por capacidad de pasto y planificar la invernada o la cría.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es el equivalente vaca (EV) y la receptividad',
  description:
    'El equivalente vaca (EV) es la unidad que mide el requerimiento de una vaca de cría de 400 kg y sirve para comparar el consumo de las categorías de un rodeo. Tabla de coeficientes por categoría (vaca=1,00, novillo, vaquillona, ternero, toro) y su uso en carga animal y receptividad.',
  keywords: [
    'que es el equivalente vaca',
    'equivalente vaca ev',
    'EV ganaderia',
    'equivalente vaca coeficientes',
    'unidad ganadera receptividad',
    'cuanto es un ev en kilos',
    'cuantos ev es un novillo',
    'tabla equivalente vaca por categoria',
    'carga animal equivalente vaca',
    'receptividad ev por hectarea',
  ],
  openGraph: {
    title: 'Qué es el equivalente vaca (EV) y la receptividad',
    description:
      'El equivalente vaca (EV) mide el requerimiento de una vaca de cría de 400 kg y permite comparar el consumo de cada categoría del rodeo. Coeficientes por categoría y uso en carga animal y receptividad.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElEquivalenteVacaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-equivalente-vaca" sectionName="Equivalente vaca" />
      <DefinedTermSetSchema
        name="Equivalente vaca — definiciones"
        description="Definiciones citables de equivalente vaca (EV), receptividad, carga animal, requerimiento y unidad ganadera en el manejo del rodeo argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el equivalente vaca (EV) y la receptividad"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es el equivalente vaca (EV) y la receptividad"
        description="El equivalente vaca (EV) es la unidad que mide el requerimiento de una vaca de cría de 400 kg y permite comparar el consumo de las categorías de un rodeo, con coeficientes de referencia por categoría."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'INTA — Instituto Nacional de Tecnología Agropecuaria', url: 'https://www.argentina.gob.ar/inta' },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Breadcrumb terminal */}
        <nav className="text-xxs font-terminal uppercase text-zinc-500 mb-6 tracking-wide">
          <Link href="/glosario" className="hover:text-accent transition-colors">
            Glosario
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">Equivalente vaca</span>
        </nav>

        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el equivalente vaca (EV) y la receptividad
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El <strong className="text-zinc-100">equivalente vaca (EV)</strong> es la unidad que mide el
          requerimiento de una vaca de cría de 400 kg que gesta y cría un ternero, y sirve para
          comparar el consumo de las distintas categorías de un rodeo llevándolas a un mismo patrón:
          la vaca de cría vale 1,00 y cada categoría vale una fracción o un múltiplo de ese valor. Es
          una herramienta de manejo del pasto —para calcular carga animal y receptividad—, no un valor
          comercial: como contexto de mercado, el novillo cotiza hoy a ${fmt(novillo)}/kg vivo (
          {lastUpdate}), precio de referencia del mercado (INMAG/MAG), no fijado por esta página.
        </p>

        {/* Qué es */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué es el equivalente vaca</h2>
        <p className="text-zinc-400 mb-4">
          El equivalente vaca traduce el requerimiento de forraje de un animal a una escala única. El
          animal patrón es una vaca de cría de unos 400 kg de peso vivo, preñada y con un ternero al
          pie, que consume del orden de 8 a 10 kg de materia seca por día. A ese requerimiento anual se
          le asigna el valor 1,00 EV. Todas las demás categorías se expresan en relación con ella: un
          ternero al destete requiere poco más de la mitad y un toro algo más que una vaca.
        </p>
        <p className="text-zinc-400 mb-8">
          La utilidad del EV está en homogeneizar. Un rodeo real mezcla vacas, terneros, vaquillonas,
          novillos y toros, cada uno con un consumo distinto; sumar «cabezas» no dice cuánto pasto
          come el conjunto. Al convertir cada categoría a EV se obtiene un número comparable que
          permite planificar la superficie, ordenar un arrendamiento por capacidad de pasto y comparar
          campos entre sí.
        </p>

        {/* Tabla de coeficientes */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Tabla de coeficientes por categoría</h2>
        <p className="text-zinc-400 mb-4">
          Los coeficientes son valores de referencia (tipo INTA); el número exacto depende del peso, la
          etapa y la ganancia de peso buscada. La vaca de cría de 400 kg es la unidad = 1,00 EV.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-700 text-xxs font-terminal uppercase text-zinc-500 tracking-wide">
                <th className="py-2 pr-4 font-medium">Categoría</th>
                <th className="py-2 pr-4 font-medium">EV</th>
                <th className="py-2 font-medium">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {COEFICIENTES.map((row) => (
                <tr key={row.categoria} className="border-b border-zinc-800 align-top">
                  <td className="py-2 pr-4 text-zinc-300">{row.categoria}</td>
                  <td className="py-2 pr-4 text-accent font-medium tabular-nums">{row.ev}</td>
                  <td className="py-2 text-zinc-500">{row.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mb-8">
          Valores de referencia para estimación de carga; distintos autores y regiones usan tablas con
          pequeñas variaciones. No constituyen una norma oficial.
        </p>

        {/* Para qué se usa */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Para qué se usa: carga animal y receptividad
        </h2>
        <p className="text-zinc-400 mb-4">
          El EV es la unidad con la que se miden dos conceptos centrales del manejo del campo:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Receptividad:</span> cuántos EV por hectárea puede sostener
            un campo sin degradar el pasto, según su oferta forrajera. Es el límite biológico, se
            expresa en EV/ha/año y define cuánta hacienda entra en cada unidad de superficie.
          </li>
          <li>
            <span className="text-zinc-300">Carga animal:</span> cuántos EV por hectárea se ponen
            efectivamente a pastorear. Es una decisión de manejo que debería quedar por debajo de la
            receptividad para no comerse el capital forrajero.
          </li>
        </ul>
        <p className="text-zinc-400 mb-8">
          Con el rodeo expresado en EV, dimensionar un potrero se vuelve una cuenta directa: se divide
          el total de EV por la superficie para obtener la carga (EV/ha) y se compara con la
          receptividad del campo. Ese mismo cálculo ordena un arrendamiento por capacidad de pasto y
          permite comparar la invernada frente a la cría en una misma unidad.
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

        {/* Enlazado interno — ancla el cluster de soporte de carga */}
        <div className="border border-zinc-800 rounded-md p-4 mb-6">
          <p className="text-xxs font-terminal uppercase text-zinc-500 tracking-wide mb-3">
            Seguir leyendo
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Link href="/como-se-calcula-la-carga-animal" className="text-accent hover:text-accent-bright transition-colors">
              Cómo se calcula la carga animal →
            </Link>
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda
            </Link>
            <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Cómo se calcula el canon de arrendamiento
            </Link>
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Canon de arrendamiento en kg/ha →
            </Link>
            <Link href="/que-es-la-invernada" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la invernada
            </Link>
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda
            </Link>
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero
            </Link>
          </div>
        </div>

        {/* Footer institucional — sello de frescura obligatorio */}
        <footer className="border-t border-terminal-border pt-4">
          <p className="text-xxs text-zinc-500 mb-1">
            Los coeficientes de EV son valores de referencia para el manejo del rodeo; los precios y
            comisiones citados son de referencia del mercado (INMAG/MAG). Esta página es informativa y
            no fija precios ni tarifas.
          </p>
          <p className="text-xxs text-zinc-500">
            Actualizado: {lastUpdate} · Memola Medios S.A.S.
          </p>
        </footer>
      </div>
    </>
  )
}
