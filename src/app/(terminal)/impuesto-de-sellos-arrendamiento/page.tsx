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
const PAGE_URL = `${BASE_URL}/impuesto-de-sellos-arrendamiento`

/* ------------------------------------------------------------------ */
/*  Número vivo: el índice oficial de arrendamiento del MAG (kg        */
/*  novillo → pesos) sirve para ejemplificar la BASE IMPONIBLE sin     */
/*  inventar un canon. Siempre fechado con su propia fecha.            */
/* ------------------------------------------------------------------ */
const arr = marketPrices.arrendamientoOficial
const arrDate = arr.date
const arrIndex = Math.round(arr.index) // $/kg novillo sugerido para arrendamientos
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

/* Ejemplo evergreen: 100 ha × 200 kg novillo/ha/año × 3 años de plazo.
   La base imponible del sellado es el VALOR TOTAL del contrato: canon
   por todo el plazo, no un año. */
const EJ_HA = 100
const EJ_KG_HA_ANIO = 200
const EJ_ANIOS = 3
const ejKgTotales = EJ_HA * EJ_KG_HA_ANIO * EJ_ANIOS // 60.000 kg novillo
const ejBase = ejKgTotales * arrIndex // base imponible en pesos
const EJ_ALICUOTA = 0.012 // 1,2% de referencia (rango típico 1%-1,5%)
const ejSellos = Math.round(ejBase * EJ_ALICUOTA) // impuesto total
const ejMitad = Math.round(ejSellos / 2) // cuando se reparte 50/50

/* ------------------------------------------------------------------ */
/*  Alícuotas de REFERENCIA por provincia. Rango general, no precisión */
/*  falsa: cada fisco cambia su código fiscal cada año. Siempre        */
/*  "verificar en la agencia de recaudación provincial vigente".       */
/* ------------------------------------------------------------------ */
const ALICUOTAS = [
  { provincia: 'Buenos Aires', agencia: 'ARBA', referencia: '~1% a 1,5%' },
  { provincia: 'Córdoba', agencia: 'Rentas Córdoba', referencia: '~1,2% a 1,5%' },
  { provincia: 'Santa Fe', agencia: 'API Santa Fe', referencia: '~1% a 1,5%' },
  { provincia: 'Entre Ríos', agencia: 'ATER', referencia: '~1% a 1,5%' },
  { provincia: 'La Pampa', agencia: 'DGR La Pampa', referencia: '~1% a 1,2%' },
  { provincia: 'Corrientes', agencia: 'DGR Corrientes', referencia: '~1% a 1,5%' },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Impuesto de sellos',
    description:
      'Tributo provincial (no nacional) que grava la instrumentación de actos y contratos onerosos, entre ellos el contrato de arrendamiento rural. Se calcula aplicando una alícuota provincial —que ronda el 1% al 1,5% según la jurisdicción— sobre el valor total del contrato, y suele repartirse por mitades entre las partes salvo pacto en contrario.',
    url: PAGE_URL,
  },
  {
    name: 'Base imponible',
    description:
      'Monto sobre el que se aplica la alícuota del impuesto de sellos. En un arrendamiento rural es el valor económico total del contrato: el canon multiplicado por todo el plazo pactado (no por un solo año). Si el canon se fija en kilos de novillo, se lo convierte a pesos con un valor de referencia para determinar la base.',
    url: PAGE_URL,
  },
  {
    name: 'Contrato de arrendamiento rural',
    description:
      'Contrato por el cual el arrendador cede a un tercero (arrendatario) el uso y goce de un predio rural para explotación agropecuaria a cambio de un precio en dinero (canon), frecuentemente expresado en quintales de soja o kilos de novillo. Es un acto oneroso alcanzado por el impuesto de sellos provincial.',
    url: `${BASE_URL}/mercado/arrendamiento`,
  },
  {
    name: 'Alícuota',
    description:
      'Porcentaje que fija cada provincia en su código fiscal para calcular el impuesto de sellos sobre la base imponible. Para contratos rurales suele ubicarse entre el 1% y el 1,5%, pero varía por jurisdicción y año, por lo que debe verificarse en la agencia de recaudación provincial vigente.',
    url: PAGE_URL,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Quién paga el sellado del contrato de arrendamiento?',
    answer:
      'El impuesto de sellos del arrendamiento rural suele pagarse por mitades (50% el arrendador y 50% el arrendatario), salvo que el contrato pacte otra proporción. Las partes son solidariamente responsables ante el fisco provincial: si una no paga su mitad, la agencia de recaudación puede reclamar el total a cualquiera de las dos.',
  },
  {
    question: '¿Sobre qué monto se calcula el impuesto de sellos?',
    answer: `Se calcula sobre el canon total de todo el plazo del contrato, no sobre un año. La base imponible es el valor económico completo: canon anual multiplicado por la cantidad de años. Ejemplo con el índice oficial de arrendamiento del MAG (${arrDate}): un contrato de ${EJ_HA} ha a ${EJ_KG_HA_ANIO} kg de novillo por hectárea y año, por ${EJ_ANIOS} años, son ${fmt(ejKgTotales)} kg × $${fmt(arrIndex)}/kg = base de $${fmt(ejBase)}; una alícuota de referencia del 1,2% da un sellado total de ~$${fmt(ejSellos)}.`,
  },
  {
    question: '¿Cuánto tiempo tengo para sellar el contrato?',
    answer:
      'El plazo típico para presentar y pagar el impuesto de sellos es de 15 días hábiles desde la firma del contrato (varía según la provincia; algunas fijan 10 o 30 días). Pasado ese plazo el sellado sigue siendo posible pero con recargos, intereses y eventuales multas. El plazo exacto y las sanciones deben confirmarse con la agencia de recaudación provincial y un contador.',
  },
  {
    question: '¿La alícuota es la misma en todas las provincias?',
    answer:
      'No. El impuesto de sellos es provincial: cada jurisdicción fija su propia alícuota en su código fiscal, que para contratos rurales suele ubicarse entre el 1% y el 1,5%. El campo tributa donde está ubicado el inmueble. Por eso la alícuota exacta debe verificarse siempre en la agencia de recaudación de la provincia donde está el campo.',
  },
]

export const metadata: Metadata = {
  title: 'Impuesto de sellos en el arrendamiento de campo: alícuota por provincia',
  description:
    'El impuesto de sellos del arrendamiento rural es un tributo provincial que grava el valor total del contrato (canon × todo el plazo) con una alícuota que ronda el 1% al 1,5% según la provincia, y suele pagarse por mitades entre las partes. Mecánica, base imponible, plazos y alícuotas de referencia por provincia.',
  keywords: [
    'impuesto de sellos arrendamiento de campo',
    'impuesto de sellos arrendamiento rural',
    'sellado contrato de arrendamiento',
    'alícuota sellos arrendamiento',
    'quién paga el sellado del arrendamiento',
    'base imponible sellos arrendamiento',
    'sellos ARBA arrendamiento rural',
    'impuesto de sellos contrato agropecuario',
    'sellar contrato de campo',
  ],
  openGraph: {
    title: 'Impuesto de sellos en el arrendamiento de campo: alícuota por provincia',
    description:
      'Tributo provincial sobre el valor total del contrato (canon × todo el plazo), alícuota de ~1% a 1,5% según la provincia, repartido por mitades entre arrendador y arrendatario. Mecánica, base imponible y plazos.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ImpuestoDeSellosArrendamientoPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="impuesto-de-sellos-arrendamiento"
        sectionName="Impuesto de sellos en el arrendamiento"
      />
      <DefinedTermSetSchema
        name="Impuesto de sellos en el arrendamiento rural — definiciones"
        description="Definiciones citables de impuesto de sellos, base imponible, contrato de arrendamiento rural y alícuota, aplicadas al arrendamiento de campo en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Impuesto de sellos en el arrendamiento de campo: alícuota por provincia"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Impuesto de sellos en el arrendamiento de campo: alícuota por provincia
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El impuesto de sellos sobre un contrato de arrendamiento rural es un tributo provincial que
          grava el valor total del contrato (canon × todo el plazo) con una alícuota que ronda el 1% al
          1,5% según la provincia, y suele pagarse por mitades entre arrendador y arrendatario.
        </p>

        <p className="text-zinc-400 mb-8">
          No es un impuesto nacional: lo fija y lo cobra cada provincia donde está ubicado el campo, con
          su propia alícuota y su propio código fiscal. La mecánica general es la misma en todas: la{' '}
          <span className="text-zinc-300">base imponible es el monto total del contrato</span> —el canon
          multiplicado por todos los años del plazo, no por uno solo—, sobre esa base se aplica la{' '}
          <span className="text-zinc-300">alícuota provincial</span>, y el resultado{' '}
          <span className="text-zinc-300">suele repartirse 50/50</span> entre las partes salvo que se
          pacte otra cosa. Esta página no fija alícuotas ni asesora: presenta la mecánica y valores de
          referencia; confirmá siempre con el fisco provincial y un contador.
        </p>

        {/* Tabla answer-first por provincia */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Alícuota de referencia por provincia
        </h2>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400">
                <th className="py-2 pr-4 font-medium">Provincia</th>
                <th className="py-2 pr-4 font-medium">Agencia de recaudación</th>
                <th className="py-2 font-medium">Alícuota de referencia (contratos rurales)</th>
              </tr>
            </thead>
            <tbody>
              {ALICUOTAS.map((row) => (
                <tr key={row.provincia} className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-zinc-300">{row.provincia}</td>
                  <td className="py-2 pr-4 text-zinc-500">{row.agencia}</td>
                  <td className="py-2 text-zinc-400">{row.referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mb-8">
          Referencia orientativa; verificar en la agencia de recaudación provincial vigente. Las
          alícuotas cambian por código fiscal y ejercicio, y pueden existir montos mínimos, tasas
          fijas o adicionales que no se reflejan en un rango general.
        </p>

        {/* Ejemplo con número vivo */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Ejemplo de cálculo</h2>
        <p className="text-zinc-400 mb-3">
          Tomemos un contrato de <span className="text-zinc-300">{EJ_HA} ha</span> con un canon de{' '}
          {EJ_KG_HA_ANIO} kg de novillo por hectárea y por año, a <span className="text-zinc-300">{EJ_ANIOS} años</span>{' '}
          de plazo. El canon total en kilos es {EJ_HA} × {EJ_KG_HA_ANIO} × {EJ_ANIOS} ={' '}
          <span className="text-zinc-300">{fmt(ejKgTotales)} kg</span> de novillo. Para llevarlo a pesos
          usamos el índice oficial de arrendamiento del Mercado Agroganadero (referencia sugerida, {arrDate}):
        </p>
        <ul className="text-zinc-400 mb-3 space-y-1 list-disc pl-5">
          <li>
            Base imponible = {fmt(ejKgTotales)} kg × ${fmt(arrIndex)}/kg ={' '}
            <span className="text-zinc-300">${fmt(ejBase)}</span>
          </li>
          <li>
            Sellos ~1,2% (alícuota de referencia) ={' '}
            <span className="text-zinc-300">${fmt(ejSellos)}</span> en total
          </li>
          <li>
            Repartido 50/50 = <span className="text-zinc-300">${fmt(ejMitad)}</span> cada parte
          </li>
        </ul>
        <p className="text-zinc-500 text-xs mb-8">
          El valor del kilo de novillo es de referencia de mercado (Mercado Agroganadero — índice
          sugerido para arrendamientos, {arrDate}); no lo fija esta página. El resultado es ilustrativo:
          la alícuota real y la base concreta dependen de la provincia y del texto del contrato.
        </p>

        {/* Qué es la base imponible */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué es la base imponible</h2>
        <p className="text-zinc-400 mb-4">
          La base imponible es el monto sobre el que se aplica la alícuota. En un arrendamiento rural es
          el <span className="text-zinc-300">valor total del contrato por todo el plazo</span>: canon
          anual multiplicado por la cantidad de años. Un error frecuente es sellar solo sobre un año —el
          fisco calcula sobre el compromiso económico completo del contrato—. Cuando el canon se pacta en
          quintales de soja o kilos de novillo, se lo convierte a pesos con un valor de referencia para
          fijar la base; por eso conviene dejar clara en el contrato la fórmula de conversión.
        </p>

        {/* Quién paga */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Quién paga el impuesto de sellos</h2>
        <p className="text-zinc-400 mb-4">
          Por defecto se reparte <span className="text-zinc-300">por mitades entre arrendador y
          arrendatario</span>, salvo que el contrato disponga otra proporción. Ante el fisco provincial
          ambas partes son <span className="text-zinc-300">solidariamente responsables</span>: la agencia
          de recaudación puede exigir el total a cualquiera de las dos, con independencia del reparto
          interno pactado. Por eso conviene que el contrato deje escrito quién sella y en qué proporción,
          y guardar el comprobante de pago.
        </p>

        {/* Plazo para sellar */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Plazo para sellar el contrato</h2>
        <p className="text-zinc-400 mb-4">
          El plazo habitual es de <span className="text-zinc-300">alrededor de 15 días hábiles desde la
          firma</span>, aunque varía por provincia (algunas fijan 10 o 30 días). Sellar fuera de término
          es posible pero genera <span className="text-zinc-300">recargos, intereses y multas</span>. El
          sellado también es la prueba de que el instrumento tributó: un contrato sin sellar puede
          complicar su uso como prueba en trámites o reclamos. El plazo y las sanciones concretas se
          confirman con la agencia provincial y el contador.
        </p>

        {/* Exenciones frecuentes */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Exenciones frecuentes</h2>
        <p className="text-zinc-400 mb-8">
          Varias provincias contemplan exenciones o alícuotas reducidas para ciertos actos: contratos de
          bajo monto, operaciones con el Estado, algunos regímenes de promoción agropecuaria o de pequeños
          productores, o instrumentos ya alcanzados por otro tributo. Las exenciones no son automáticas ni
          uniformes: dependen del código fiscal de cada provincia y del año, y muchas requieren encuadrar
          expresamente el contrato. Antes de asumir que un arrendamiento está exento, verificalo con la
          agencia de recaudación provincial y un contador.
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
          <Link
            href="/como-se-calcula-el-canon-de-arrendamiento"
            className="text-zinc-500 hover:text-accent transition-colors"
          >
            Cómo se calcula el canon de arrendamiento →
          </Link>
          <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Índice de arrendamiento (MAG)
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer — disclaimer fiscal reforzado */}
        <p className="text-zinc-500 text-xs mt-4">
          Esta página tiene fines informativos y no constituye asesoramiento fiscal, legal ni contable.
          El impuesto de sellos es provincial: las alícuotas, plazos y exenciones cambian por jurisdicción
          y ejercicio. Los valores son de referencia del mercado y no son fijados por esta página. Antes de
          firmar o sellar un contrato, confirmá la alícuota vigente con la agencia de recaudación de la
          provincia donde está el campo y con un contador matriculado. Actualizado: {lastUpdate} (índice de
          arrendamiento del {arrDate}). Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
