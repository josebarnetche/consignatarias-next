import { Metadata } from 'next'
import Link from 'next/link'
import { DatasetSchema, TechArticleSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { getBandasPublicas, VR_METODOLOGIA, VR_VENTANA_DIAS, VR_VENTANA_ORIGEN_DIAS, MIN_LOTES_BANDA, MIN_LOTES_BANDA_COMPLETA, MIN_LOTES_AJUSTE_ORIGEN, vrCobertura } from '@/lib/vr'

const URL = 'https://www.consignatarias.com.ar/metodologia/vr'

// Las preguntas que un modelo hace ANTES de citar una banda: de dónde sale,
// cuántas observaciones la sostienen, y qué pasa cuando no hay suficientes.
const VR_FAQS = [
  {
    question: '¿Qué es el Valor de Referencia (VR)?',
    answer:
      'El VR es el rango de precio al que realmente se vendió una categoría de hacienda en el Mercado Agroganadero, expresado como percentil 10, mediana y percentil 90 en pesos por kilo vivo. No es un promedio ni una tasación: es la dispersión observada en las operaciones de lote de los últimos 30 días, publicada junto con la cantidad de lotes y cabezas que la sostienen.',
  },
  {
    question: '¿Por qué una banda y no un precio único?',
    answer:
      'Porque el mercado no es un número. Medido sobre el dato de lote del MAG, la amplitud entre el percentil 10 y el 90 va de 27,8% en novillo a 44% en vaca. Un precio puntual en el medio de ese rango es útil para tener una idea y engañoso para valuar un rodeo, colateralizar una operación o calcular una prima de seguro. La banda dice lo que el punto esconde.',
  },
  {
    question: '¿De dónde salen los datos?',
    answer:
      'De las planillas de lote del Mercado Agroganadero de Cañuelas (haciinfo000007), donde cada fila es una pesada de un remitente para una consignataria en un día. Recogemos precio, cabezas, kilos promedio, categoría y provincia de origen. Es dato de operación observada, no una encuesta ni una estimación.',
  },
  {
    question: '¿Qué pasa cuando no hay suficientes operaciones?',
    answer:
      `Se devuelve menos y se dice por qué. Con ${MIN_LOTES_BANDA_COMPLETA} lotes o más se publica la banda completa; entre ${MIN_LOTES_BANDA} y ${MIN_LOTES_BANDA_COMPLETA - 1} solo la mediana, declarando que la base es fina; con menos de ${MIN_LOTES_BANDA} no se publica banda y se cae a la referencia nacional del MAG. La regla es no inventar precisión: preferimos responder menos antes que fabricar un rango que el dato no sostiene.`,
  },
  {
    question: '¿El VR cubre todo el mercado ganadero argentino?',
    answer:
      'No, y es importante decirlo. El VR observa lo que pasa por el Mercado Agroganadero de Cañuelas, que es aproximadamente el 12% del rodeo nacional. El ~71% que opera fuera de pantalla (directo, remates en origen, ferias) no está acá. El VR es la dispersión real del mercado que se puede observar, no del universo completo.',
  },
  {
    question: '¿Se puede usar el VR para garantizar un crédito o fijar un precio?',
    answer:
      'El VR es una referencia de mercado, no una tasación ni una cotización en firme. Sirve como insumo de valuación —es precisamente para eso que publicamos la banda, el n y la metodología—, pero el precio final de una operación lo define el remate. Cualquier uso financiero debe considerar la amplitud de la banda, no solo su valor central.',
  },
]

export const metadata: Metadata = {
  title: 'Metodología del Valor de Referencia (VR) — banda de precio observado',
  description:
    'Cómo calculamos el VR: percentil 10, mediana y percentil 90 del precio por kilo vivo, sobre el dato de lote observado del Mercado Agroganadero. Ventana, regla de degradación por número de operaciones, ajuste por origen y límites declarados.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Metodología del Valor de Referencia (VR)',
    description: 'La banda de precio realmente observada, con el n que la sostiene y la regla que impide inventar precisión.',
    url: URL,
    type: 'website',
  },
  alternates: { canonical: URL },
}

export default function MetodologiaVrPage() {
  const bandas = getBandasPublicas()
  const cob = vrCobertura()

  return (
    <>
      <TechArticleSchema
        name={`Metodología del Valor de Referencia (${VR_METODOLOGIA})`}
        description="Banda de precio observado (P10/mediana/P90) por categoría de hacienda, calculada sobre el dato de lote del Mercado Agroganadero, con regla de degradación por número de operaciones y ajuste por provincia de origen."
        url={URL}
      />
      <DatasetSchema
        name="Valor de Referencia (VR) — banda de precio observado de hacienda en pie"
        description={`Percentil 10, mediana y percentil 90 del precio en ARS por kilo vivo por categoría de hacienda, observados en operaciones de lote del Mercado Agroganadero de Cañuelas en una ventana de ${VR_VENTANA_DIAS} días. Incluye el número de lotes y cabezas que sostiene cada banda.`}
        url={URL}
        keywords={['precio hacienda', 'novillo', 'vaca', 'vaquillona', 'mercado agroganadero', 'banda de precio', 'valor de referencia', 'ganadería argentina']}
        dateModified={cob.hasta}
        temporalCoverage={`${cob.desde}/${cob.hasta}`}
        variableMeasured={{
          name: 'Precio de hacienda en pie — mediana observada (VR)',
          unitText: 'ARS/kg vivo',
          observationDate: cob.hasta,
        }}
        distribution={[
          { url: 'https://www.consignatarias.com.ar/api/precios', encodingFormat: 'application/json', name: 'API de precios' },
          { url: 'https://www.consignatarias.com.ar/api/lots', encodingFormat: 'application/json', name: 'API de lote (dato base del VR)' },
        ]}
        updateFrequency="Martes, miércoles y viernes, tras el cierre de operaciones del MAG"
      />
      <FAQPageSchema items={VR_FAQS} />
      <SpeakableSchema url={URL} headline="Cómo se calcula el Valor de Referencia del ganado argentino" />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/metodologia" className="hover:text-sky-400">Metodología</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">Valor de Referencia</span>
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-2">
          Metodología del Valor de Referencia (VR)
        </h1>
        <p className="text-zinc-500 text-xs mb-6">
          {VR_METODOLOGIA} — Memola Medios S.A.S. — dato al {cob.hasta}
        </p>

        <p className="text-zinc-400 mb-8">
          El VR es <span className="text-zinc-200">el rango de precio al que realmente se vendió</span> cada
          categoría de hacienda, no un promedio. Se publica como percentil 10, mediana y percentil 90 en
          pesos por kilo vivo, <span className="text-zinc-200">siempre acompañado de la cantidad de
          operaciones que lo sostiene</span>. Si el número de operaciones no alcanza, se publica menos y se
          dice por qué.
        </p>

        {/* ── Por qué una banda ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">1. Por qué una banda y no un punto</h2>
        <p className="text-zinc-400 mb-4">
          Un precio único sugiere una precisión que el mercado no tiene. Sobre el dato de lote observado, la
          amplitud entre el percentil 10 y el 90 es la siguiente:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 font-normal">Categoría</th>
                <th className="text-right py-2 font-normal">P10</th>
                <th className="text-right py-2 font-normal">Mediana</th>
                <th className="text-right py-2 font-normal">P90</th>
                <th className="text-right py-2 font-normal">Amplitud</th>
                <th className="text-right py-2 font-normal">Lotes</th>
                <th className="text-right py-2 font-normal">Cabezas</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {bandas.map((b) => (
                <tr key={b.categoria} className="border-b border-zinc-900">
                  <td className="py-2 text-zinc-200">{b.categoria}</td>
                  <td className="py-2 text-right tabular-nums">${b.p10.toLocaleString('es-AR')}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-100">${b.mediana.toLocaleString('es-AR')}</td>
                  <td className="py-2 text-right tabular-nums">${b.p90.toLocaleString('es-AR')}</td>
                  <td className="py-2 text-right tabular-nums text-amber-400">{b.amplitud_pct}%</td>
                  <td className="py-2 text-right tabular-nums text-zinc-500">{b.lotes.toLocaleString('es-AR')}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-500">{b.cabezas.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mb-8">
          Ventana de {VR_VENTANA_DIAS} días, del {cob.desde} al {cob.hasta}. Precios en ARS por kilo vivo.
        </p>

        {/* ── Fuente ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">2. Fuente</h2>
        <p className="text-zinc-400 mb-4">
          Planillas de lote del Mercado Agroganadero de Cañuelas (serie <code className="text-zinc-300">haciinfo000007</code>).
          Cada fila es una pesada: un remitente, una consignataria, una categoría, un día. Se registran precio,
          cabezas, kilos totales y promedio, y provincia de origen del remitente.
          Es <span className="text-zinc-200">dato de operación observada</span>, no una encuesta ni una estimación.
        </p>
        <p className="text-zinc-400 mb-8">
          Base actual: <span className="text-zinc-200">{cob.lotes.toLocaleString('es-AR')} lotes</span> y{' '}
          <span className="text-zinc-200">{cob.cabezas.toLocaleString('es-AR')} cabezas</span> en la ventana vigente.
        </p>

        {/* ── Cálculo ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">3. Cálculo</h2>
        <p className="text-zinc-400 mb-4">
          Para cada categoría se toman todos los lotes con precio mayor a cero de los últimos {VR_VENTANA_DIAS} días
          y se calculan los percentiles 10, 50 y 90 por interpolación lineal sobre la distribución de precios por kilo.
          La amplitud publicada es <code className="text-zinc-300">P90 / P10 − 1</code>.
        </p>
        <div className="border border-amber-900/50 rounded p-4 mb-6">
          <p className="text-zinc-300 mb-2">
            El VR y el precio de categoría del MAG no son la misma medida — y a veces difieren mucho.
          </p>
          <p className="text-zinc-400 text-xs">
            El MAG publica una observación semanal de un corte determinado; la mediana del VR sale de{' '}
            <em>todos</em> los lotes de la categoría en la ventana. La brecha es chica en vaca (~1%) y
            llega a ~25% en novillito, vaquillona y toro. Ninguna de las dos está mal: miden cosas
            distintas. El VR usa la mediana de lote porque es el precio al que efectivamente se opera,
            y cuando la brecha supera el 5% lo declara en la propia respuesta de la API y del MCP,
            junto con el precio MAG para que se puedan comparar.
          </p>
        </div>

        <p className="text-zinc-400 mb-8">
          <span className="text-zinc-200">Cada lote pesa igual, no se pondera por cabezas.</span> Es deliberado:
          el VR describe la dispersión de <em>operaciones</em>, que es lo que enfrenta quien vende una tropa.
          Ponderar por volumen daría el precio medio del mercado —que ya es el INMAG— y aplastaría justamente
          la cola que hace útil a la banda.
        </p>

        {/* ── Degradación ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">4. Regla de degradación: nunca inventar precisión</h2>
        <p className="text-zinc-400 mb-4">
          La confianza de una banda depende de cuántas operaciones la sostienen. Cuando la base no alcanza,
          se publica menos y se declara el motivo en la propia respuesta:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 font-normal">Lotes en la ventana</th>
                <th className="text-left py-2 font-normal">Qué se publica</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-900">
                <td className="py-2 text-zinc-300">100 o más</td>
                <td className="py-2">Banda completa, más ajuste por origen si la provincia llega a {MIN_LOTES_AJUSTE_ORIGEN} lotes</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="py-2 text-zinc-300">{MIN_LOTES_BANDA_COMPLETA} a 99</td>
                <td className="py-2">Banda completa, sin ajuste por origen</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="py-2 text-zinc-300">{MIN_LOTES_BANDA} a {MIN_LOTES_BANDA_COMPLETA - 1}</td>
                <td className="py-2">Solo la mediana, con aviso explícito de base fina</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="py-2 text-zinc-300">Menos de {MIN_LOTES_BANDA}</td>
                <td className="py-2">Sin banda: se cae a la referencia nacional del MAG y se declara</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-zinc-400 mb-8">
          Un caso real: <span className="text-zinc-200">ternero no tiene banda</span>. La categoría no aparece
          en el dato de lote del MAG, así que cualquier consulta de terneros cae a la referencia nacional y lo
          dice. Preferimos responder menos antes que fabricar un rango que el dato no sostiene.
        </p>

        {/* ── Origen ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">5. Ajuste por provincia de origen</h2>
        <p className="text-zinc-400 mb-4">
          <span className="text-zinc-200">No existe una serie oficial de precios de hacienda por provincia.</span>{' '}
          Lo que sí se puede medir es si el origen del remitente mueve el precio dentro de nuestra propia base.
          El ajuste es la mediana provincial dividida por la mediana nacional de la misma categoría, sobre una
          ventana más larga de {VR_VENTANA_ORIGEN_DIAS} días, y se aplica solo con {MIN_LOTES_AJUSTE_ORIGEN} lotes o más.
        </p>
        <p className="text-zinc-400 mb-8">
          El efecto es real pero moderado: en vaca va de −6,5% a +7,9% según el origen.{' '}
          <span className="text-zinc-200">Es entre cuatro y seis veces menor que la amplitud de la banda</span>, lo que
          dice algo importante sobre este mercado: la varianza grande no es geográfica, es de calidad y composición
          del lote. Por eso el producto es la banda y el origen un ajuste secundario, siempre declarado como
          ajuste de nuestra base y nunca como precio oficial provincial.
        </p>

        {/* ── Límites ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">6. Límites</h2>
        <ul className="text-zinc-400 space-y-2 mb-8 list-disc pl-5">
          <li>
            <span className="text-zinc-200">Cobertura.</span> El VR observa el Mercado Agroganadero de Cañuelas,
            aproximadamente el 12% del rodeo nacional. El ~71% que opera fuera de pantalla no está acá.
          </li>
          <li>
            <span className="text-zinc-200">Profundidad histórica.</span> La serie de lote arranca en mayo de 2026.
            La banda describe la dispersión <em>actual</em>; no es una referencia histórica ni captura estacionalidad
            ni ciclo. Para serie larga está el INMAG, que es un punto diario desde 2015 — son dos activos distintos
            y no hay que confundirlos.
          </li>
          <li>
            <span className="text-zinc-200">No es una tasación.</span> El VR es una referencia de mercado. El precio
            final de una operación lo define el remate.
          </li>
          <li>
            <span className="text-zinc-200">Categorías de descarte excluidas.</span> Vaca muerta y vaca caída se
            excluyen del cálculo: son operaciones de descarte cuyo precio no describe el mercado.
          </li>
        </ul>

        {/* ── Versionado ── */}
        <h2 className="text-zinc-100 text-lg font-medium mt-10 mb-3">7. Versionado</h2>
        <p className="text-zinc-400 mb-8">
          Esta metodología es <span className="text-zinc-200">{VR_METODOLOGIA}</span>. Cualquier cambio en el
          cálculo incrementa la versión, y las valuaciones emitidas bajo una versión anterior siguen siendo
          reproducibles con la metodología con la que se emitieron. El número de versión viaja en cada
          respuesta de la API y del servidor MCP.
        </p>

        <div className="border-t border-zinc-800 pt-6 mt-10 text-xs text-zinc-500">
          <p className="mb-2">
            ¿Consultas metodológicas o uso institucional?{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">agro@memola.com.ar</a>
          </p>
          <p>
            Ver también:{' '}
            <Link href="/metodologia" className="text-sky-400 hover:underline">metodología general de precios e índices</Link>
            {' · '}
            <Link href="/mercado" className="text-sky-400 hover:underline">el mercado hoy</Link>
          </p>
        </div>
      </div>
    </>
  )
}
