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
const PAGE_URL = `${BASE_URL}/que-es-el-dte`

/* ------------------------------------------------------------------ */
/*  Número vivo: el DT-e es un trámite, no expone serie numérica.       */
/*  El único dato vivo es la fecha de referencia (sello de frescura).   */
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

/* ------------------------------------------------------------------ */
/*  Cómo sacar el DT-e — mismo array para HowToSchema y HTML visible    */
/*  Voseo en las instrucciones (ingresá, cargá, validá, imprimí).       */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Verificar que el RENSPA esté vigente',
    text:
      'Antes de emitir, controlá que el establecimiento de origen y el de destino tengan RENSPA vigente y con la declaración de existencias al día. Sin RENSPA activo en ambas puntas, SENASA no habilita la guía.',
  },
  {
    name: 'Ingresar a SIGSA en senasa.gob.ar',
    text:
      'Ingresá al Sistema Integrado de Gestión de Sanidad Animal (SIGSA) desde la web oficial de SENASA (senasa.gob.ar) con tu CUIT y Clave Fiscal AFIP nivel 3, con el servicio de SENASA habilitado en el administrador de relaciones de AFIP.',
  },
  {
    name: 'Cargar origen, destino y categorías',
    text:
      'Cargá el RENSPA de origen y el de destino, el motivo del movimiento (venta, traslado, remate, faena) y el detalle de la hacienda por categoría y cantidad de cabezas. Asociá la marca o boleto de marca que acredita la propiedad de los animales.',
  },
  {
    name: 'Validar el documento',
    text:
      'Validá los datos en el sistema. SENASA controla la vigencia de los RENSPA, el estado sanitario y la coherencia de las categorías declaradas antes de autorizar la emisión del DT-e.',
  },
  {
    name: 'Imprimir el DT-e y acompañar la tropa',
    text:
      'Imprimí el DT-e emitido y hacé que acompañe físicamente a la hacienda durante todo el traslado. El transportista debe llevarlo para exhibirlo en los controles de ruta y en el establecimiento de destino.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito electrónico. Documento obligatorio que emite SENASA para trasladar hacienda entre establecimientos o hacia remate y frigorífico en Argentina. Vincula el RENSPA de origen y el de destino con la marca del productor, y debe acompañar físicamente a los animales durante todo el movimiento. Sin DT-e no se puede mover ganado de forma legal.',
    url: PAGE_URL,
  },
  {
    name: 'DTA (histórico)',
    description:
      'Documento de Tránsito Animal, el antecesor en papel del DT-e. Cumplía la misma función —autorizar el movimiento de hacienda— pero se emitía manualmente en oficinas de SENASA. Fue reemplazado por el DT-e electrónico, que se gestiona en línea a través de SIGSA. En el campo todavía se lo nombra por costumbre.',
  },
  {
    name: 'RENSPA',
    description:
      'Registro Nacional Sanitario de Productores Agropecuarios. Código de 17 dígitos de SENASA que vincula a un productor (CUIT) con un establecimiento. Es requisito del DT-e: tanto el origen como el destino deben tener RENSPA vigente para que SENASA autorice la guía de traslado.',
    url: `${BASE_URL}/que-es-el-renspa`,
  },
  {
    name: 'Boleto de marca',
    description:
      'Documento provincial que acredita la propiedad de la hacienda mediante la marca a fuego (el hierro) registrada a nombre del productor. El DT-e se apoya en la marca o boleto de marca para asociar los animales trasladados con su dueño legítimo.',
  },
  {
    name: 'Establecimiento de origen y de destino',
    description:
      'Los dos campos que participan del movimiento. El de origen es de donde sale la hacienda; el de destino, a donde llega. Cada uno se identifica por su RENSPA en el DT-e. El sistema controla que ambos estén habilitados antes de autorizar el traslado.',
  },
  {
    name: 'Guía de traslado',
    description:
      'Nombre genérico del documento que autoriza mover animales por ruta. En Argentina, la guía sanitaria oficial es el DT-e de SENASA; algunas provincias suman su propia guía de campaña o boleto de marca. El DT-e es el que exige la Nación para el tránsito interprovincial y hacia faena.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — copian lo que la gente pregunta / le consulta a un asistente  */
/*  Cada respuesta arranca con el dato (answer-first).                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el DT-e?',
    answer:
      'El DT-e (Documento de Tránsito electrónico) es el documento obligatorio de SENASA que autoriza el traslado de hacienda entre establecimientos o hacia remate y frigorífico en Argentina. Vincula el RENSPA de origen y el de destino con la marca del productor, se emite en línea a través de SIGSA y debe acompañar físicamente a los animales durante todo el movimiento.',
  },
  {
    question: '¿Se puede mover hacienda sin DT-e?',
    answer:
      'No, no se puede mover hacienda sin DT-e. Es el documento sanitario que exige SENASA para todo traslado de animales; sin él, el movimiento es irregular y el transportista queda expuesto a decomiso o multa en los controles de ruta. Todo movimiento legal de ganado —venta, traslado entre campos, envío a remate o a faena— necesita un DT-e emitido y vigente.',
  },
  {
    question: '¿Cuánto cuesta el DT-e?',
    answer:
      'La emisión del DT-e en SIGSA no tiene un arancel nacional por el documento en sí; se gestiona en línea con CUIT y Clave Fiscal. Sí pueden existir tasas provinciales o municipales de guía y percepciones asociadas al movimiento, que varían por jurisdicción. Cualquier cobro por «tramitar el DT-e» que aparezca por fuera de SENASA o del fisco provincial corresponde a un gestor privado, no al trámite oficial.',
  },
  {
    question: '¿Qué relación tiene el DT-e con el RENSPA?',
    answer:
      'El RENSPA es requisito del DT-e: para emitir la guía, tanto el establecimiento de origen como el de destino deben tener un RENSPA vigente y con la declaración de existencias al día. El RENSPA identifica el campo y quién lo explota; el DT-e usa esos RENSPA para autorizar el movimiento de la hacienda entre ellos. Sin RENSPA activo en ambas puntas, SENASA no habilita el DT-e.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es el DT-e: documento de tránsito electrónico para mover hacienda (SENASA)',
  description:
    'El DT-e es el documento obligatorio de SENASA para trasladar hacienda entre establecimientos, vinculado al RENSPA de origen y destino y a la marca del productor. Qué es, para qué sirve, cómo sacarlo paso a paso en SIGSA, cuánto cuesta y su relación con el RENSPA.',
  keywords: [
    'que es el dte',
    'que es el dte documento de transito electronico hacienda',
    'documento de transito electronico',
    'dte senasa',
    'como sacar el dte',
    'dte hacienda',
    'dta senasa',
    'guia de traslado de hacienda',
    'mover hacienda sin dte',
    'dte renspa',
  ],
  openGraph: {
    title: 'Qué es el DT-e: documento de tránsito electrónico (SENASA)',
    description:
      'El DT-e es el documento obligatorio de SENASA para trasladar hacienda: vincula el RENSPA de origen y destino con la marca del productor. Qué es, cómo sacarlo en SIGSA paso a paso y cuánto cuesta.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElDtePage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-dte" sectionName="Qué es el DT-e" />
      <DefinedTermSetSchema
        name="DT-e — definiciones"
        description="Definiciones citables de DT-e, DTA histórico, RENSPA, boleto de marca, establecimiento de origen/destino y guía de traslado en el sistema sanitario ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo sacar el DT-e en SENASA (SIGSA) paso a paso"
        description="Emisión del DT-e en el Sistema Integrado de Gestión de Sanidad Animal (SIGSA) de SENASA: verificación del RENSPA vigente, ingreso con CUIT y Clave Fiscal, carga de origen, destino y categorías, validación e impresión del documento que acompaña a la hacienda."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el DT-e"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el DT-e (documento de tránsito electrónico)
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El DT-e (Documento de Tránsito electrónico) es el documento obligatorio de SENASA para
          trasladar hacienda entre establecimientos en Argentina; vincula el RENSPA de origen y el de
          destino con la marca del productor, y sin él no se puede mover ganado de forma legal.
        </p>

        <p className="text-zinc-400 mb-8">
          El DT-e reemplazó al viejo DTA (Documento de Tránsito Animal) en papel: hoy se emite en
          línea a través del sistema SIGSA de SENASA y acompaña físicamente a la tropa durante todo el
          movimiento, ya sea entre campos, hacia un remate o rumbo a faena. Es la pieza sanitaria que
          cierra la trazabilidad del animal: se apoya en el RENSPA para saber de dónde sale y a dónde
          llega la hacienda, y en la marca para saber de quién es. Esta página es información de
          referencia; el trámite oficial se realiza en senasa.gob.ar.
        </p>

        {/* Para qué sirve */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">¿Para qué sirve el DT-e?</h2>
        <p className="text-zinc-400 mb-4">
          El DT-e autoriza y respalda cualquier movimiento de hacienda. Concretamente, sirve para:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Trasladar animales entre campos:</span> mover hacienda de
            un establecimiento a otro exige un DT-e con RENSPA vigente en origen y destino.
          </li>
          <li>
            <span className="text-zinc-300">Remitir a remate:</span> la hacienda que se manda a una
            feria o remate viaja con su DT-e; sin él, la consignataria no la puede recibir ni operar.
          </li>
          <li>
            <span className="text-zinc-300">Enviar a faena:</span> el frigorífico solo recibe animales
            que llegan con el DT-e que acredita su origen y su condición sanitaria.
          </li>
          <li>
            <span className="text-zinc-300">Sostener la trazabilidad:</span> cada DT-e deja registrado
            el movimiento en SENASA, encadenando origen, destino y propiedad de la tropa.
          </li>
        </ul>

        {/* Cómo sacarlo */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo sacar el DT-e paso a paso</h2>
        <p className="text-zinc-400 mb-4">
          La emisión es en línea, dentro del sistema SIGSA de SENASA. Se resuelve en cinco pasos:
        </p>
        <ol className="text-zinc-400 mb-4 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-300">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        {/* Cuánto cuesta */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cuánto cuesta el DT-e</h2>
        <p className="text-zinc-400 mb-4">
          La emisión del DT-e en SIGSA no tiene un arancel nacional por el documento en sí: se gestiona
          en línea con CUIT y Clave Fiscal AFIP nivel 3. Lo que sí puede aparecer son tasas
          provinciales o municipales de guía y percepciones impositivas asociadas al movimiento de
          hacienda, que varían según la jurisdicción de origen y destino. No hay un monto nacional
          único que pagar por el trámite oficial; cualquier cobro por «gestionar el DT-e» por fuera de
          SENASA o del fisco provincial corresponde a un gestor privado, no al Estado.
        </p>

        {/* DT-e vs DTA */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">DT-e vs DTA: qué cambió</h2>
        <p className="text-zinc-400 mb-4">
          Son el mismo instrumento en dos etapas. El DTA (Documento de Tránsito Animal) se emitía en
          papel, de forma manual, en las oficinas de SENASA. El DT-e es su versión electrónica: se
          tramita en línea en SIGSA, valida en el momento la vigencia de los RENSPA y el estado
          sanitario, y deja el movimiento registrado de forma automática. En el campo se sigue diciendo
          «la guía» o «el DTA» por costumbre, pero el documento vigente es el DT-e.
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
          <Link href="/que-es-el-renspa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el RENSPA →
          </Link>
          <Link href="/que-es-senasa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es SENASA
          </Link>
          <Link href="/como-vender-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo vender hacienda
          </Link>
          <Link href="/frigorificos" className="text-zinc-500 hover:text-accent transition-colors">
            Frigoríficos habilitados
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; el trámite oficial del DT-e se realiza en senasa.gob.ar.
          Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
