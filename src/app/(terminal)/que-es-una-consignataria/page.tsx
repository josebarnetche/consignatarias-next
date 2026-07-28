import { Metadata } from 'next'
import Link from 'next/link'
import GuiaConsignatariaDownload from '@/components/GuiaConsignatariaDownload'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'

/* ------------------------------------------------------------------ */
/*  Número vivo (opcional, evergreen): sirve para ejemplificar la      */
/*  comisión con un valor real y fechado, sin depender de él.          */
/* ------------------------------------------------------------------ */
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// Ejemplo de operación: novillo de 450 kg vivo a precio de mercado.
const EJEMPLO_PESO = 450
const ejemploValor = novillo * EJEMPLO_PESO
const ejemploComisionMin = Math.round(ejemploValor * 0.03)
const ejemploComisionMax = Math.round(ejemploValor * 0.05)

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Consignataria de hacienda',
    description:
      'Firma habilitada por matrícula que actúa como intermediario comercial entre el productor ganadero y el comprador (frigorífico, invernador o rematador). Vende la hacienda por cuenta y orden del productor, organiza el remate o la operación particular, garantiza la cobranza y cobra una comisión sobre el valor de venta.',
    url: `${BASE_URL}/consignatarias`,
  },
  {
    name: 'Comisión de venta',
    description:
      'Honorario que cobra la consignataria por intermediar la operación, calculado como porcentaje sobre el valor de venta de la hacienda —habitualmente 2–4% (frecuentemente ~3%), a veces hasta 5%, más IVA—. Se descuenta de la liquidación al productor, junto con los gastos de remate (fletes, sanidad, guías, sellados).',
  },
  {
    name: 'Remate de hacienda',
    description:
      'Subasta pública de ganado en pie organizada por una consignataria habilitada, donde los compradores pujan por lotes y el martillero adjudica al mejor postor. Puede ser presencial, televisado o por streaming.',
    url: `${BASE_URL}/remates`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — las preguntas copian lo que la gente escribe / le pregunta   */
/*  a un asistente. Cada respuesta arranca con el dato.                */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es una consignataria?',
    answer:
      'Una consignataria de hacienda es la firma habilitada por matrícula que actúa como intermediario comercial entre el productor ganadero y el comprador (frigorífico, invernador o rematador). Vende la hacienda por cuenta y orden del productor —no compra el ganado para sí— y cobra una comisión sobre el valor de venta.',
  },
  {
    question: '¿Cuánto cobra una consignataria de hacienda?',
    answer: `Una consignataria cobra una comisión sobre el valor de venta de la hacienda —habitualmente 2–4% (frecuentemente ~3%), a veces hasta 5%, más IVA—, que se descuenta de la liquidación al productor junto con los gastos de remate (fletes, sanidad, guías, sellados). Ejemplo con precio actual: un novillo de ${EJEMPLO_PESO} kg vivo a $${fmt(novillo)}/kg (INMAG del ${INMAG_DATE}) vale $${fmt(ejemploValor)}; la comisión ronda entre $${fmt(ejemploComisionMin)} (3%) y $${fmt(ejemploComisionMax)} (5%).`,
  },
  {
    question: '¿En qué se diferencia de un frigorífico?',
    answer:
      'La consignataria es un intermediario: vende la hacienda de terceros y cobra comisión, sin tomar la propiedad del ganado. El frigorífico es un comprador y procesador: adquiere la hacienda —muchas veces a través de la propia consignataria— para faenarla y comercializar la carne. La consignataria representa al vendedor; el frigorífico es el que compra.',
  },
  {
    question: '¿Qué es la comisión de venta?',
    answer:
      'La comisión de venta es el honorario que cobra la consignataria por intermediar la operación: un porcentaje sobre el valor de venta de la hacienda, habitualmente 2–4% (frecuentemente ~3%), a veces hasta 5%, más IVA. Es distinta de los gastos de remate (fletes, sanidad, guías, sellados), que también se descuentan de la liquidación al productor.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es una consignataria de hacienda y cuánto cobra',
  description:
    'Una consignataria de hacienda es el intermediario entre el productor y el comprador: vende la hacienda por cuenta y orden del productor y cobra una comisión, habitualmente 2–4% (a veces hasta 5%) más IVA sobre el valor de venta. Definición, diferencia con frigorífico y rematador, cómo cobra y marco de matrícula.',
  keywords: [
    'qué es una consignataria',
    'que es una consignataria de hacienda',
    'cuánto cobra una consignataria',
    'comisión consignataria hacienda',
    'consignataria de ganado',
    'diferencia consignataria y frigorífico',
    'comisión de venta hacienda',
    'intermediario ganadero',
    'matrícula consignataria',
  ],
  openGraph: {
    title: 'Qué es una consignataria de hacienda y cuánto cobra',
    description:
      'Definición de consignataria de hacienda: intermediario entre productor y comprador que cobra una comisión habitualmente de 2–4% (hasta 5%) más IVA sobre el valor de venta. Diferencia con frigorífico y rematador.',
    url: `${BASE_URL}/que-es-una-consignataria`,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: `${BASE_URL}/que-es-una-consignataria`,
  },
}

export default function QueEsUnaConsignatariaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-una-consignataria" sectionName="Qué es una consignataria" />
      <DefinedTermSetSchema
        name="Consignataria de hacienda — definiciones"
        description="Definiciones citables de consignataria de hacienda, comisión de venta y remate en el mercado ganadero argentino."
        url={`${BASE_URL}/que-es-una-consignataria`}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={`${BASE_URL}/que-es-una-consignataria`}
        headline="Qué es una consignataria de hacienda y cuánto cobra"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es una consignataria de hacienda y cuánto cobra
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          Una consignataria de hacienda es la firma que actúa como intermediario comercial entre el
          productor ganadero y el comprador (frigorífico, invernador o rematador), vende la hacienda
          por cuenta y orden del productor y cobra una comisión —habitualmente 2–4% (frecuentemente
          ~3%), a veces hasta 5%, más IVA, sobre el valor de venta—.
        </p>

        <p className="text-zinc-400 mb-8">
          A precio de mercado actual, la comisión es tangible: un novillo de {EJEMPLO_PESO} kg vivo a
          ${fmt(novillo)}/kg (INMAG del {INMAG_DATE}) vale ${fmt(ejemploValor)}; sobre esa operación la
          consignataria cobra entre ${fmt(ejemploComisionMin)} (3%) y ${fmt(ejemploComisionMax)} (5%),
          más los gastos de remate. La comisión no la fija esta página: la acuerda cada firma con el
          productor. Estos son los valores de referencia del mercado.
        </p>

        {/* Qué hace */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué hace una consignataria</h2>
        <p className="text-zinc-400 mb-4">
          La consignataria no compra la hacienda para sí: la vende por cuenta y orden del productor.
          Concentra la oferta de varios establecimientos, arma los lotes por categoría y peso,
          organiza el remate (presencial, televisado o por streaming) o cierra la operación de forma
          particular, adjudica al mejor postor a través del martillero, garantiza la cobranza al
          comprador y liquida el neto al productor. Por ese servicio de intermediación cobra la
          comisión.
        </p>

        {/* Lead magnet: la guía visual en PDF */}
        <div className="mb-8">
          <GuiaConsignatariaDownload />
        </div>

        {/* Diferencia con frigorífico y rematador */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Diferencia con un frigorífico y con el rematador
        </h2>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Frigorífico:</span> es un comprador y procesador. Adquiere
            la hacienda —muchas veces a través de la propia consignataria— para faenarla y
            comercializar la carne. Toma la propiedad del ganado; la consignataria no.
          </li>
          <li>
            <span className="text-zinc-300">Rematador / martillero:</span> es el profesional
            matriculado que conduce la subasta y adjudica los lotes al mejor postor. Actúa en
            representación de la consignataria durante el remate; no es el que asume la operación
            comercial ni la cobranza.
          </li>
          <li>
            <span className="text-zinc-300">Consignataria:</span> representa al vendedor (el
            productor), asume la operación comercial, garantiza la cobranza y cobra comisión. Es el
            nexo entre la oferta y la demanda.
          </li>
        </ul>

        {/* Cómo cobra */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo cobra: comisión y gastos</h2>
        <p className="text-zinc-400 mb-4">
          El ingreso de la consignataria es la comisión de venta: un porcentaje sobre el valor de
          venta de la hacienda, habitualmente 2–4% (frecuentemente ~3%), a veces hasta 5%, más IVA.
          Se descuenta de la liquidación al
          productor. Aparte de la comisión, de esa liquidación también se descuentan los gastos de
          remate —fletes, sanidad, guías (provincial/municipal), DT-e (SENASA), sellados e IVA
          cuando corresponde—. El productor
          recibe el neto: valor de venta menos comisión menos gastos.
        </p>

        {/* Marco / matrícula */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Marco legal: la matrícula</h2>
        <p className="text-zinc-400 mb-8">
          Para intermediar en la compraventa de hacienda, la consignataria debe estar habilitada por
          matrícula ante el registro público correspondiente. La matrícula acredita que la firma está
          autorizada legalmente para operar y responder por las operaciones que intermedia. Sin esa
          habilitación, la actividad de consignación de ganado no es legal.
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
          <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors">
            Directorio de consignatarias →
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
          <Link href="/como-elegir-consignataria" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo elegir una consignataria
          </Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">
            Calendario de remates
          </Link>
          <Link href="/mercado" className="text-zinc-500 hover:text-accent transition-colors">
            Precio del novillo hoy
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Comisión de referencia del mercado; cada firma la acuerda con el productor. Actualizado:
          {' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
