import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-el-renspa`

/* ------------------------------------------------------------------ */
/*  Número vivo (fecha de referencia): el RENSPA no expone una serie   */
/*  numérica, así que el único dato vivo es la fecha de actualización.  */
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

/* ------------------------------------------------------------------ */
/*  Alta paso a paso — mismo array para HowToSchema y HTML visible     */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Entrar a la oficina virtual de SENASA (AutoGestión)',
    text:
      'Ingresá al sistema de AutoGestión de SENASA desde la web oficial (senasa.gob.ar), en la sección de trámites en línea del productor agropecuario.',
  },
  {
    name: 'Ingresar con CUIT y Clave Fiscal AFIP nivel 3',
    text:
      'Autenticáte con tu CUIT y Clave Fiscal de AFIP con nivel de seguridad 3, y habilitá el servicio de SENASA dentro del administrador de relaciones de AFIP si aún no lo hiciste.',
  },
  {
    name: 'Declarar el establecimiento',
    text:
      'Cargá los datos del campo donde tenés la hacienda: ubicación (provincia, partido/departamento), superficie en hectáreas y las especies que vas a producir (bovinos, ovinos, porcinos, etc.).',
  },
  {
    name: 'Obtener el número RENSPA de 17 dígitos',
    text:
      'Confirmada la declaración, el sistema asigna el número RENSPA de 17 dígitos que identifica de forma única la relación entre el productor (CUIT) y ese establecimiento. Con ese código ya podés gestionar el movimiento de hacienda.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'RENSPA',
    description:
      'Registro Nacional Sanitario de Productores Agropecuarios. Código obligatorio de SENASA, de 17 dígitos, que vincula a un productor (CUIT) con un establecimiento rural determinado. Es la unidad sanitaria básica del sistema pecuario argentino: sin RENSPA no se puede mover ni vender hacienda. El trámite es gratuito.',
    url: PAGE_URL,
  },
  {
    name: 'SENASA',
    description:
      'Servicio Nacional de Sanidad y Calidad Agroalimentaria. Organismo sanitario nacional que administra el RENSPA, emite los Documentos de Tránsito Animal (DT-e) y controla la trazabilidad y la sanidad de la hacienda en Argentina.',
  },
  {
    name: 'CUIG',
    description:
      'Código Único de Identificación Ganadera. Identifica la marca o señal del productor (el hierro con el que se marca la hacienda) ante SENASA. Es distinto del RENSPA: el RENSPA identifica la relación productor–establecimiento, mientras que el CUIG identifica la propiedad del animal mediante su marca.',
  },
  {
    name: 'Establecimiento pecuario',
    description:
      'Unidad productiva —el campo— donde se aloja y produce la hacienda. Cada establecimiento con actividad pecuaria debe tener su propio RENSPA a nombre del productor que lo explota; si un productor opera dos campos, tramita un RENSPA por cada uno.',
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito Electrónico animal. Guía obligatoria que emite SENASA para trasladar hacienda entre establecimientos o hacia el remate/frigorífico. Requiere que origen y destino tengan RENSPA vigente.',
    url: `${BASE_URL}/dte`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — las preguntas copian lo que la gente escribe / le pregunta   */
/*  a un asistente. Cada respuesta arranca con el dato.                */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿El RENSPA es obligatorio?',
    answer:
      'Sí, el RENSPA es obligatorio para todo movimiento de hacienda en Argentina. Sin un RENSPA vigente que vincule al productor con el establecimiento no se puede emitir el DT-e ni, por lo tanto, trasladar, remitir a remate, vender ni enviar animales a faena. Es la condición sanitaria de base para operar con ganado.',
  },
  {
    question: '¿Cuánto cuesta sacar el RENSPA?',
    answer:
      'El RENSPA es gratuito: SENASA no cobra arancel por el alta ni por la renovación. El trámite se hace en línea con CUIT y Clave Fiscal AFIP nivel 3, sin intermediarios. Cualquier cifra que se pida por "gestionar el RENSPA" corresponde a un servicio de terceros, no al trámite oficial.',
  },
  {
    question: '¿Cuánto tarda el trámite?',
    answer:
      'El alta del RENSPA es en línea y el número de 17 dígitos se asigna al confirmar la declaración del establecimiento en AutoGestión de SENASA, por lo que en la práctica queda disponible en el momento. La demora depende de tener la Clave Fiscal nivel 3 y el servicio de SENASA habilitado en AFIP antes de empezar.',
  },
  {
    question: '¿El RENSPA sirve para sacar el DT-e?',
    answer:
      'Sí, el RENSPA es requisito para emitir el DT-e (Documento de Tránsito Electrónico). Para mover hacienda, tanto el establecimiento de origen como el de destino deben tener RENSPA vigente; sin él, SENASA no habilita la guía de traslado.',
  },
  {
    question: '¿Cada cuánto se renueva o actualiza el RENSPA?',
    answer:
      'El RENSPA se actualiza de forma anual mediante la declaración jurada de existencias de hacienda ante SENASA, y también cada vez que cambian los datos del establecimiento o la actividad. Mantenerlo actualizado es lo que lo conserva vigente para poder operar.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es el RENSPA y cómo sacarlo (SENASA): alta gratis paso a paso',
  description:
    'El RENSPA es el código obligatorio de SENASA que vincula al productor con el campo donde tiene su hacienda; se tramita gratis y sin él no se puede mover ni vender ganado en Argentina. Qué es, para qué sirve, cómo darse de alta paso a paso y diferencia con CUIG y marca.',
  keywords: [
    'qué es el renspa',
    'qué es el renspa y cómo sacarlo',
    'como sacar el renspa',
    'renspa senasa',
    'alta renspa',
    'renspa cómo darse de alta',
    'renspa cuánto cuesta',
    'renspa vs cuig',
    'renspa para dt-e',
    'registro nacional sanitario de productores agropecuarios',
  ],
  openGraph: {
    title: 'Qué es el RENSPA y cómo sacarlo (SENASA)',
    description:
      'El RENSPA es el código obligatorio de SENASA que vincula al productor con su campo: sin él no se puede mover ni vender hacienda. Alta gratis paso a paso, costo y diferencia con CUIG y marca.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElRenspaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-renspa" sectionName="Qué es el RENSPA" />
      <DefinedTermSetSchema
        name="RENSPA — definiciones"
        description="Definiciones citables de RENSPA, SENASA, CUIG, establecimiento pecuario y DT-e en el sistema sanitario ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <HowToSchema
        name="Cómo darse de alta en el RENSPA (SENASA) paso a paso"
        description="Alta del RENSPA en la oficina virtual de SENASA (AutoGestión): ingreso con CUIT y Clave Fiscal AFIP nivel 3, declaración del establecimiento y obtención del número de 17 dígitos. Trámite gratuito."
        steps={PASOS}
      />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el RENSPA y cómo sacarlo"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el RENSPA y cómo sacarlo (SENASA)
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El RENSPA (Registro Nacional Sanitario de Productores Agropecuarios) es el código
          obligatorio de SENASA que vincula a un productor con el campo donde tiene su hacienda; se
          tramita gratis y sin él no se puede mover ni vender ganado en Argentina.
        </p>

        <p className="text-zinc-400 mb-8">
          El número es de 17 dígitos y representa la relación entre un CUIT (el productor) y un
          establecimiento pecuario determinado. Es la unidad sanitaria básica del sistema: sobre el
          RENSPA se apoyan la emisión del DT-e, la declaración de existencias y la trazabilidad de la
          hacienda. El alta se hace en línea, sin arancel, en la oficina virtual de SENASA. Esta
          página es información de referencia; el trámite oficial se realiza en senasa.gob.ar.
        </p>

        {/* Para qué sirve */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">¿Para qué sirve el RENSPA?</h2>
        <p className="text-zinc-400 mb-4">
          El RENSPA identifica dónde está la hacienda y quién la explota, y es la llave sanitaria para
          operar con ganado. Concretamente, sirve para:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Mover la hacienda:</span> sin RENSPA vigente en origen y
            destino, SENASA no emite el DT-e y no se puede trasladar el ganado.
          </li>
          <li>
            <span className="text-zinc-300">Vender y remitir a remate o faena:</span> la operación
            comercial de hacienda exige respaldo sanitario, y ese respaldo arranca en el RENSPA.
          </li>
          <li>
            <span className="text-zinc-300">Declarar existencias:</span> la actualización anual de
            stock de animales se hace asociada al RENSPA del establecimiento.
          </li>
          <li>
            <span className="text-zinc-300">Trazabilidad y sanidad:</span> vincula al productor con el
            campo para campañas sanitarias (aftosa, brucelosis) y controles de SENASA.
          </li>
        </ul>

        {/* Cómo darse de alta */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo darse de alta paso a paso</h2>
        <p className="text-zinc-400 mb-4">
          El alta es en línea y gratuita. Se resuelve en cuatro pasos dentro de la oficina virtual de
          SENASA:
        </p>
        <ol className="text-zinc-400 mb-4 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-300">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        {/* Cuánto cuesta */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Cuánto cuesta y cada cuánto se renueva
        </h2>
        <p className="text-zinc-400 mb-4">
          El RENSPA es gratuito: SENASA no cobra arancel por el alta. Lo que hay que mantener es su
          vigencia, y eso se hace con la actualización anual de la declaración jurada de existencias
          de hacienda, además de actualizar los datos cada vez que cambia el establecimiento o la
          actividad. Un RENSPA sin la declaración de existencias al día puede quedar inactivo y frenar
          la emisión del DT-e. No hay tasa ni monto que pagar por el trámite oficial; cualquier costo
          que aparezca corresponde a un gestor privado, no a SENASA.
        </p>

        {/* RENSPA vs CUIG vs marca */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">RENSPA vs CUIG vs marca</h2>
        <p className="text-zinc-400 mb-4">
          Se confunden con frecuencia, pero identifican cosas distintas:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">RENSPA:</span> identifica la relación
            productor–establecimiento. Responde a “quién explota este campo y dónde está la hacienda”.
          </li>
          <li>
            <span className="text-zinc-300">CUIG:</span> Código Único de Identificación Ganadera,
            identifica la marca o señal del productor ante SENASA. Responde a “con qué hierro se marca
            esta hacienda”.
          </li>
          <li>
            <span className="text-zinc-300">Marca:</span> es el hierro físico —el registro de
            propiedad del animal— que la provincia otorga y que el CUIG codifica a nivel nacional.
            Prueba la propiedad; el RENSPA no prueba propiedad, ubica la actividad sanitaria.
          </li>
        </ul>

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
          <Link href="/dte" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el DT-e →
          </Link>
          <Link href="/como-vender-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo vender hacienda
          </Link>
          <Link href="/frigorificos" className="text-zinc-500 hover:text-accent transition-colors">
            Frigoríficos habilitados
          </Link>
          <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors">
            Directorio de consignatarias
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; el trámite oficial del RENSPA es gratuito y se realiza en
          senasa.gob.ar. Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
