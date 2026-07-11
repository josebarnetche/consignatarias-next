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

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-se-calcula-la-carga-animal`

// Dato vivo — página técnica, sin precio directo: el único vivo es la fecha del último cierre.
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// Coeficientes de equivalente vaca (EV) — valores de referencia (INTA / Cocimano).
// Fuente única: alimenta la tabla visible y el rodeo testigo del ejemplo.
const COEFICIENTES = [
  { categoria: 'Vaca de cría (con ternero al pie)', ev: 1.0, nota: 'Unidad base del sistema' },
  { categoria: 'Toro', ev: 1.2, nota: 'Mayor requerimiento de mantenimiento' },
  { categoria: 'Novillo de 2 a 3 años', ev: 1.1, nota: 'Recría avanzada / terminación' },
  { categoria: 'Novillito de 1 a 2 años', ev: 0.75, nota: 'Recría' },
  { categoria: 'Vaquillona de 1 a 2 años', ev: 0.7, nota: 'Reposición' },
  { categoria: 'Ternero/a (destete a 1 año)', ev: 0.55, nota: 'Cría a destete' },
]

// Rodeo testigo sobre 100 ha ganaderas — ilustra el cálculo de EV/ha (números orientativos).
const superficieEj = 100 // ha ganaderas
const rodeoEj = [
  { categoria: 'Vacas de cría', cabezas: 120, ev: 1.0 },
  { categoria: 'Toros', cabezas: 4, ev: 1.2 },
  { categoria: 'Vaquillonas de reposición', cabezas: 30, ev: 0.7 },
]
const evTotalEj = rodeoEj.reduce((acc, r) => acc + r.cabezas * r.ev, 0) // 145.8 EV
const cargaEj = evTotalEj / superficieEj // EV/ha
const receptividadEj = 1.2 // EV/ha de referencia para el ejemplo

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Contar los animales por categoría',
    text: 'El primer paso es hacer el inventario del rodeo separando por categoría: vacas de cría, vaquillonas, novillos, novillitos, terneros y toros. Cada categoría tiene un requerimiento de forraje distinto, por eso no se pueden sumar cabezas «a secas».',
  },
  {
    name: 'Convertir cada categoría a equivalentes vaca (EV)',
    text: 'Se multiplica la cantidad de cabezas de cada categoría por su coeficiente de equivalente vaca. La vaca de cría vale 1 EV y las demás categorías se expresan como fracción o múltiplo de ella (un ternero pesa menos y come menos, un toro más). Los coeficientes son valores de referencia técnicos (INTA).',
    url: `${BASE_URL}/que-es-el-equivalente-vaca`,
  },
  {
    name: 'Sumar los EV totales del rodeo',
    text: 'Se suman los equivalentes vaca de todas las categorías para obtener el total de EV que sostiene el campo. Ese número expresa el rodeo en una unidad homogénea, comparable entre establecimientos con hacienda de distinta composición.',
  },
  {
    name: 'Dividir por la superficie ganadera en hectáreas',
    text: 'La carga animal se obtiene dividiendo los EV totales por la superficie ganadera efectiva (la que realmente sostiene hacienda, sin montes cerrados, aguadas ni caminos). El resultado se expresa en EV por hectárea (EV/ha).',
  },
  {
    name: 'Comparar con la receptividad del campo',
    text: 'Por último se contrasta la carga calculada con la receptividad: cuántos EV/ha puede sostener el campo de forma sustentable según su forraje, suelo y régimen de lluvias. Si la carga supera la receptividad, el campo está sobrecargado; si queda por debajo, hay capacidad ociosa.',
    url: `${BASE_URL}/que-es-la-invernada`,
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Carga animal',
    description:
      'Cantidad de hacienda que sostiene una superficie ganadera en un período, expresada en equivalentes vaca por hectárea (EV/ha). Se calcula relacionando los EV totales del rodeo con la superficie ganadera efectiva. Es un indicador central para dimensionar un rodeo, un arrendamiento o el margen bruto de un campo.',
    url: PAGE_URL,
  },
  {
    name: 'Equivalente vaca (EV)',
    description:
      'Unidad de medida que homogeneiza categorías de hacienda según su requerimiento de forraje. Se define como una vaca de cría de unos 400 kg que gesta y cría un ternero hasta el destete: esa vaca vale 1 EV y las demás categorías se expresan con un coeficiente relativo (un ternero ≈ 0,55 EV, un toro ≈ 1,20 EV).',
    url: `${BASE_URL}/que-es-el-equivalente-vaca`,
  },
  {
    name: 'Receptividad',
    description:
      'Cantidad de EV por hectárea que un campo puede sostener de forma sustentable a lo largo del año, según su oferta forrajera, tipo de suelo y régimen de lluvias. Es el techo de carga: la carga animal no debería superar la receptividad sin comprometer el pasto ni la condición de la hacienda.',
    url: PAGE_URL,
  },
  {
    name: 'EV/ha',
    description:
      'Unidad en que se expresa la carga animal: equivalentes vaca por hectárea. Resulta de dividir los EV totales del rodeo por la superficie ganadera. Permite comparar la intensidad de uso entre campos de distinta superficie y composición de rodeo.',
    url: PAGE_URL,
  },
  {
    name: 'Superficie ganadera',
    description:
      'Hectáreas de un establecimiento que efectivamente sostienen hacienda, descontando montes cerrados, bañados improductivos, aguadas, caminos e instalaciones. Es el denominador correcto para calcular la carga animal: usar la superficie total en lugar de la ganadera subestima la carga real.',
    url: PAGE_URL,
  },
]

// FAQ — answer-first. Mismo array en schema y en el <dl> visible.
const FAQ = [
  {
    question: '¿Cómo se calcula la carga animal?',
    answer:
      'La carga animal se calcula en cinco pasos: contar los animales por categoría, convertir cada categoría a equivalentes vaca (EV) con su coeficiente, sumar los EV totales del rodeo, dividir ese total por la superficie ganadera en hectáreas y comparar el resultado con la receptividad del campo. El resultado se expresa en EV por hectárea (EV/ha). Es un indicador técnico, no un precio ni una tarifa.',
  },
  {
    question: '¿Cuántos animales entran por hectárea?',
    answer: `No hay un número único: depende de la categoría de hacienda y de la receptividad del campo. La carga se mide en equivalentes vaca por hectárea (EV/ha), no en cabezas sueltas. En un rodeo de cría testigo de ${fmt(
      rodeoEj.reduce((a, r) => a + r.cabezas, 0),
    )} cabezas sobre ${superficieEj} ha ganaderas, los EV totales dan ${fmt(
      Number(evTotalEj.toFixed(1)),
    )} EV y la carga resulta de aproximadamente ${cargaEj.toFixed(2).replace('.', ',')} EV/ha. Un mismo campo aloja muchas más cabezas de terneros que de vacas, porque cada ternero pesa una fracción de un EV.`,
  },
  {
    question: '¿Qué es el equivalente vaca?',
    answer:
      'El equivalente vaca (EV) es una unidad que homogeneiza las distintas categorías de hacienda según su requerimiento de forraje. Se toma como base una vaca de cría de unos 400 kg que gesta y cría un ternero al destete: esa vaca vale 1 EV. Las demás categorías se expresan con un coeficiente relativo —por ejemplo, un ternero ronda 0,55 EV y un toro 1,20 EV—, lo que permite sumar un rodeo heterogéneo en una sola unidad.',
  },
  {
    question: '¿Qué es la receptividad de un campo?',
    answer:
      'La receptividad es la cantidad de EV por hectárea que un campo puede sostener de forma sustentable durante el año, según su oferta de pasto, tipo de suelo y lluvias. Funciona como el techo de la carga animal: si la carga calculada supera la receptividad, el campo está sobrecargado y se compromete el forraje y la hacienda; si queda por debajo, hay capacidad forrajera ociosa.',
  },
]

export const metadata: Metadata = {
  title: `Cómo se calcula la carga animal (EV/ha): equivalente vaca y receptividad (${lastUpdate.slice(0, 4)})`,
  description:
    'La carga animal es la cantidad de hacienda que sostiene una superficie, expresada en equivalentes vaca por hectárea (EV/ha). Se calcula convirtiendo cada categoría a EV, sumando y dividiendo por la superficie ganadera, y comparando con la receptividad. Paso a paso, con tabla de coeficientes y ejemplo numérico.',
  keywords: [
    'cómo se calcula la carga animal',
    'cuántos animales por hectárea',
    'carga animal EV/ha',
    'equivalente vaca EV',
    'receptividad de un campo ganadero',
    'qué es el equivalente vaca',
    'cómo calcular la receptividad de un campo',
    'coeficientes equivalente vaca por categoría',
    'superficie ganadera cómo se mide',
    'carga animal para arrendamiento ganadero',
  ],
  openGraph: {
    title: 'Cómo se calcula la carga animal (EV/ha)',
    description:
      'Equivalentes vaca por hectárea: los cinco pasos del cálculo, tabla de coeficientes por categoría y un ejemplo numérico sobre 100 ha.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoSeCalculaLaCargaAnimalPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="como-se-calcula-la-carga-animal"
        sectionName="Carga animal"
      />
      <DefinedTermSetSchema
        name="Glosario de la carga animal"
        description="Términos del cálculo de la carga animal ganadera: carga animal, equivalente vaca (EV), receptividad, EV/ha y superficie ganadera."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo se calcula la carga animal (EV/ha), paso a paso"
        description="Del inventario del rodeo a la comparación con la receptividad: los cinco pasos para calcular la carga animal de un campo ganadero en equivalentes vaca por hectárea."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo se calcula la carga animal (EV/ha): equivalente vaca y receptividad"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/como-se-calcula-la-carga-animal" className="hover:text-accent transition-colors">
            Carga animal
          </Link>{' '}
          / Cómo se calcula la carga animal
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo se calcula la carga animal (EV/ha)
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La <strong>carga animal</strong> es la cantidad de animales que sostiene una superficie,
          expresada en <strong>equivalentes vaca por hectárea (EV/ha)</strong>, y se calcula
          relacionando los EV totales del rodeo con la superficie ganadera: se convierte cada
          categoría a equivalentes vaca, se suman y se divide por las hectáreas. Es un{' '}
          <strong>indicador técnico</strong> de referencia —esta página es informativa y no fija
          precios ni tarifas.
        </p>

        <p className="mb-4">
          El truco está en no sumar cabezas «a secas»: un ternero, una vaquillona y un toro comen
          cantidades de pasto muy distintas. Por eso cada categoría se lleva a una unidad común, el{' '}
          <Link
            href="/que-es-el-equivalente-vaca"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            equivalente vaca (EV)
          </Link>
          , y recién entonces se divide por la superficie. La carga resultante se compara con la{' '}
          <strong>receptividad</strong> del campo para saber si está bien cargado, sobrecargado o
          con capacidad ociosa.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Los cinco pasos del cálculo
        </h2>
        <ol className="mb-4 space-y-3 list-none">
          {PASOS.map((p, i) => (
            <li key={p.name} className="border-l-2 border-terminal-border pl-3">
              <span className="text-accent text-xxs font-terminal uppercase tracking-wider">
                Paso {i + 1}
              </span>
              <p className="text-zinc-200 font-medium">
                {p.url ? (
                  <Link
                    href={p.url.replace(BASE_URL, '')}
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    {p.name}
                  </Link>
                ) : (
                  p.name
                )}
              </p>
              <p className="text-zinc-400">{p.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Coeficientes de equivalente vaca por categoría
        </h2>
        <p className="mb-2">
          Los coeficientes son <strong>valores de referencia técnicos</strong> (INTA): expresan
          cuánto forraje requiere cada categoría respecto de la vaca de cría, que vale 1 EV. Varían
          según el peso y el estado fisiológico, por lo que conviene tomarlos como orientativos.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">EV</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {COEFICIENTES.map((c, i) => (
                <tr
                  key={c.categoria}
                  className={
                    i < COEFICIENTES.length - 1
                      ? 'border-b border-terminal-border/60 align-top'
                      : 'align-top'
                  }
                >
                  <td className="px-3 py-2 text-zinc-200 font-medium">{c.categoria}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {c.ev.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{c.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Un ejemplo sobre 100 hectáreas
        </h2>
        <p className="mb-2">
          Sobre un campo de cría con <strong>{superficieEj} ha ganaderas</strong>, un rodeo testigo
          convierte así:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Cabezas</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Coef. EV</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">EV</th>
              </tr>
            </thead>
            <tbody>
              {rodeoEj.map((r) => (
                <tr key={r.categoria} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{r.categoria}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{fmt(r.cabezas)}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {r.ev.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {(r.cabezas * r.ev).toFixed(1).replace('.', ',')}
                  </td>
                </tr>
              ))}
              <tr className="align-top bg-terminal-panel/40">
                <td className="px-3 py-2 text-zinc-100 font-medium">Total</td>
                <td className="px-3 py-2 text-right text-zinc-200">
                  {fmt(rodeoEj.reduce((a, r) => a + r.cabezas, 0))}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right text-zinc-100 font-medium">
                  {evTotalEj.toFixed(1).replace('.', ',')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-4">
          Los <strong>{evTotalEj.toFixed(1).replace('.', ',')} EV</strong> totales divididos por las{' '}
          <strong>{superficieEj} ha</strong> dan una carga de{' '}
          <strong>{cargaEj.toFixed(2).replace('.', ',')} EV/ha</strong>. Si la receptividad de ese
          campo se estima en {receptividadEj.toFixed(1).replace('.', ',')} EV/ha, la carga queda por
          encima del techo: el establecimiento estaría levemente{' '}
          <strong>sobrecargado</strong> y convendría ajustar el rodeo o mejorar la oferta forrajera.
          Son números orientativos: cada campo tiene su propia receptividad.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Para qué sirve el dato
        </h2>
        <p className="mb-4">
          La carga animal es la base para dimensionar un{' '}
          <Link
            href="/mercado/arrendamiento"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            arrendamiento
          </Link>{' '}
          medido en kilos de carne por hectárea, para calcular el{' '}
          <Link
            href="/como-se-calcula-el-canon-de-arrendamiento"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            canon de arrendamiento
          </Link>{' '}
          y para estimar el margen bruto de una empresa ganadera. También ordena las decisiones de{' '}
          <Link
            href="/que-es-la-cria-y-recria"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cría y recría
          </Link>{' '}
          y el planteo de{' '}
          <Link
            href="/que-es-un-feedlot"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            feedlot
          </Link>{' '}
          o invernada. Todo parte de la misma cuenta: EV totales sobre superficie ganadera.
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
            Seguir por acá
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/que-es-el-equivalente-vaca" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el equivalente vaca →
            </Link>
            <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Cómo se calcula el canon de arrendamiento →
            </Link>
            <Link href="/que-es-la-invernada" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la invernada →
            </Link>
            <Link href="/que-es-la-cria-y-recria" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la cría y recría →
            </Link>
            <Link href="/que-es-un-feedlot" className="text-accent hover:text-accent-bright transition-colors">
              Qué es un feedlot →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Mercado de arrendamiento →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los coeficientes, cargas y precios mencionados son referencias del mercado y de la
            técnica ganadera (INTA / INMAG / MAG); cada campo tiene su propia receptividad. Esta
            página es informativa y no fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
