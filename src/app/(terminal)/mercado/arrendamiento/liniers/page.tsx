import { Metadata } from 'next'
import Link from 'next/link'
import { OfrecerInforme } from '@/components/productos/OfrecerInforme'
import marketPrices from '@/lib/data/market-prices.json'
import {
  SectionBreadcrumbSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
  DefinedTermSetSchema,
} from '@/components/seo/JsonLd'

// SSG con rebuild diario — el JSON estático lo actualiza el scraper 14:00 ART → git commit → Vercel.
export const revalidate = 86400

// --- Números vivos (desestructurados a nivel de módulo para interpolar en metadata y JSX) ---
const arrendamiento = marketPrices.arrendamientoOficial
const inmag = marketPrices.inmag
const lastUpdate = marketPrices.lastUpdate

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const fmt2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const URL = 'https://www.consignatarias.com.ar/mercado/arrendamiento/liniers'

// --- Datos de citabilidad (const a nivel módulo) ---
const FAQ = [
  {
    // La query "¿Existe todavía el índice de Liniers?" es la duda literal del arrendador
    // que busca la vieja referencia. Respuesta con el número vivo del sucesor operativo.
    question: '¿Existe todavía el índice de Liniers?',
    answer: `No como mercado físico: el Mercado de Liniers cerró y sus operaciones migraron al Mercado Agroganadero (MAG) de Cañuelas, que hoy es la referencia sucesora. El índice novillo para arrendamiento de referencia Liniers/MAG es de $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}. Cuando un contrato dice "índice novillo Liniers", en la práctica se liquida con el INMAG del Mercado Agroganadero, que hoy cotiza el kilo vivo de novillo a $${fmt(inmag.current)} (${inmag.change >= 0 ? '+' : ''}${inmag.change}% respecto de la jornada previa).`,
  },
  {
    // 20-09-2026: esta pregunta era genérica ("¿Cuánto es el arrendamiento por kg hoy?") y hacía que
    // esta página compitiera con /mercado/arrendamiento por las búsquedas sin plaza. Ahora es de Liniers.
    question: '¿Con qué valor se liquida un contrato que dice "índice Liniers"?',
    answer: `Con el índice sugerido para arrendamientos del Mercado Agroganadero, que es el sucesor operativo de Liniers: $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}, y para la factura el cierre mensual. El valor del día con su serie está en la página del índice novillo arrendamiento; el cierre que se liquida, en la del índice mensual.`,
  },
  {
    question: '¿Por qué el índice de Liniers hoy es el del Mercado Agroganadero?',
    answer: `Tras el cierre del Mercado de Liniers, el remate en pie de la zona de Buenos Aires se concentró en el Mercado Agroganadero (Cañuelas). El índice INMAG que publica el MAG es el sucesor operativo de la referencia que antes daba Liniers, por lo que los contratos que citan "Liniers" se liquidan con este valor: $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}.`,
  },
]

const TERMS = [
  {
    name: 'Arrendamiento rural en kg de novillo',
    description:
      'Modalidad de contrato de arrendamiento rural en Argentina en la que el canon se pacta en kilos de novillo por hectárea y se liquida multiplicando esos kilos por el precio del novillo (índice de referencia) y por la superficie. Históricamente se citaba el índice del Mercado de Liniers; tras su cierre la referencia operativa es el INMAG del Mercado Agroganadero de Cañuelas.',
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
  },
]

export const metadata: Metadata = {
  title: `Índice Arrendamiento Liniers: dónde se publica hoy — $${fmt(arrendamiento.index)}/kg`,
  description: `El índice novillo para arrendamiento de referencia Mercado de Liniers es de $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}. Tras el cierre de Liniers, la referencia migró al Mercado Agroganadero (Cañuelas): este INMAG es su sucesor operativo. Calculá el canon de tu campo.`,
  keywords: [
    'precio novillo arrendamiento mercado de liniers',
    'indice novillo arrendamiento mensual liniers',
    'índice novillo arrendamiento liniers',
    'precio novillo liniers arrendamiento',
    'arrendamiento rural liniers',
    'indice liniers arrendamiento hoy',
    'mercado de liniers arrendamiento',
    'novillo liniers canon',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Índice Arrendamiento Liniers: dónde se publica hoy — $${fmt(arrendamiento.index)}/kg`,
    description: `Referencia Liniers/Mercado Agroganadero para arrendamientos rurales: $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}. El sucesor operativo del viejo índice de Liniers.`,
    url: URL,
    type: 'website',
  },
  alternates: { canonical: URL },
}

export default function ArrendamientoLiniersPage() {
  const periodStr = `${arrendamiento.periodStart}/${arrendamiento.periodEnd}`

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DatasetSchema
        name="Índice Novillo Arrendamiento — Referencia Liniers / Mercado Agroganadero"
        description={`Serie del índice del novillo usado como referencia para contratos de arrendamiento rural. Sucesor operativo del índice del Mercado de Liniers tras su cierre. Valor vigente: $${fmt(arrendamiento.index)}/kg al ${arrendamiento.date}.`}
        url={URL}
        keywords={[
          'índice arrendamiento liniers',
          'mercado de liniers',
          'INMAG',
          'arrendamiento rural',
          'canon en kg de novillo',
          'mercado agroganadero',
        ]}
        dateModified={arrendamiento.date}
        variableMeasured={{
          name: 'Índice novillo para arrendamiento',
          unitText: 'ARS/kg vivo',
          value: arrendamiento.index,
          observationDate: arrendamiento.date,
        }}
        temporalCoverage="2015-01-05/.."
        updateFrequency="daily"
      />
      <DefinedTermSetSchema
        name="Arrendamiento rural en kg de novillo"
        description="Términos de referencia del arrendamiento rural pactado en kilos de novillo y del índice sucesor del Mercado de Liniers."
        url={URL}
        terms={TERMS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={URL}
        headline={`Índice novillo arrendamiento Liniers hoy: $${fmt(arrendamiento.index)}/kg`}
      />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8" aria-label="Breadcrumb">
          <Link href="/mercado" className="hover:text-accent transition-colors">Mercado</Link>
          <span>/</span>
          <Link href="/mercado/arrendamiento" className="hover:text-accent transition-colors">Arrendamiento</Link>
          <span>/</span>
          <span className="text-zinc-300">Mercado de Liniers</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 bg-sky-500/10 text-accent text-xs font-medium rounded-full border border-sky-500/20">
            ACTUALIZADO {lastUpdate}
          </span>
          <span className="text-sm text-zinc-500">Referencia Liniers / Mercado Agroganadero</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-6">
          Índice Novillo Arrendamiento — Mercado de Liniers
        </h1>

        {/* Answer-first: primera oración citable con el número vivo */}
        <p className="speakable-content text-lg text-zinc-300 leading-relaxed mb-6">
          El índice novillo para arrendamiento de referencia Liniers/Mercado Agroganadero es de{' '}
          <strong className="text-accent">${fmt2(arrendamiento.index)}/kg</strong> al {arrendamiento.date}.
          Tras el cierre del histórico <strong className="text-white">Mercado de Liniers</strong>, la
          referencia migró al <Link href="/mercado/liniers" className="text-accent hover:underline">Mercado
          Agroganadero</Link> (Cañuelas), y este índice —el <Link href="/mercado/inmag" className="text-accent hover:underline">INMAG</Link>— es
          su <strong className="text-white">sucesor operativo</strong>: cuando un contrato cita el
          &ldquo;índice novillo Liniers&rdquo;, en la práctica se liquida con este valor.
        </p>

        <p className="text-zinc-400 leading-relaxed mb-6">
          El valor del día, la serie y la calculadora están en{' '}
          <Link href="/mercado/arrendamiento" className="text-accent hover:underline">índice novillo arrendamiento hoy</Link>; el
          cierre con el que se factura, en{' '}
          <Link href="/mercado/arrendamiento/mensual" className="text-accent hover:underline">índice novillo arrendamiento mensual</Link>.
          Esta página responde una sola cosa: qué pasó con la referencia de Liniers.
        </p>

        {/* Número-hero */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Índice arrendamiento</div>
            <div className="text-3xl font-bold text-white tabular-nums">${fmt2(arrendamiento.index)}<span className="text-lg text-zinc-500">/kg</span></div>
            <div className="text-xs text-zinc-500 mt-1">al {arrendamiento.date}</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Kilo vivo novillo (INMAG)</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              ${fmt(inmag.current)}<span className="text-lg text-zinc-500">/kg</span>
            </div>
            <div className={`text-xs mt-1 ${inmag.change >= 0 ? 'text-positive' : 'text-negative'}`}>
              {inmag.change >= 0 ? '+' : ''}{inmag.change}% vs. jornada previa
            </div>
          </div>
        </div>

        {/* Contexto */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">¿Sigue existiendo el índice de Liniers?</h2>
          <div className="space-y-4 text-zinc-400 leading-relaxed">
            <p>
              El <strong className="text-white">Mercado de Liniers</strong> fue durante décadas la principal
              referencia de precio del novillo en pie de la Argentina, y muchos contratos de arrendamiento rural
              todavía citan &ldquo;el índice de Liniers&rdquo; para fijar el canon. Con su cierre, la operatoria de
              remate en pie de la zona de Buenos Aires se concentró en el{' '}
              <Link href="/mercado/liniers" className="text-accent hover:underline">Mercado Agroganadero</Link> de
              Cañuelas.
            </p>
            <p>
              Por eso, el índice que hoy hace de referencia para esos contratos es el{' '}
              <Link href="/mercado/inmag" className="text-accent hover:underline">INMAG</Link> del Mercado
              Agroganadero: es el <strong className="text-white">sucesor operativo</strong> del viejo índice de
              Liniers. El valor sugerido para arrendamientos rurales es de{' '}
              <strong className="text-white">${fmt2(arrendamiento.index)}/kg</strong> al {arrendamiento.date}
              {' '}(promedio del período {arrendamiento.periodStart} al {arrendamiento.periodEnd}:{' '}
              ${fmt2(arrendamiento.periodIndex)}/kg).
            </p>
          </div>
        </section>

        {/* Cómo se calcula */}
        <section className="mb-10 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Cómo se calcula el canon</h2>
          <p className="text-zinc-400 leading-relaxed mb-3">
            El arrendamiento en kilos de novillo se liquida así:
          </p>
          <p className="text-zinc-200 font-medium mb-3">
            Canon mensual = kg de novillo por hectárea × ${fmt(arrendamiento.index)} × hectáreas
          </p>
          <p className="text-zinc-500 text-sm">
            Para liquidar contratos suele usarse el <strong className="text-zinc-300">promedio mensual</strong> del
            índice, no el valor de un solo día. Consultá la serie completa y el cierre mensual oficial en la{' '}
            <Link href="/mercado/arrendamiento" className="text-accent hover:underline">página del índice novillo
            arrendamiento</Link>.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {FAQ.map((faq, i) => (
              <details key={i} className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <h3 className="text-white font-medium pr-4">{faq.question}</h3>
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/30 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* El puente al informe faltaba en las dos plazas: el 44% de las impresiones del
            tema (35.119 en 28 días) caía en páginas sin salida comercial, mientras el
            componente vivía sólo en la página madre. Va DESPUÉS de que la página entregó
            su respuesta, y declara qué sigue siendo gratis. */}
        <section className="mb-10">
          <OfrecerInforme
            producto="informe-canon-arrendamiento"
            desde="/mercado/arrendamiento/liniers"
            titulo="Tu contrato dice Liniers. ¿Sabés contra qué número se liquida hoy?"
            loQueAgrega={[
              'Qué paga tu zona de verdad: el rango entre el cuartil de abajo y el de arriba, y sobre cuántos casos sale.',
              'Cómo se traduce una cláusula escrita para Liniers al índice que hoy publica el Mercado Agroganadero.',
              'Las zonas vecinas, para saber si el canon que te ofrecen está adentro o afuera de lo que se paga alrededor.',
              'Cuántos años de arrendamiento hacen falta para recuperar el valor de la hectárea en esa zona.',
            ]}
            gratisAca="El índice del día, la serie y la explicación de esta página son gratis y van a seguir siéndolo."
          />
        </section>

        {/* Related */}
        <section className="grid sm:grid-cols-2 gap-4 mb-10">
          <Link href="/mercado/arrendamiento" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Índice Novillo Arrendamiento</h3>
            <p className="text-sm text-zinc-500">Serie completa, cierre mensual oficial y calculadora de canon.</p>
          </Link>
          <Link href="/mercado/liniers" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Mercado de Liniers</h3>
            <p className="text-sm text-zinc-500">Precios por categoría y remate del día en el Mercado Agroganadero.</p>
          </Link>
        </section>

        <p className="text-xs text-zinc-600 text-center">
          Fuente: {arrendamiento.source}. Serie del período {periodStr}. Actualizado el {lastUpdate}.
        </p>
      </div>
    </>
  )
}
