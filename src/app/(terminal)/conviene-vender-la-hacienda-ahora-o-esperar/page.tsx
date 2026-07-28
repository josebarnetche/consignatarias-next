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
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/conviene-vender-la-hacienda-ahora-o-esperar`

/* ------------------------------------------------------------------ */
/*  Números vivos — interpolados en build; el JSON lo pisa el scraper  */
/*  14:00 ART → git commit → rebuild Vercel. Nunca hardcodear precio.  */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')
const vaca = price('vacas')
const ternero = price('terneros')

// Serie/índice INMAG — para hablar de tendencia (dirección + variación).
const inmag = marketPrices.inmag
const inmagCurrent = Math.round(inmag.current)
const inmagChange = inmag.change // variación % firmada de la última rueda
const tendencia = inmagChange > 0 ? 'en alza' : inmagChange < 0 ? 'en baja' : 'estable'
const inmagChangeStr = `${inmagChange > 0 ? '+' : ''}${inmagChange.toLocaleString('es-AR')}%`

// Ejemplo orientativo del costo de retener: engorde mensual de referencia.
const kgMes = 20 // aumento de peso orientativo por mes, no un dato garantizado
const valorKgGanado = Math.round(kgMes * novillo) // valor bruto de esos kilos al precio de hoy

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario.  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Costo de retención',
    description:
      'Lo que cuesta mantener un animal en el campo en lugar de venderlo: alimento (pastura, suplementación), sanidad, mano de obra, el capital inmovilizado en esos kilos y el riesgo de mortandad o de que el precio baje. Se compensa, total o parcialmente, con los kilos que el animal suma mientras se retiene.',
    url: PAGE_URL,
  },
  {
    name: 'Tendencia de precios',
    description:
      'Dirección del mercado en el tiempo: si el precio de referencia de la hacienda viene subiendo, bajando o lateralizando. Se lee sobre una serie —como el índice INMAG— y no sobre el dato de un solo día. La tendencia pasada no garantiza la futura; describe el contexto, no lo que va a pasar.',
    url: `${BASE_URL}/indices`,
  },
  {
    name: 'INMAG',
    description:
      'Índice del Mercado Agroganadero: precio promedio ponderado del kilo vivo que surge de la operatoria del Mercado Agroganadero de Cañuelas. Es una de las referencias del precio de la hacienda en Argentina y permite leer la tendencia del mercado a lo largo del tiempo. No es un precio fijado por esta página.',
    url: `${BASE_URL}/metodologia`,
  },
  {
    name: 'Punto de equilibrio de venta',
    description:
      'El valor al que retener deja de convenir: cuando los kilos que suma el animal, al precio esperado, ya no cubren el costo de retención más el riesgo. Es un cálculo propio de cada campo (su costo de alimento, su categoría, su plazo), no un número universal.',
    url: PAGE_URL,
  },
  {
    name: 'Estacionalidad',
    description:
      'Patrón que se repite a lo largo del año en la oferta y el precio de la hacienda, ligado al ciclo forrajero: en general hay más oferta —y presión bajista— en otoño, cuando se descargan campos, y condiciones distintas en primavera. Es un factor de contexto, no una regla fija de cada temporada.',
    url: `${BASE_URL}/mercado`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first, interpola números vivos. Mismo array para el   */
/*  FAQPageSchema y el <dl> visible.                                   */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Conviene vender la hacienda ahora?',
    answer: `No hay una respuesta única: conviene o no según el precio de hoy, la tendencia del mercado y el costo de retener ese animal en cada campo. Como marco, se comparan los kilos que el animal sumaría si se retiene —a su precio esperado— contra el costo de mantenerlo (alimento, sanidad, capital inmovilizado) y el riesgo de que el precio baje. Hoy el novillo se referencia en $${fmt(novillo)}/kg vivo (${INMAG_DATE}) y el índice INMAG viene ${tendencia} (${inmagChangeStr} en la última rueda). Son datos de referencia del mercado (INMAG/MAG), no una recomendación de compraventa ni un precio fijado por esta página.`,
  },
  {
    question: '¿Cómo sé si el precio va a subir?',
    answer:
      'No se sabe con certeza: nadie puede anticipar el precio futuro de la hacienda. Lo que sí se puede leer es la tendencia —si la serie del INMAG viene subiendo, bajando o lateral— y el contexto estacional (más oferta y presión bajista suele haber en otoño). Esos elementos describen el clima del mercado, no lo garantizan. La decisión razonable no apuesta a adivinar el techo, sino que compara el escenario actual con el costo de esperar.',
  },
  {
    question: '¿Cuánto cuesta retener un novillo un mes más?',
    answer: `Depende de cada campo, pero el marco es simple: se pone en la balanza lo que el animal suma contra lo que cuesta mantenerlo. Si un novillo engorda del orden de ${kgMes} kg en el mes, al precio de referencia de hoy ($${fmt(novillo)}/kg vivo, ${INMAG_DATE}) esos kilos valen unos $${fmt(valorKgGanado)} brutos por cabeza; contra eso hay que descontar el alimento, la sanidad, la mano de obra, el capital inmovilizado y el riesgo de una baja de precio. Es un ejemplo orientativo con precio de referencia del mercado (INMAG/MAG), no una cotización ni una recomendación.`,
  },
  {
    question: '¿Qué es el INMAG?',
    answer: `El INMAG es el Índice del Mercado Agroganadero: el precio promedio ponderado del kilo vivo que surge de la operatoria del Mercado Agroganadero de Cañuelas. Sirve para leer la tendencia del precio de la hacienda a lo largo del tiempo, no solo el dato de un día. Su último valor de referencia es de $${fmt(inmagCurrent)}/kg vivo (${INMAG_DATE}), con una variación de ${inmagChangeStr} respecto de la rueda previa. Es una referencia del mercado, no un precio fijado por esta página.`,
  },
]

export const metadata: Metadata = {
  title: `¿Conviene vender la hacienda ahora o esperar? El marco (${lastUpdate.slice(0, 4)})`,
  description: `Vender la hacienda hoy o retenerla depende de tres variables: el precio actual, la tendencia del mercado y el costo de mantener el animal. Un marco de decisión con novillo $${fmt(novillo)}/kg vivo e índice INMAG ${tendencia} (${INMAG_DATE}). Referencia del mercado, no una recomendación de compraventa.`,
  keywords: [
    'conviene vender la hacienda ahora',
    'conviene vender la hacienda ahora o esperar',
    'vender o esperar novillos',
    'va a subir el precio de la hacienda',
    'cuando vender ganado',
    'cuando conviene vender el novillo',
    'costo de retener un novillo',
    'tendencia precio de la hacienda',
    'que es el inmag',
    'vender o retener hacienda',
  ],
  openGraph: {
    title: '¿Conviene vender la hacienda ahora o esperar?',
    description: `Precio actual, tendencia del mercado y costo de retener: el marco para decidir entre vender hoy o esperar. Novillo $${fmt(novillo)}/kg vivo, INMAG ${tendencia} (${INMAG_DATE}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ConvieneVenderLaHaciendaAhoraOEsperarPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="conviene-vender-la-hacienda-ahora-o-esperar"
        sectionName="Vender o esperar"
      />
      <DefinedTermSetSchema
        name="Vender o esperar — definiciones"
        description="Definiciones citables de costo de retención, tendencia de precios, INMAG, punto de equilibrio de venta y estacionalidad, aplicadas a la decisión de vender o retener hacienda."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="¿Conviene vender la hacienda ahora o esperar?"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="¿Conviene vender la hacienda ahora o esperar? Un marco de decisión"
        description="Marco para decidir entre vender la hacienda hoy o retenerla: precio actual, tendencia del mercado (INMAG) y costo de retención. Información de referencia, no una recomendación de compraventa."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'Mercado Agroganadero — INMAG', url: 'https://www.mercadoagroganadero.com.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/indices" className="hover:text-accent transition-colors">
            Índices
          </Link>{' '}
          / Vender o esperar
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          ¿Conviene vender la hacienda ahora o esperar?
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La decisión de vender la hacienda hoy o retenerla depende de{' '}
          <strong>tres variables</strong>: el <strong>precio actual</strong>, la{' '}
          <strong>tendencia del mercado</strong> y el <strong>costo de mantener el animal</strong>{' '}
          —no de una regla fija ni de adivinar el techo del precio. Como referencia de hoy (
          {INMAG_DATE}), el novillo cotiza a <strong>${fmt(novillo)}/kg vivo</strong> y el índice
          INMAG viene <strong>{tendencia}</strong> ({inmagChangeStr}): son datos de referencia del
          mercado (INMAG/MAG), no una recomendación de compraventa ni un precio fijado por esta
          página.
        </p>

        <p className="mb-6">
          Esta página no dice cuándo vender: expone el marco con el que se toma esa decisión. Cada
          campo tiene su propio costo de alimento, su categoría de hacienda y su plazo, y la
          respuesta cambia con esos números. Lo que sigue ordena las tres variables —precio,
          tendencia y costo de retención— para que la decisión sea explícita y no una corazonada.
        </p>

        {/* Precio hoy */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Qué dice el precio hoy</h2>
        <p className="mb-3">
          El primer dato es el precio corriente del kilo vivo por categoría. Estos son los valores de
          referencia del mercado al {lastUpdate}:
        </p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Referencia ($/kg vivo)
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Novillo</td>
                <td className="px-3 py-2 text-right text-zinc-300">${fmt(novillo)}</td>
                <td className="px-3 py-2 text-zinc-400">
                  <Link
                    href="/precio-del-novillo-en-pie"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Precio del novillo en pie →
                  </Link>
                </td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Vaca</td>
                <td className="px-3 py-2 text-right text-zinc-300">${fmt(vaca)}</td>
                <td className="px-3 py-2 text-zinc-400">
                  <Link
                    href="/precio-de-la-vaca-en-pie"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Precio de la vaca en pie →
                  </Link>
                </td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Ternero</td>
                <td className="px-3 py-2 text-right text-zinc-300">${fmt(ternero)}</td>
                <td className="px-3 py-2 text-zinc-400">
                  <Link
                    href="/precio-del-ternero-en-pie"
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    Precio del ternero en pie →
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-6">
          Valores de referencia del mercado (INMAG/MAG) al {INMAG_DATE}, no fijados por esta página.
          El precio efectivo de cada operación depende de la calidad, el peso, la zona y las
          condiciones de venta.
        </p>

        {/* Tendencia / INMAG */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">La tendencia: qué mide el INMAG</h2>
        <p className="mb-3">
          El precio de un solo día dice poco por sí mismo; lo que orienta la decisión es la{' '}
          <strong>tendencia</strong>. El{' '}
          <Link href="/metodologia" className="text-accent hover:text-accent-bright transition-colors">
            índice INMAG
          </Link>{' '}
          —el promedio ponderado del kilo vivo del Mercado Agroganadero— permite leer si el mercado
          viene subiendo, bajando o lateralizando. Su último valor de referencia es de{' '}
          <strong>${fmt(inmagCurrent)}/kg vivo</strong> ({INMAG_DATE}), con una variación de{' '}
          <strong>{inmagChangeStr}</strong> respecto de la rueda previa: en este momento el índice
          viene <strong>{tendencia}</strong>.
        </p>
        <p className="mb-6">
          La tendencia describe el contexto, no lo que va a pasar: una serie en baja no garantiza que
          siga bajando, ni una en alza que siga subiendo. Sumada a la{' '}
          <strong>estacionalidad</strong> —en general hay más oferta y presión bajista en otoño,
          cuando se descargan campos—, ayuda a entender el clima del mercado. Para el productor
          exportador o el que sigue el poder de compra, conviene mirar además el{' '}
          <Link href="/el-novillo-en-dolares" className="text-accent hover:text-accent-bright transition-colors">
            novillo en dólares
          </Link>
          , que separa la suba nominal de la real.
        </p>

        {/* Costo de retener */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          El costo de retener: kilos, alimento y riesgo
        </h2>
        <p className="mb-3">
          Retener no es gratis ni tampoco pura pérdida: es un cálculo. Del lado positivo, el animal
          <strong> suma kilos</strong> mientras se lo mantiene. Del lado del costo están el{' '}
          <strong>alimento</strong> (pastura o suplementación), la <strong>sanidad</strong>, la mano
          de obra, el <strong>capital inmovilizado</strong> en esos kilos y el{' '}
          <strong>riesgo</strong> —mortandad y, sobre todo, que el precio baje.
        </p>
        <p className="mb-3">
          El marco es directo: si un novillo engorda del orden de {kgMes} kg en el mes, al precio de
          referencia de hoy (${fmt(novillo)}/kg vivo, {INMAG_DATE}) esos kilos valen unos{' '}
          <strong>${fmt(valorKgGanado)}</strong> brutos por cabeza. Retener conviene mientras ese
          valor —más una eventual suba— supere el costo de mantener el animal más el riesgo asumido.
          El valor al que esa cuenta se da vuelta es el <strong>punto de equilibrio de venta</strong>
          , propio de cada campo: no hay un número universal.
        </p>
        <p className="text-xxs text-zinc-500 mb-6">
          Ejemplo orientativo con engorde y precio de referencia; no una proyección ni una cotización.
          Los kilos ganados, el costo de alimento y el riesgo varían por campo, categoría y
          temporada. Precio de referencia del mercado (INMAG/MAG), no fijado por esta página.
        </p>

        {/* Marco de decisión */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Un marco de decisión, no una recomendación
        </h2>
        <p className="mb-3">
          Con las tres variables sobre la mesa, la decisión se puede ordenar como una comparación
          explícita entre vender ahora y esperar. Ninguna opción es &laquo;la correcta&raquo; en
          abstracto: cada una tiene su ventaja y su riesgo, y el peso de cada uno depende del precio,
          la tendencia y el costo de retención de ese campo.
        </p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Opción</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Ventajas</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Riesgos</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Vender ahora</td>
                <td className="px-3 py-2 text-zinc-400">
                  Liquidez inmediata; se elimina el riesgo de una baja de precio; se deja de pagar el
                  costo de retención (alimento, sanidad, capital inmovilizado).
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  Se resignan los kilos que el animal habría sumado y una eventual suba del mercado.
                </td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Esperar / retener</td>
                <td className="px-3 py-2 text-zinc-400">
                  El animal suma kilos y se puede capturar una suba si el mercado acompaña.
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  Costo de alimento y sanidad, capital inmovilizado, riesgo de mortandad y de que el
                  precio baje mientras se retiene.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-6">
          La regla razonable no apuesta a adivinar el máximo: compara el escenario de hoy con el
          costo de esperar. Esta página informa —no cotiza ni recomienda—; la decisión de vender o
          retener es del productor y su asesor, con los números de su propio campo.
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
            <Link href="/indices" className="text-accent hover:text-accent-bright transition-colors">
              Índices del mercado →
            </Link>
            <Link href="/mercado" className="text-accent hover:text-accent-bright transition-colors">
              Inteligencia de mercado →
            </Link>
            <Link href="/el-novillo-en-dolares" className="text-accent hover:text-accent-bright transition-colors">
              El novillo en dólares →
            </Link>
            <Link href="/metodologia" className="text-accent hover:text-accent-bright transition-colors">
              Metodología del INMAG →
            </Link>
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1 pt-1">
            <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en pie →
            </Link>
            <Link href="/precio-de-la-vaca-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio de la vaca en pie →
            </Link>
            <Link href="/precio-del-ternero-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del ternero en pie →
            </Link>
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo de arrendamiento →
            </Link>
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los precios y la tendencia que se muestran son de referencia del mercado (INMAG/MAG); no
            son una recomendación de compraventa. Esta página no fija precios ni tarifas e informa con
            fines orientativos: la decisión de vender o retener es del productor y su asesor.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
