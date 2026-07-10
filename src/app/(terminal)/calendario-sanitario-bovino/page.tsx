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
const PAGE_URL = `${BASE_URL}/calendario-sanitario-bovino`

/* ------------------------------------------------------------------ */
/*  Página conceptual (sin número vivo): el único dato vivo es la      */
/*  fecha de actualización, sello de frescura para AEO/GEO.            */
/*  Las fechas oficiales de cada campaña las fija SENASA.              */
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

/* ------------------------------------------------------------------ */
/*  Calendario por época — mismo array para HowToSchema y <ol> visible */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Primera campaña antiaftosa (otoño)',
    text:
      'En la primera campaña anual de vacunación antiaftosa —típicamente en otoño— se vacuna la totalidad del rodeo bovino contra la fiebre aftosa. Es obligatoria, la organiza el ente sanitario o fundación local bajo control de SENASA, y su acta de vacunación es la que habilita a seguir moviendo hacienda. Las fechas exactas de apertura y cierre las fija SENASA cada año.',
  },
  {
    name: 'Vacunación de brucelosis en terneras',
    text:
      'Junto con la campaña de otoño (o en la ventana que corresponda) se vacuna contra brucelosis a las terneras de entre 3 y 8 meses de edad con vacuna Cepa 19 o RB51, según el plan nacional. Es una vacunación única en la vida del animal hembra y también es obligatoria y controlada por SENASA.',
  },
  {
    name: 'Segunda campaña antiaftosa (primavera)',
    text:
      'En la segunda campaña anual —hacia la primavera— se revacuna contra la fiebre aftosa. En la mayoría de las zonas la segunda campaña alcanza solo a las categorías jóvenes (terneros, terneras y a veces vaquillonas), aunque el alcance por categoría lo define SENASA por región. Con las dos campañas al año el rodeo mantiene la cobertura antiaftosa vigente.',
  },
  {
    name: 'Antiparasitarios y sanidad complementaria',
    text:
      'Por fuera de las campañas oficiales, el plan sanitario recomendado incluye desparasitaciones internas y externas, control de garrapata donde corresponde, vacunas reproductivas y clostridiales según la zona y la categoría. Estas prácticas no son campañas nacionales obligatorias: las define el veterinario del establecimiento según el estado del rodeo y el momento productivo.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Fiebre aftosa',
    description:
      'Enfermedad viral altamente contagiosa de los bovinos y otros animales de pezuña hendida. Argentina la controla mediante vacunación obligatoria en dos campañas anuales reguladas por SENASA; es la enfermedad que ordena todo el calendario sanitario bovino, porque de su acta de vacunación depende poder mover y vender hacienda.',
    url: PAGE_URL,
  },
  {
    name: 'Brucelosis',
    description:
      'Enfermedad bacteriana que afecta la reproducción del bovino y es transmisible al ser humano (zoonosis). Se previene con la vacunación obligatoria de las terneras de 3 a 8 meses (Cepa 19 o RB51), aplicación única controlada por SENASA dentro del plan sanitario nacional.',
  },
  {
    name: 'Campaña de vacunación',
    description:
      'Ventana temporal, fijada por SENASA, durante la cual se vacuna de forma coordinada a los rodeos de una región. La campaña antiaftosa se realiza dos veces al año (otoño y primavera) y la ejecutan los entes sanitarios o fundaciones locales. Fuera de la ventana no se emite acta de vacunación válida.',
  },
  {
    name: 'RENSPA',
    description:
      'Registro Nacional Sanitario de Productores Agropecuarios. Código de SENASA que vincula al productor con el establecimiento y sobre el que se registran las vacunaciones y existencias; es la unidad sanitaria de base del calendario, porque sin RENSPA vigente no hay campaña ni movimiento de hacienda posible.',
    url: `${BASE_URL}/que-es-el-renspa`,
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito Electrónico animal. Guía obligatoria que emite SENASA para trasladar hacienda. Requiere que el rodeo tenga la vacunación antiaftosa al día: sin acta de la campaña vigente, SENASA no habilita el DT-e y la hacienda no puede salir del campo.',
    url: `${BASE_URL}/que-es-el-dte`,
  },
  {
    name: 'Plan sanitario',
    description:
      'Programa anual de vacunaciones y tratamientos de un rodeo. Combina las campañas obligatorias de SENASA (aftosa, brucelosis) con la sanidad complementaria recomendada por el veterinario (antiparasitarios, clostridiales, vacunas reproductivas) ordenada por época del año.',
  },
  {
    name: 'Ente sanitario / fundación',
    description:
      'Entidad local —fundación o ente de lucha sanitaria— que ejecuta las campañas de vacunación en su zona bajo la coordinación y el control de SENASA. Es quien organiza la vacunación antiaftosa a campo y emite el acta que registra la aplicación.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — copian lo que la gente escribe / le pregunta a un asistente. */
/*  Cada respuesta arranca con el dato (answer-first).                 */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuándo se vacuna contra la aftosa?',
    answer:
      'La vacunación antiaftosa se hace en dos campañas al año: una en otoño (que alcanza a todo el rodeo) y otra en primavera (que en general alcanza solo a las categorías jóvenes). Las fechas exactas de apertura y cierre de cada campaña las fija SENASA por región y se publican en senasa.gob.ar; no son las mismas en todo el país ni todos los años.',
  },
  {
    question: '¿La vacunación antiaftosa es obligatoria?',
    answer:
      'Sí, la vacunación antiaftosa es obligatoria para todos los bovinos en las zonas de vacunación de Argentina. La ejecutan los entes sanitarios o fundaciones locales bajo control de SENASA, y la aplicación queda registrada en un acta de vacunación asociada al RENSPA del establecimiento.',
  },
  {
    question: '¿Quién controla el calendario sanitario bovino?',
    answer:
      'SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria) es el organismo nacional que regula el calendario sanitario: define las fechas de las campañas antiaftosa, el plan de brucelosis y las condiciones sanitarias para mover hacienda. En el terreno, la vacunación la ejecutan los entes sanitarios y fundaciones locales, pero la autoridad y el control son de SENASA.',
  },
  {
    question: '¿Qué pasa si no vacuno contra la aftosa?',
    answer:
      'Si no se cumple la vacunación antiaftosa, el rodeo queda sin acta de vacunación vigente y SENASA no habilita la emisión del DT-e; sin DT-e no se puede trasladar, remitir a remate, vender ni enviar a faena la hacienda. Además pueden aplicarse sanciones. Es decir, saltear la campaña deja al campo sin poder operar comercialmente con su ganado.',
  },
  {
    question: '¿Cuándo se vacuna la brucelosis?',
    answer:
      'La brucelosis se vacuna una sola vez en la vida de cada ternera hembra, entre los 3 y los 8 meses de edad, con vacuna Cepa 19 o RB51 según el plan nacional. Es obligatoria y controlada por SENASA, y en la práctica suele aplicarse coordinada con la campaña antiaftosa de otoño para aprovechar el trabajo de manga.',
  },
]

export const metadata: Metadata = {
  title: 'Calendario sanitario bovino: vacunación antiaftosa y plan sanitario (SENASA)',
  description:
    'El calendario sanitario bovino organiza las vacunaciones y tratamientos del año, siendo la campaña antiaftosa —dos por año, regulada por SENASA— la más importante. Cuándo se vacuna aftosa y brucelosis, plan por época y qué pasa si no vacunás.',
  keywords: [
    'calendario sanitario bovino',
    'calendario sanitario bovino vacunacion antiaftosa',
    'vacunación antiaftosa',
    'cuándo se vacuna la aftosa',
    'campaña antiaftosa senasa',
    'plan sanitario bovino',
    'vacunación brucelosis terneras',
    'calendario de vacunación ganado',
    'plan sanitario rodeo',
    'vacunas obligatorias bovinos argentina',
  ],
  openGraph: {
    title: 'Calendario sanitario bovino: vacunación antiaftosa y plan sanitario',
    description:
      'El calendario sanitario bovino organiza las vacunaciones y tratamientos del año; la campaña antiaftosa (dos por año, regulada por SENASA) es la más importante. Cuándo se vacuna, obligatoriedad y qué pasa si no vacunás.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CalendarioSanitarioBovinoPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="calendario-sanitario-bovino"
        sectionName="Calendario sanitario bovino"
      />
      <DefinedTermSetSchema
        name="Calendario sanitario bovino — definiciones"
        description="Definiciones citables de fiebre aftosa, brucelosis, campaña de vacunación, RENSPA, DT-e, plan sanitario y ente sanitario en el sistema sanitario ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Calendario sanitario bovino paso a paso por época del año"
        description="Plan sanitario anual del rodeo bovino: primera campaña antiaftosa en otoño, vacunación de brucelosis en terneras, segunda campaña antiaftosa en primavera y antiparasitarios complementarios. Las fechas oficiales las fija SENASA."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Calendario sanitario bovino: vacunación antiaftosa y plan sanitario"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Calendario sanitario bovino: vacunación antiaftosa y plan sanitario
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El calendario sanitario bovino organiza las vacunaciones y tratamientos obligatorios y
          recomendados del año para un rodeo, siendo la campaña de vacunación antiaftosa —dos por
          año, regulada por SENASA— la práctica más importante, porque de su acta depende poder mover
          y vender la hacienda.
        </p>

        <p className="text-zinc-400 mb-8">
          El eje del calendario son las dos campañas anuales contra la fiebre aftosa: la de otoño, que
          alcanza a todo el rodeo, y la de primavera, que en general alcanza solo a las categorías
          jóvenes. Sobre ese eje se ordenan la vacunación única de brucelosis en las terneras y la
          sanidad complementaria (antiparasitarios, clostridiales, vacunas reproductivas) que
          recomienda el veterinario del establecimiento. Esta página es información de referencia; las
          fechas oficiales de cada campaña las fija SENASA en senasa.gob.ar.
        </p>

        {/* Por qué la aftosa ordena el calendario */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Por qué la antiaftosa ordena todo el calendario
        </h2>
        <p className="text-zinc-400 mb-4">
          La vacunación antiaftosa es obligatoria y su acta es la llave sanitaria para operar con
          ganado. Concretamente, la campaña antiaftosa condiciona:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">El movimiento de hacienda:</span> sin acta de vacunación
            vigente, SENASA no emite el DT-e y el ganado no puede salir del campo.
          </li>
          <li>
            <span className="text-zinc-300">La venta y la faena:</span> remitir a remate, vender o
            enviar a frigorífico exige respaldo sanitario, y ese respaldo arranca en la antiaftosa al
            día.
          </li>
          <li>
            <span className="text-zinc-300">El registro por RENSPA:</span> la vacunación queda
            asociada al RENSPA del establecimiento, que es la unidad sanitaria de base del sistema.
          </li>
          <li>
            <span className="text-zinc-300">El estatus sanitario del país:</span> la cobertura
            sostenida es lo que respalda la condición de Argentina frente a la fiebre aftosa.
          </li>
        </ul>

        {/* Calendario por época */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">El calendario por época del año</h2>
        <p className="text-zinc-400 mb-4">
          El plan sanitario anual se ordena por estación, con picos en las dos campañas antiaftosa.
          Las fechas concretas de apertura y cierre de cada campaña las define SENASA por región:
        </p>
        <ol className="text-zinc-400 mb-4 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-300">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        {/* Tabla resumen */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Resumen del plan sanitario</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border border-terminal-border">
            <thead>
              <tr className="border-b border-terminal-border">
                <th className="text-xxs uppercase tracking-wider text-zinc-500 px-3 py-2">Época</th>
                <th className="text-xxs uppercase tracking-wider text-zinc-500 px-3 py-2">Práctica</th>
                <th className="text-xxs uppercase tracking-wider text-zinc-500 px-3 py-2">Alcance</th>
                <th className="text-xxs uppercase tracking-wider text-zinc-500 px-3 py-2">Carácter</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-terminal-border">
                <td className="px-3 py-2 text-zinc-300">Otoño</td>
                <td className="px-3 py-2">Antiaftosa (1ª campaña)</td>
                <td className="px-3 py-2">Todo el rodeo</td>
                <td className="px-3 py-2">Obligatoria (SENASA)</td>
              </tr>
              <tr className="border-b border-terminal-border">
                <td className="px-3 py-2 text-zinc-300">Otoño</td>
                <td className="px-3 py-2">Brucelosis</td>
                <td className="px-3 py-2">Terneras 3–8 meses</td>
                <td className="px-3 py-2">Obligatoria, única (SENASA)</td>
              </tr>
              <tr className="border-b border-terminal-border">
                <td className="px-3 py-2 text-zinc-300">Primavera</td>
                <td className="px-3 py-2">Antiaftosa (2ª campaña)</td>
                <td className="px-3 py-2">Categorías jóvenes</td>
                <td className="px-3 py-2">Obligatoria (SENASA)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-300">Todo el año</td>
                <td className="px-3 py-2">Antiparasitarios / clostridiales</td>
                <td className="px-3 py-2">Según categoría y zona</td>
                <td className="px-3 py-2">Recomendada (veterinario)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mb-8">
          Esquema de referencia. El alcance por categoría y las fechas exactas los define SENASA por
          región y campaña; verificá siempre las fechas vigentes en senasa.gob.ar.
        </p>

        {/* FAQ visible */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-terminal-border pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/que-es-senasa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es SENASA →
          </Link>
          <Link href="/que-es-el-renspa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el RENSPA
          </Link>
          <Link href="/que-es-el-dte" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el DT-e
          </Link>
          <Link href="/como-vender-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo vender hacienda
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; las fechas oficiales de cada campaña las fija SENASA en
          senasa.gob.ar. Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
