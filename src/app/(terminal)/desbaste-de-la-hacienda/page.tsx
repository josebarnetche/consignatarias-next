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
const PAGE_URL = `${BASE_URL}/desbaste-de-la-hacienda`

// Números vivos — interpolados en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')
// Ejemplo testigo: un novillo de 450 kg vivo con 5% de desbaste.
const pesoVivoTipo = 450
const desbastePctTipo = 5
const kgMermaTipo = (pesoVivoTipo * desbastePctTipo) / 100 // 22,5 kg
const kgNetosTipo = pesoVivoTipo - kgMermaTipo // 427,5 kg
const valorConMerma = Math.round(kgNetosTipo * novillo)
const valorSinMerma = Math.round(pesoVivoTipo * novillo)
const diferenciaMerma = valorSinMerma - valorConMerma

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Pesar en balanza al cargar',
    text: 'La hacienda pasa por la balanza en el campo, en el momento de embarcar. Ese registro es el peso vivo de origen —el peso bruto del animal en pie, con el estómago según el tiempo de ayuno—. Es el número sobre el que se aplica todo el cálculo, por eso conviene que el pesaje quede documentado y firmado por ambas partes.',
    url: `${BASE_URL}/cuanto-pesa-un-novillo`,
  },
  {
    name: 'Aplicar el porcentaje de desbaste pactado',
    text: 'Sobre el peso de balanza se aplica el porcentaje de desbaste acordado antes de la operación. El rango habitual va del 3% al 8% según la distancia del flete y las horas de ayuno; a más viaje y más ayuno, mayor la merma pactada. Este porcentaje es dinero puro que se negocia: conviene dejarlo por escrito.',
  },
  {
    name: 'Restar los kilos de merma',
    text: 'Se multiplica el peso vivo por el porcentaje de desbaste y el resultado se resta del peso de balanza. Lo que queda es el peso neto o peso comercial sobre el que se factura. Ejemplo: 450 kg vivo × 5% = 22,5 kg de merma, y quedan 427,5 kg netos.',
  },
  {
    name: 'Multiplicar los kilos netos por el precio por kilo',
    text: 'El importe de la hacienda sale de multiplicar los kilos netos —no los kilos de balanza— por el precio por kilo vivo acordado. El desbaste actúa exactamente sobre esta cuenta: cada punto de merma es un porcentaje menos de kilos facturados sobre el mismo precio por kilo.',
    url: `${BASE_URL}/precio-del-novillo-en-pie`,
  },
  {
    name: 'Verificar el desbaste en la liquidación',
    text: 'La liquidación de la consignataria debe mostrar el peso de balanza, el porcentaje de desbaste aplicado, los kilos netos y el precio por kilo. Conviene rehacer la cuenta: peso de balanza menos merma, por precio. Si el porcentaje descontado no coincide con lo pactado, es un reclamo legítimo.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Desbaste',
    description:
      'Porcentaje que se descuenta del peso vivo de la hacienda para pasar del kilo de balanza al kilo neto que se factura. Compensa el peso que el animal pierde por ayuno y viaje y, en el uso comercial, cualquier ajuste de peso pactado entre las partes. Es un descuento sobre kilos, no sobre el precio por kilo.',
    url: PAGE_URL,
  },
  {
    name: 'Merma',
    description:
      'Kilos que pierde la hacienda entre el pesaje de origen y el peso comercial, expresados como porcentaje del peso vivo. En la práctica comercial argentina, merma y desbaste se usan como sinónimos: ambos nombran el descuento de peso que se resta antes de facturar.',
    url: PAGE_URL,
  },
  {
    name: 'Peso vivo',
    description:
      'Peso del animal en pie, sobre la báscula, antes de aplicar cualquier descuento. Es la base sobre la que se calcula el desbaste: el porcentaje de merma se toma de este número para obtener el peso neto.',
    url: `${BASE_URL}/cuanto-pesa-un-novillo`,
  },
  {
    name: 'Peso de balanza',
    description:
      'Registro bruto del peso vivo tomado en la báscula al momento de cargar o entregar la hacienda. Es el número de partida de la operación; el peso neto se obtiene restándole el porcentaje de desbaste pactado.',
    url: PAGE_URL,
  },
  {
    name: 'Ayuno / oreo',
    description:
      'Tiempo que el animal pasa sin comer ni beber antes o durante el traslado. Cuanto más largo el ayuno, más contenido digestivo pierde el animal y más se justifica un desbaste alto, porque el peso de balanza incluye menos «relleno» y más peso real.',
    url: PAGE_URL,
  },
  {
    name: 'Desbaste comercial vs. físico',
    description:
      'El desbaste físico es la merma real que el animal pierde por ayuno y viaje —lo que efectivamente baja la balanza—. El desbaste comercial es el porcentaje que las partes acuerdan descontar por contrato, que puede coincidir o no con la merma física. La diferencia entre ambos es puro precio negociado.',
    url: PAGE_URL,
  },
]

// FAQ — answer-first, interpola números vivos. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Cuánto es el desbaste normal de la hacienda?',
    answer: `El desbaste normal de la hacienda va del 3% al 8% del peso vivo, según la distancia del flete y las horas de ayuno: cuanto más largo el viaje y más prolongado el ayuno, mayor la merma pactada. Un valor frecuente en operaciones de corta y media distancia ronda el 4% al 5%. Sobre un novillo de ${pesoVivoTipo} kg vivo, un 5% son ${fmt(kgMermaTipo)} kg menos y quedan ${fmt(kgNetosTipo)} kg netos; a $${fmt(novillo)}/kg vivo (${INMAG_DATE}, precio de referencia del mercado INMAG/MAG, no fijado por esta página) esa merma equivale a unos $${fmt(diferenciaMerma)}. Es un ejemplo orientativo, no una tarifa.`,
  },
  {
    question: '¿Por qué me descuentan kilos del peso de balanza?',
    answer:
      'Se descuentan kilos porque el peso de balanza al cargar incluye contenido digestivo y agua que el animal pierde durante el ayuno y el viaje: al llegar a destino pesa menos. El desbaste ajusta ese peso «de más» para que el comprador pague por kilos que representan carne y no relleno. En el uso comercial también cubre el riesgo de que el animal siga perdiendo peso hasta la faena. El punto clave es que el porcentaje se pacta de antemano, no lo fija esta página.',
  },
  {
    question: '¿El desbaste se puede negociar?',
    answer: `Sí, el desbaste se negocia y es dinero puro para el productor: cada punto de merma es un porcentaje de kilos que se descuenta antes de facturar sobre el mismo precio por kilo. Sobre un lote a $${fmt(novillo)}/kg vivo (${lastUpdate}), la diferencia entre pactar 3% y 8% de desbaste sobre un novillo de ${pesoVivoTipo} kg es de varios kilos por cabeza, que multiplicados por todo el lote pesan en la liquidación. Conviene acordar el porcentaje por escrito y verificar que la liquidación aplique exactamente lo pactado.`,
  },
  {
    question: '¿Desbaste y merma son lo mismo?',
    answer:
      'En la práctica comercial argentina, desbaste y merma se usan como sinónimos: ambos nombran el porcentaje de peso que se descuenta del peso vivo antes de facturar la hacienda. Con matices, la merma alude a los kilos físicos que el animal pierde por ayuno y viaje (merma física), mientras que el desbaste suele referir al porcentaje pactado por contrato (desbaste comercial). Cuando el desbaste comercial supera la merma física real, esa diferencia es precio negociado.',
  },
]

export const metadata: Metadata = {
  title: `Qué es el desbaste (o merma) de la hacienda y cómo se calcula (${lastUpdate.slice(0, 4)})`,
  description: `El desbaste o merma es el porcentaje que se descuenta del peso vivo de la hacienda por ayuno y viaje: pasa del kilo de balanza al kilo neto que se factura. Rango habitual 3–8%. Un novillo de ${pesoVivoTipo} kg con 5% = ${fmt(kgNetosTipo)} kg netos a $${fmt(novillo)}/kg vivo (${lastUpdate}, referencia de mercado).`,
  keywords: [
    'qué es el desbaste',
    'desbaste de hacienda',
    'que es el desbaste de la hacienda',
    'merma de peso ganado',
    'cuánto descuentan de peso novillo',
    'como se calcula el desbaste',
    'desbaste o merma hacienda',
    'kilo vivo vs kilo neto',
    'peso de balanza hacienda',
    'porcentaje de desbaste normal',
  ],
  openGraph: {
    title: 'Qué es el desbaste (o merma) de la hacienda y cómo se calcula',
    description: `Porcentaje que se descuenta del peso vivo por ayuno y viaje (kilo de balanza vs. kilo neto). Rango 3–8%, con ejemplo y precio de referencia por kilo vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function DesbasteDeLaHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="desbaste-de-la-hacienda" sectionName="Desbaste" />
      <DefinedTermSetSchema
        name="Glosario del desbaste de la hacienda"
        description="Términos del desbaste o merma de la hacienda argentina: desbaste, merma, peso vivo, peso de balanza, ayuno/oreo y desbaste comercial vs. físico."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo se calcula el desbaste de la hacienda, paso a paso"
        description="Del peso de balanza al kilo neto: los cinco pasos para calcular el desbaste o merma de la hacienda y verificarlo en la liquidación."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el desbaste (o merma) de la hacienda y cómo se calcula"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/desbaste-de-la-hacienda" className="hover:text-accent transition-colors">
            Desbaste
          </Link>{' '}
          / Qué es el desbaste de la hacienda
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Qué es el desbaste (o merma) de la hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El desbaste es el <strong>porcentaje que se descuenta del peso vivo</strong> de la
          hacienda por ayuno y viaje para pasar del <strong>kilo de balanza</strong> al{' '}
          <strong>kilo neto</strong> que se factura, y ronda habitualmente el{' '}
          <strong>3% al 8%</strong> según la distancia del flete y las horas de ayuno. Es dinero puro
          que negocia el productor: sobre un novillo a ${fmt(novillo)}/kg vivo (referencia del mercado
          INMAG/MAG del {INMAG_DATE}, no fijada por esta página), cada punto de merma son kilos menos
          en la liquidación.
        </p>

        <p className="mb-4">
          En la práctica argentina, <strong>desbaste</strong> y <strong>merma</strong> se usan como
          sinónimos: nombran el peso que se resta antes de facturar. El animal se pesa en la báscula al
          cargar —ese es el <strong>peso de balanza</strong>— y sobre ese número se aplica el
          porcentaje pactado; lo que queda son los kilos netos que, multiplicados por el precio por
          kilo vivo, dan el importe de la operación. El desbaste actúa sobre los kilos, no sobre el
          precio por kilo.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Cómo se calcula</h2>
        <ol className="mb-3 space-y-3 list-none">
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
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 mb-4">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">
            Ejemplo numérico
          </p>
          <p className="text-zinc-300 text-data">
            Un novillo de <strong>{fmt(pesoVivoTipo)} kg vivo</strong> con un{' '}
            <strong>{desbastePctTipo}% de desbaste</strong> pierde {fmt(kgMermaTipo)} kg de merma y
            queda en <strong>{fmt(kgNetosTipo)} kg netos</strong>. A ${fmt(novillo)}/kg vivo (
            {INMAG_DATE}), esos {fmt(kgNetosTipo)} kg valen{' '}
            <strong>${fmt(valorConMerma)}</strong>, frente a ${fmt(valorSinMerma)} sin desbaste: la
            merma se lleva unos ${fmt(diferenciaMerma)} por cabeza. Precio de referencia del mercado
            (INMAG/MAG), no fijado por esta página.
          </p>
        </div>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Rangos habituales por distancia y ayuno
        </h2>
        <p className="mb-2">
          El porcentaje de desbaste no es fijo: crece con la distancia del flete y las horas de{' '}
          <strong>ayuno</strong>. A más viaje y más tiempo sin comer ni beber, más contenido digestivo
          pierde el animal y mayor es la merma que se justifica. Estos son órdenes de magnitud
          habituales, no una tabla oficial:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Situación</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Ayuno / viaje</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Desbaste habitual
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Venta en el campo</td>
                <td className="px-3 py-2 text-zinc-400">Sin viaje o corta distancia</td>
                <td className="px-3 py-2 text-right text-zinc-300">3% – 4%</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Media distancia</td>
                <td className="px-3 py-2 text-zinc-400">Algunas horas de flete y ayuno</td>
                <td className="px-3 py-2 text-right text-zinc-300">4% – 6%</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Larga distancia</td>
                <td className="px-3 py-2 text-zinc-400">Viaje largo y ayuno prolongado</td>
                <td className="px-3 py-2 text-right text-zinc-300">6% – 8%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Rangos orientativos, no una tarifa: el porcentaje lo acuerdan las partes en cada operación
          según distancia, ayuno y condición de la hacienda. Conviene pactarlo por escrito junto con el{' '}
          <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
            flete
          </Link>
          , porque ambos se descuentan de lo que cobra el productor.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Desbaste comercial vs. merma física
        </h2>
        <p className="mb-4">
          La <strong>merma física</strong> es lo que el animal efectivamente baja en la balanza entre
          el origen y el destino: peso real perdido por ayuno y viaje. El{' '}
          <strong>desbaste comercial</strong> es el porcentaje que las partes acuerdan descontar por
          contrato, que puede coincidir o no con esa merma real. Cuando el desbaste pactado supera la
          merma física, la diferencia es precio negociado —dinero que el productor cede o retiene según
          cómo cierre el acuerdo—. Por eso conviene tratar el porcentaje de desbaste como parte del
          precio y no como un trámite: acordarlo antes, dejarlo por escrito y verificarlo en la{' '}
          <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
            liquidación
          </Link>
          .
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
            <Link href="/cuanto-pesa-un-novillo" className="text-accent hover:text-accent-bright transition-colors">
              Cuánto pesa un novillo →
            </Link>
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo leer una liquidación →
            </Link>
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cuánto cuesta el flete →
            </Link>
            <Link href="/precio-de-tranquera" className="text-accent hover:text-accent-bright transition-colors">
              Precio de tranquera →
            </Link>
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en pie →
            </Link>{' '}
            ·{' '}
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los porcentajes de desbaste y los precios son referencias del mercado; cada operación
            acuerda su merma y el precio por kilo, y todo se detalla en la liquidación. Esta página no
            fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
