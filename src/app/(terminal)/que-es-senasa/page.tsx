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

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-senasa`

/* ------------------------------------------------------------------ */
/*  Número vivo: página conceptual, sin serie numérica obligatoria.    */
/*  El único dato vivo es la fecha de actualización (sello de frescura).*/
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario    */
/*  visible. Anclan el cluster sanitario (RENSPA, DT-e, habilitación).  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'SENASA',
    description:
      'Servicio Nacional de Sanidad y Calidad Agroalimentaria. Organismo descentralizado del Estado argentino que regula y controla la sanidad animal y vegetal, la trazabilidad de la hacienda y la habilitación de los establecimientos agroalimentarios (frigoríficos, mataderos, plantas). Es la autoridad sanitaria de base de toda la cadena ganadera.',
    url: PAGE_URL,
  },
  {
    name: 'RENSPA',
    description:
      'Registro Nacional Sanitario de Productores Agropecuarios. Código de SENASA, de 17 dígitos, que vincula a un productor (CUIT) con un establecimiento rural. Es la unidad sanitaria básica del sistema: sin RENSPA vigente no se puede mover ni vender hacienda. El alta es gratuita.',
    url: `${BASE_URL}/que-es-el-renspa`,
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito Electrónico animal. Guía obligatoria que emite SENASA para trasladar hacienda entre establecimientos o hacia el remate y el frigorífico. Requiere que origen y destino tengan RENSPA vigente.',
    url: `${BASE_URL}/que-es-el-dte`,
  },
  {
    name: 'Habilitación de establecimiento',
    description:
      'Autorización sanitaria que otorga SENASA (o la autoridad provincial en el tránsito federal delegado) para que un frigorífico, matadero o planta pueda faenar y comercializar. La matrícula del establecimiento acredita esa habilitación; sin ella no puede operar dentro del circuito legal.',
    url: `${BASE_URL}/frigorificos`,
  },
  {
    name: 'Campaña antiaftosa',
    description:
      'Plan sanitario nacional coordinado por SENASA para mantener el estatus de país libre de fiebre aftosa. Se ejecuta con vacunación obligatoria por campañas y calendario, y es la base del acceso de la carne argentina a los mercados de exportación.',
    url: `${BASE_URL}/calendario-sanitario-bovino`,
  },
  {
    name: 'Trazabilidad',
    description:
      'Capacidad de seguir el recorrido de un animal y su producto desde el campo hasta la faena. En Argentina se apoya en el RENSPA, la identificación de la hacienda y el DT-e, todos administrados por SENASA.',
  },
  {
    name: 'senasa.gob.ar',
    description:
      'Sitio oficial del SENASA, donde se realizan los trámites reales: alta de RENSPA, emisión de DT-e, consulta de establecimientos habilitados y campañas sanitarias. Esta página es informativa; el trámite formal se hace únicamente en senasa.gob.ar.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first: cada respuesta arranca con el dato.            */
/*  Mismo array para FAQPageSchema y el <dl> visible.                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué hace SENASA en la ganadería?',
    answer:
      'SENASA regula la sanidad animal, la trazabilidad de la hacienda y la habilitación de los establecimientos en toda la cadena ganadera argentina. En concreto administra el RENSPA, emite los DT-e para el movimiento de hacienda, coordina las campañas sanitarias (aftosa, brucelosis, tuberculosis) y habilita los frigoríficos y mataderos. Es la autoridad que hace que un animal pueda moverse, venderse y faenarse dentro del circuito legal.',
  },
  {
    question: '¿Cómo saco un RENSPA en SENASA?',
    answer:
      'El RENSPA se tramita gratis y en línea en el sistema de AutoGestión de SENASA (senasa.gob.ar), ingresando con CUIT y Clave Fiscal de AFIP nivel 3 y declarando el establecimiento donde tenés la hacienda; el sistema asigna un número de 17 dígitos en el momento. Es la condición sanitaria de base: sin RENSPA no se emite el DT-e ni se puede mover ganado.',
  },
  {
    question: '¿Qué es la matrícula o habilitación de un frigorífico?',
    answer:
      'La habilitación de un frigorífico es la autorización sanitaria que otorga SENASA (o la autoridad provincial cuando el tránsito es provincial) para que el establecimiento pueda faenar y comercializar carne; la matrícula es el número que acredita esa habilitación. Un frigorífico con matrícula de tránsito federal puede vender en todo el país y exportar; sin habilitación vigente no puede operar dentro del circuito legal.',
  },
  {
    question: '¿SENASA fija los precios de la hacienda?',
    answer:
      'No. SENASA no fija ni publica precios de la hacienda; su competencia es sanitaria (RENSPA, DT-e, campañas, habilitaciones), no comercial. El precio de referencia surge del mercado —la operatoria del Mercado Agroganadero y el índice INMAG—, no de SENASA. Esta página es informativa y los precios que se muestran en el sitio son de referencia del mercado, no fijados por esta página ni por SENASA.',
  },
  {
    question: '¿Los trámites de SENASA se pagan?',
    answer:
      'Los trámites sanitarios centrales del productor son gratuitos: el alta y la renovación del RENSPA no tienen arancel, y el DT-e se gestiona sin costo de trámite. Cualquier cifra que se pida por «gestionar el RENSPA» o «sacar la guía» corresponde a un servicio privado de terceros, no a SENASA. El trámite oficial siempre se hace en senasa.gob.ar.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es el SENASA y su función en la ganadería argentina',
  description:
    'El SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria) es el organismo que regula la sanidad animal, la trazabilidad de la hacienda y la habilitación de establecimientos en Argentina. Qué hace en la ganadería, RENSPA, DT-e, habilitación de frigoríficos y campaña antiaftosa.',
  keywords: [
    'que es senasa',
    'que es senasa ganaderia',
    'senasa que hace',
    'funcion de senasa',
    'senasa sanidad animal',
    'senasa renspa',
    'senasa dt-e',
    'senasa habilitacion frigorificos',
    'servicio nacional de sanidad y calidad agroalimentaria',
    'senasa aftosa',
  ],
  openGraph: {
    title: 'Qué es el SENASA y su función en la ganadería argentina',
    description:
      'El SENASA es el organismo que regula la sanidad animal, la trazabilidad y la habilitación de establecimientos en Argentina. RENSPA, DT-e, habilitación de frigoríficos y campaña antiaftosa, explicados.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsSenasaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-senasa" sectionName="Qué es el SENASA" />
      <DefinedTermSetSchema
        name="SENASA — definiciones"
        description="Definiciones citables de SENASA, RENSPA, DT-e, habilitación de establecimientos, campaña antiaftosa y trazabilidad en el sistema sanitario ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el SENASA y su función en la ganadería"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es el SENASA y su función en la ganadería argentina"
        description="El SENASA regula la sanidad animal, la trazabilidad de la hacienda y la habilitación de establecimientos en Argentina: RENSPA, DT-e, campañas sanitarias y habilitación de frigoríficos."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'SENASA — Servicio Nacional de Sanidad y Calidad Agroalimentaria', url: 'https://www.senasa.gob.ar' },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el SENASA y su función en la ganadería
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria) es el organismo del
          Estado argentino que regula la sanidad animal, la trazabilidad de la hacienda y la
          habilitación de los establecimientos agroalimentarios; es la autoridad sanitaria sobre la
          que se apoya toda la cadena ganadera.
        </p>

        <p className="text-zinc-400 mb-8">
          En la práctica, SENASA es el organismo que administra el RENSPA (el registro que vincula al
          productor con su campo), emite los DT-e para mover la hacienda, coordina las campañas
          sanitarias como la de aftosa y habilita los frigoríficos y mataderos donde se faena. No
          interviene en el precio: su competencia es sanitaria, no comercial. Esta página es
          información de referencia; los trámites oficiales se realizan en senasa.gob.ar.
        </p>

        {/* Qué hace */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">¿Qué hace SENASA en la ganadería?</h2>
        <p className="text-zinc-400 mb-4">
          SENASA es la llave sanitaria de toda la operatoria con hacienda. Sus funciones sobre la
          cadena ganadera se ordenan en cuatro frentes:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Registro del productor (RENSPA):</span> administra el
            registro que vincula a cada productor con su establecimiento. Es la condición de base
            para operar; sin RENSPA vigente no hay movimiento de hacienda.
          </li>
          <li>
            <span className="text-zinc-300">Movimiento y trazabilidad (DT-e):</span> emite el
            Documento de Tránsito Electrónico que autoriza trasladar la hacienda entre campos o hacia
            el remate y el frigorífico, y sostiene la trazabilidad del animal.
          </li>
          <li>
            <span className="text-zinc-300">Campañas sanitarias:</span> coordina los planes contra
            aftosa, brucelosis y tuberculosis, con vacunación por calendario. La condición de país
            libre de aftosa con vacunación es lo que habilita la exportación de carne.
          </li>
          <li>
            <span className="text-zinc-300">Habilitación de establecimientos:</span> autoriza y
            controla frigoríficos, mataderos y plantas mediante la matrícula sanitaria; solo un
            establecimiento habilitado puede faenar y comercializar dentro del circuito legal.
          </li>
        </ul>

        {/* Cluster sanitario */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          RENSPA, DT-e y habilitación: cómo se encadenan
        </h2>
        <p className="text-zinc-400 mb-4">
          Los trámites sanitarios de la ganadería forman una secuencia, y SENASA es el organismo que
          la administra de punta a punta:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Primero el RENSPA:</span> el productor da de alta el
            establecimiento y obtiene su número de 17 dígitos. Es gratuito y se hace en línea.
          </li>
          <li>
            <span className="text-zinc-300">Después el DT-e:</span> con el RENSPA vigente en origen y
            destino, SENASA emite la guía para mover la hacienda hacia otro campo, el remate o el
            frigorífico.
          </li>
          <li>
            <span className="text-zinc-300">Al final, la faena:</span> el animal llega a un
            frigorífico habilitado por SENASA, con matrícula vigente, que es el único autorizado a
            faenar y comercializar.
          </li>
        </ul>

        {/* SENASA no fija precios */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">SENASA no fija precios</h2>
        <p className="text-zinc-400 mb-8">
          SENASA regula la sanidad, no el precio. No publica ni fija cotizaciones de la hacienda: el
          precio de referencia del ganado argentino surge del mercado —la operatoria del Mercado
          Agroganadero y el índice INMAG—, no del organismo sanitario. En este sitio, cualquier valor
          que se muestre es precio de referencia del mercado (INMAG/MAG), no fijado por esta página ni
          por SENASA.
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

        {/* Links internos — ancla el cluster sanitario */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/que-es-el-renspa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el RENSPA →
          </Link>
          <Link href="/que-es-el-dte" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el DT-e
          </Link>
          <Link href="/frigorificos" className="text-zinc-500 hover:text-accent transition-colors">
            Frigoríficos habilitados
          </Link>
          <Link href="/calendario-sanitario-bovino" className="text-zinc-500 hover:text-accent transition-colors">
            Calendario sanitario bovino
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer institucional */}
        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; los trámites oficiales del SENASA se realizan en senasa.gob.ar.
          Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
