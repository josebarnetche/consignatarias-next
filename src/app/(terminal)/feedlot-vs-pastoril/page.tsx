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

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/feedlot-vs-pastoril`

// Números vivos — interpolados en build; el scraper reescribe el JSON 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')
const ternero = price('terneros')

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario    */
/*  visible. Anclan el vocabulario del engorde (costo/kg, conversión).  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'feedlot',
    description:
      'Engorde a corral: sistema de terminación intensiva en el que la hacienda se aloja en corrales y se alimenta con una ración balanceada (grano, silaje, núcleo) para ganar peso rápido y con alta previsibilidad. Prioriza velocidad y control de la terminación a cambio de un costo por kilo producido más alto, atado al precio del maíz y del ternero de reposición.',
    url: `${BASE_URL}/que-es-un-feedlot`,
  },
  {
    name: 'engorde pastoril',
    description:
      'Terminación del animal a campo, sobre pastura o verdeo, con la energía que aporta el forraje. Es el engorde tradicional argentino asociado a la invernada: menor costo por kilo producido, pero mayor tiempo de terminación y exposición al clima (sequía, lluvias, estado de la pastura).',
    url: `${BASE_URL}/que-es-la-invernada`,
  },
  {
    name: 'costo por kilo producido',
    description:
      'Lo que cuesta poner un kilo de peso vivo sobre el animal, incluyendo alimentación, sanidad, personal, financiación y mortandad. Es la variable central para comparar feedlot y pastoril: define el margen entre lo que costó producir el kilo y el precio de venta de la hacienda terminada.',
    url: PAGE_URL,
  },
  {
    name: 'terminación',
    description:
      'Etapa final del engorde en la que el animal alcanza el estado, el peso y la cobertura de grasa que pide el mercado (consumo, exportación). Un animal terminado es el que está listo para faena; el sistema —corral o campo— cambia la velocidad y el costo con que se llega a ese punto.',
    url: PAGE_URL,
  },
  {
    name: 'conversión',
    description:
      'Índice de conversión alimenticia: kilos de alimento necesarios para que el animal gane un kilo de peso vivo. En el feedlot con ración balanceada la conversión es más eficiente y estable (del orden de 6 a 8 a 1 en la terminación); a campo depende de la calidad y disponibilidad de la pastura.',
    url: PAGE_URL,
  },
]

/* ------------------------------------------------------------------ */
/*  Filas de la comparativa lado a lado — fuente única.                */
/*  Se renderizan una vez en la tabla; sin serie propia de precio.     */
/* ------------------------------------------------------------------ */
type Row = { criterio: string; feedlot: string; pastoril: string }

const ROWS: Row[] = [
  {
    criterio: 'Costo por kilo producido',
    feedlot: 'Más alto: depende del precio del grano/maíz y del ternero de reposición.',
    pastoril: 'Más bajo: la energía la aporta la pastura, con menor gasto de alimentación.',
  },
  {
    criterio: 'Tiempo de terminación',
    feedlot: 'Corto: del orden de 90 a 120 días de encierre para terminar el animal.',
    pastoril: 'Largo: meses a más de un año según la pastura y la categoría.',
  },
  {
    criterio: 'Inversión / capital',
    feedlot: 'Alta e intensiva: infraestructura de corrales, ración, capital de trabajo por ciclo.',
    pastoril: 'Extensiva: se apoya en la tierra y la pastura; menor capital líquido por kilo.',
  },
  {
    criterio: 'Riesgo climático',
    feedlot: 'Acotado: la ración es constante; el riesgo se corre al precio del grano.',
    pastoril: 'Alto: sequía, lluvias y estado de la pastura condicionan la ganancia diaria.',
  },
  {
    criterio: 'Escala y previsibilidad',
    feedlot: 'Alta rotación y fecha de salida previsible; escala por cabeza en poco espacio.',
    pastoril: 'Menor rotación; la escala la pone la superficie de campo disponible.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first: cada respuesta arranca con el dato.            */
/*  Mismo array para FAQPageSchema y el <dl> visible.                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué conviene, feedlot o pastoril?',
    answer: `No hay una respuesta única: conviene el feedlot cuando se prioriza velocidad, rotación y una fecha de salida previsible, y conviene el pastoril cuando se prioriza el menor costo por kilo producido y se dispone de campo y pastura. La decisión depende de la relación entre el costo de la ración (atado al maíz), el precio del ternero de reposición y el precio de venta de la hacienda terminada —hoy el novillo cotiza a $${fmt(novillo)}/kg vivo de referencia (${lastUpdate})—. Esta página expone el marco de comparación; no es recomendación financiera ni fija precios ni tarifas.`,
  },
  {
    question: '¿Cuál engorda más rápido?',
    answer: `El feedlot engorda más rápido: con ración balanceada y encierre, la terminación se resuelve en el orden de 90 a 120 días, contra los meses o más de un año del engorde pastoril, que depende de la pastura. La contracara de esa velocidad es un costo por kilo producido más alto. El sistema no cambia el precio de venta: el novillo terminado se referencia hoy en $${fmt(novillo)}/kg vivo (INMAG/MAG, ${lastUpdate}).`,
  },
  {
    question: '¿Cuál tiene menor costo por kilo?',
    answer:
      'El engorde pastoril suele tener menor costo por kilo producido, porque la energía la aporta la pastura en lugar de una ración comprada de grano. El feedlot gana en velocidad y previsibilidad, pero su costo por kilo es más sensible al precio del maíz y del ternero de reposición. La comparación real se hace caso por caso, con los precios de insumos y de hacienda de cada momento.',
  },
  {
    question: '¿Cuánto tarda cada sistema?',
    answer:
      'El feedlot termina un animal en el orden de 90 a 120 días de encierre; el engorde pastoril tarda de varios meses a más de un año, según la categoría, la calidad de la pastura y el clima. El feedlot ofrece una fecha de salida previsible; el pastoril está más expuesto a la variabilidad del forraje y de las lluvias.',
  },
]

export const metadata: Metadata = {
  title: 'Feedlot vs pastoril: qué conviene para engordar hacienda',
  description: `Feedlot (engorde a corral) y engorde pastoril son los dos sistemas para terminar un animal: el feedlot prioriza velocidad y control con costo por kilo más alto; el pastoril, menor costo por kilo a mayor tiempo. Comparativa de costo/kg, tiempo, inversión y riesgo, con el novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}).`,
  keywords: [
    'feedlot vs pastoril',
    'que conviene para engordar',
    'feedlot o pastoril que conviene',
    'costo por kilo feedlot',
    'engorde a corral o a campo',
    'diferencia feedlot y engorde pastoril',
    'cual engorda mas rapido feedlot o pastoril',
    'tiempo de terminacion feedlot',
    'engorde a corral vs a campo',
    'conversion feedlot pastoril',
  ],
  openGraph: {
    title: 'Feedlot vs pastoril: qué conviene para engordar',
    description: `Los dos sistemas para terminar un animal comparados lado a lado: costo por kilo, tiempo de terminación, inversión y riesgo climático. Novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function FeedlotVsPastorilPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="feedlot-vs-pastoril" sectionName="Feedlot vs pastoril" />
      <DefinedTermSetSchema
        name="Feedlot y engorde pastoril — definiciones"
        description="Definiciones citables de feedlot, engorde pastoril, costo por kilo producido, terminación y conversión, el vocabulario para comparar los dos sistemas de engorde de hacienda en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Feedlot vs pastoril: qué conviene para engordar"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Feedlot vs pastoril: qué conviene para engordar hacienda"
        description="Comparativa de los dos sistemas de terminación de hacienda —feedlot (engorde a corral) y engorde pastoril— por costo por kilo producido, tiempo de terminación, inversión y riesgo climático."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'INTA — Instituto Nacional de Tecnología Agropecuaria', url: 'https://www.argentina.gob.ar/inta' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/feedlot-vs-pastoril" className="hover:text-accent transition-colors">
            Feedlot vs pastoril
          </Link>{' '}
          / Qué conviene para engordar
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Feedlot vs pastoril: qué conviene para engordar
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El engorde a corral (<strong>feedlot</strong>) y el <strong>engorde pastoril</strong> son
          los dos sistemas para terminar un animal: el feedlot prioriza velocidad y control con un
          costo por kilo más alto, mientras que el pastoril prioriza menor costo por kilo a mayor
          tiempo. Cuál conviene depende de la relación entre el costo del alimento, el ternero de
          reposición y el precio de venta —hoy ({lastUpdate}) el novillo terminado se referencia en{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> (INMAG/MAG), precio de referencia del mercado, no
          fijado por esta página.
        </p>

        <p className="mb-4">
          Esta es una comparación de <strong>marco</strong>, no una recomendación financiera: qué
          diferencia a cada sistema en costo por kilo, tiempo de terminación, inversión y riesgo, y
          en qué contexto suele convenir cada uno. Las definiciones de fondo están en{' '}
          <Link href="/que-es-un-feedlot" className="text-accent hover:text-accent-bright transition-colors">
            qué es un feedlot
          </Link>{' '}
          y{' '}
          <Link href="/que-es-la-invernada" className="text-accent hover:text-accent-bright transition-colors">
            qué es la invernada
          </Link>
          .
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Feedlot: cómo funciona (costo/kg, tiempo, riesgo)
        </h2>
        <p className="mb-4">
          El <strong>feedlot</strong> es engorde intensivo a corral: el animal se encierra y se
          alimenta con una <strong>ración balanceada</strong> (grano, silaje, núcleo) para ganar peso
          rápido y con alta previsibilidad. Su <strong>conversión</strong> es más eficiente y estable
          que a campo, y la <strong>terminación</strong> se resuelve en el orden de 90 a 120 días,
          con fecha de salida previsible. La contracara es un <strong>costo por kilo producido más
          alto</strong>, muy sensible al precio del maíz y del ternero de reposición: el margen del
          feedlot es la distancia entre lo que costó poner el kilo y el precio de venta del animal
          terminado. El riesgo climático queda acotado —la ración es constante—, pero se traslada al
          precio del grano y a la financiación del ciclo.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Pastoril: cómo funciona</h2>
        <p className="mb-4">
          El <strong>engorde pastoril</strong> termina el animal a campo, sobre pastura o verdeo, con
          la energía que aporta el forraje. Es el engorde tradicional argentino asociado a la{' '}
          <strong>invernada</strong>: su <strong>costo por kilo producido es más bajo</strong> porque
          la alimentación no se compra, sino que se produce en el campo. A cambio, el{' '}
          <strong>tiempo de terminación es más largo</strong> —de varios meses a más de un año— y la
          ganancia diaria queda expuesta al <strong>riesgo climático</strong>: la sequía, las lluvias
          y el estado de la pastura definen cuánto y cuán rápido engorda el animal. Es un sistema
          extensivo, que se apoya en la superficie de campo y en el manejo del pastizal.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Comparativa lado a lado</h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Criterio</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Feedlot (corral)</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Pastoril (campo)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.criterio} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{r.criterio}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.feedlot}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.pastoril}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Cuadro de marco general; los rangos de tiempo y costo varían por zona, categoría, precio de
          insumos y manejo. No constituye recomendación financiera. Los precios de hacienda que se
          citan son de referencia del mercado (INMAG/MAG), no fijados por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Cuándo conviene cada uno</h2>
        <p className="mb-4">
          El <strong>feedlot</strong> tiende a convenir cuando importa la <strong>velocidad de
          rotación</strong> y una fecha de salida previsible, cuando la relación entre el precio del
          grano y el de la hacienda terminada deja margen, y cuando hay capital de trabajo para
          financiar el ciclo. El <strong>engorde pastoril</strong> tiende a convenir cuando se
          dispone de <strong>campo y pastura</strong>, cuando se prioriza el menor costo por kilo
          producido y se puede absorber un tiempo de terminación más largo, y cuando el productor
          busca una operación más extensiva y menos intensiva en capital. En la práctica muchos
          esquemas son <strong>mixtos</strong>: recría a campo y terminación a corral, o base
          pastoril con suplementación estratégica. La decisión final es económica y productiva de
          cada establecimiento; esta página expone el marco, no lo resuelve por el productor.
        </p>

        <p className="mb-4">
          El punto de partida de ambos sistemas es la misma hacienda de reposición —el ternero, que
          hoy se referencia en ${fmt(ternero)}/kg vivo ({lastUpdate})— que viene de la{' '}
          <Link href="/que-es-la-cria-y-recria" className="text-accent hover:text-accent-bright transition-colors">
            cría y recría
          </Link>
          . Y ambos terminan en el mismo lugar: un animal listo para faena, cuyo{' '}
          <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
            rendimiento al gancho
          </Link>{' '}
          y{' '}
          <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
            precio del novillo en pie
          </Link>{' '}
          definen el ingreso.
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

        {/* Enlazado interno denso — páginas hermanas del cluster de engorde */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir leyendo
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/que-es-un-feedlot" className="text-accent hover:text-accent-bright transition-colors">
              Qué es un feedlot →
            </Link>
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Arrendamiento pastoril →
            </Link>
            <Link href="/que-es-la-invernada" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la invernada →
            </Link>
            <Link href="/que-es-la-cria-y-recria" className="text-accent hover:text-accent-bright transition-colors">
              Cría y recría →
            </Link>
            <Link href="/como-se-calcula-la-carga-animal" className="text-accent hover:text-accent-bright transition-colors">
              Carga animal →
            </Link>
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en pie →
            </Link>{' '}
            ·{' '}
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Comparativa de marco, no recomendación financiera. Los precios y costos citados son de
            referencia del mercado (INMAG/MAG) y varían por zona, insumos y manejo; esta página no
            fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
