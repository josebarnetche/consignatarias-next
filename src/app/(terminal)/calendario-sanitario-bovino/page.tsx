import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import CalendarioMensual from '@/components/sanidad/CalendarioMensual'
import {
  SANIDAD_DISCLAIMER, PLANES, CALENDARIO_AFTOSA_2026, REQUISITOS_MOVIMIENTO,
  ZONAS_AFTOSA, FUENTES, fuentesDe, COMO_FUNCIONA, TRAMITES, FAQ_SANIDAD, VACUNADOR_2027,
} from '@/lib/data/senasa-sanidad'
import marketPrices from '@/lib/data/market-prices.json'

/**
 * Sanidad del rodeo: una sola página.
 *
 * Hasta la v1.255.1 competían dos: esta guía y /sanidad (el régimen SENASA codificado y
 * citado: planes, calendario 2026, vacunador 2027, movimientos, trámites). Queda esta URL
 * porque es la que tiene búsqueda (GSC W29-W43: 4 clics y 309 impresiones; /sanidad, 2
 * impresiones en posición 61). /sanidad es un 301 hacia acá y su contenido vive en las
 * secciones de abajo, con las mismas anclas (#planes, #aftosa, #vacunador-2027,
 * #movimiento, #renspa, #tramites, #faq) para que los enlaces viejos con ancla sigan
 * cayendo donde tienen que caer.
 */

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/calendario-sanitario-bovino`

/* ------------------------------------------------------------------ */
/*  El único dato vivo de la guía es la fecha de actualización, sello  */
/*  de frescura para AEO/GEO. Las fechas oficiales las fija SENASA.    */
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

const zonasSin = ZONAS_AFTOSA.filter((z) => z.estado === 'sin_vacunacion')
const zonasMixtas = ZONAS_AFTOSA.filter((z) => z.estado === 'mixta')

/* ------------------------------------------------------------------ */
/*  Calendario por época — mismo array para HowToSchema y <ol> visible */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Primera campaña antiaftosa (fin del verano y otoño)',
    text:
      'En la primera campaña anual de vacunación antiaftosa se vacuna la totalidad del rodeo bovino contra la fiebre aftosa. En 2026 corre de enero a abril, con el grueso del país en marzo (Res. SENASA 711/2025). Es obligatoria, la organiza el ente sanitario o fundación local bajo control de SENASA, y su acta de vacunación es la que habilita a seguir moviendo hacienda.',
  },
  {
    name: 'Vacunación de brucelosis en terneras',
    text:
      'Junto con la primera campaña (o en la ventana que corresponda) se vacuna contra brucelosis a las terneras de entre 3 y 8 meses de edad con vacuna Cepa 19 o RB51, según el plan nacional. Es una vacunación única en la vida del animal hembra y también es obligatoria y controlada por SENASA.',
  },
  {
    name: 'Segunda campaña antiaftosa (segundo semestre)',
    text:
      'En la segunda campaña anual se revacuna contra la fiebre aftosa. Desde 2025/2026 alcanza únicamente a terneros y terneras: se dejan de vacunar sistemáticamente vaquillonas, novillos, novillitos y toritos. El mes exacto lo fija el Ente Sanitario de cada distrito.',
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
      'Ventana temporal, fijada por SENASA, durante la cual se vacuna de forma coordinada a los rodeos de una región. La campaña antiaftosa se realiza dos veces al año y la ejecutan los entes sanitarios o fundaciones locales. Fuera de la ventana no se emite acta de vacunación válida.',
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
/*  FAQ — las de la guía y las del régimen SENASA (que tienen fuente), */
/*  en un solo FAQPage. Cada respuesta arranca con el dato.            */
/* ------------------------------------------------------------------ */
const FAQ_GUIA: { pregunta: string; respuesta: string; fuentes?: string[] }[] = [
  {
    pregunta: '¿Cuándo se vacuna contra la aftosa?',
    respuesta:
      'La vacunación antiaftosa se hace en dos campañas al año: la primera alcanza a todo el rodeo (en 2026, de enero a abril, con el grueso del país en marzo) y la segunda, en el segundo semestre, solo a terneros y terneras. El día exacto por distrito lo fija el Plan Local del Ente Sanitario; no es el mismo en todo el país ni todos los años.',
    fuentes: ['aftosa_calendario_2026'],
  },
  {
    pregunta: '¿La vacunación antiaftosa es obligatoria?',
    respuesta:
      'Sí, la vacunación antiaftosa es obligatoria para todos los bovinos en las zonas de vacunación de Argentina. La ejecutan los entes sanitarios o fundaciones locales bajo control de SENASA, y la aplicación queda registrada en un acta de vacunación asociada al RENSPA del establecimiento.',
  },
  {
    pregunta: '¿Quién controla el calendario sanitario bovino?',
    respuesta:
      'SENASA (Servicio Nacional de Sanidad y Calidad Agroalimentaria) es el organismo nacional que regula el calendario sanitario: define las fechas de las campañas antiaftosa, el plan de brucelosis y las condiciones sanitarias para mover hacienda. En el terreno, la vacunación la ejecutan los entes sanitarios y fundaciones locales, pero la autoridad y el control son de SENASA.',
  },
  {
    pregunta: '¿Qué pasa si no vacuno contra la aftosa?',
    respuesta:
      'Si no se cumple la vacunación antiaftosa, el rodeo queda sin acta de vacunación vigente y SENASA no habilita la emisión del DT-e; sin DT-e no se puede trasladar, remitir a remate, vender ni enviar a faena la hacienda. Además pueden aplicarse sanciones. Es decir, saltear la campaña deja al campo sin poder operar comercialmente con su ganado.',
  },
  {
    pregunta: '¿Cuándo se vacuna la brucelosis?',
    respuesta:
      'La brucelosis se vacuna una sola vez en la vida de cada ternera hembra, entre los 3 y los 8 meses de edad, con vacuna Cepa 19 o RB51 según el plan nacional. Es obligatoria y controlada por SENASA, y en la práctica suele aplicarse coordinada con la primera campaña antiaftosa para aprovechar el trabajo de manga.',
  },
]
const FAQ = [...FAQ_GUIA, ...FAQ_SANIDAD]

export const metadata: Metadata = {
  title: 'Calendario sanitario bovino: vacunación antiaftosa y plan sanitario (SENASA)',
  description:
    'El calendario sanitario bovino 2026 con su resolución SENASA citada: campañas antiaftosa (Res. 711/2025), brucelosis, plan por época, el veterinario vacunador que elegís desde 2027 (Res. 201/2026), zonas con y sin vacunación y los requisitos para mover hacienda.',
  keywords: [
    'calendario sanitario bovino',
    'calendario sanitario bovino vacunacion antiaftosa',
    'vacunación antiaftosa 2026',
    'cuándo se vacuna la aftosa',
    'campaña antiaftosa senasa',
    'plan sanitario bovino',
    'vacunación brucelosis terneras',
    'calendario de vacunación ganado',
    'vacunas obligatorias bovinos argentina',
    'SENASA',
    'requisitos movimiento hacienda',
    'sanidad ganadera Argentina',
    'Res. SENASA 711/2025',
    'Res. SENASA 201/2026',
    'elección de vacunador aftosa 2027',
  ],
  openGraph: {
    title: 'Calendario sanitario bovino: vacunación antiaftosa y plan sanitario',
    description:
      'Las campañas antiaftosa 2026, brucelosis, el vacunador elegido desde 2027 y los requisitos para mover hacienda, cada regla con su resolución SENASA.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

function FuenteLinks({ keys }: { keys: string[] }) {
  const fuentes = fuentesDe(keys)
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xxs">
      {fuentes.map((f) => (
        <a
          key={f.norma}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-bright underline decoration-terminal-border underline-offset-2"
        >
          {f.norma} ↗
        </a>
      ))}
    </div>
  )
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
        description="Plan sanitario anual del rodeo bovino: primera campaña antiaftosa, vacunación de brucelosis en terneras, segunda campaña antiaftosa y antiparasitarios complementarios. Las fechas oficiales las fija SENASA."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ.map((f) => ({ question: f.pregunta, answer: f.respuesta }))} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Calendario sanitario bovino: vacunación antiaftosa y plan sanitario"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Sanidad ganadera · SENASA</p>
        <h1 className="text-zinc-100 text-2xl sm:text-3xl font-medium mb-6 text-balance">
          Calendario sanitario bovino: vacunación antiaftosa y plan sanitario
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6 max-w-3xl">
          El calendario sanitario bovino organiza las vacunaciones y tratamientos obligatorios y
          recomendados del año para un rodeo, siendo la campaña de vacunación antiaftosa —dos por
          año, regulada por SENASA— la práctica más importante, porque de su acta depende poder mover
          y vender la hacienda.
        </p>

        <p className="text-zinc-400 mb-6 max-w-3xl">
          El eje del calendario son las dos campañas anuales contra la fiebre aftosa: la primera alcanza
          a todo el rodeo y la segunda solo a terneros y terneras. Sobre ese eje se ordenan la vacunación
          única de brucelosis en las terneras y la sanidad complementaria (antiparasitarios,
          clostridiales, vacunas reproductivas) que recomienda el veterinario del establecimiento. Más
          abajo, el régimen completo: planes obligatorios, el cambio de vacunador de 2027 y lo que se
          exige para mover hacienda, cada regla con su resolución.
        </p>

        {/* Nota de fuentes */}
        <div className="rounded-terminal border border-terminal-border bg-terminal-panel px-4 py-3 text-data text-zinc-400">
          {SANIDAD_DISCLAIMER}{' '}
          Más allá de lo obligatorio, mirá las{' '}
          <Link href="/buenas-practicas" className="text-accent hover:text-accent-bright underline underline-offset-2">
            Buenas Prácticas Ganaderas
          </Link>
          .
        </div>

        {/* Índice navegable */}
        <nav aria-label="Índice" className="mt-6 flex flex-wrap gap-2 text-xxs">
          {[
            ['#aftosa', 'Vacunación aftosa 2026'],
            ['#por-epoca', 'Plan por época'],
            ['#planes', 'Planes sanitarios'],
            ['#vacunador-2027', 'Vacunador 2027'],
            ['#movimiento', 'Mover hacienda'],
            ['#renspa', 'Validar RENSPA'],
            ['#tramites', 'Trámites'],
            ['#faq', 'Preguntas frecuentes'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-terminal-border bg-terminal-panel px-3 py-1 text-zinc-400 hover:border-accent hover:text-accent transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Por qué la aftosa ordena el calendario */}
        <h2 className="text-zinc-200 text-lg font-medium mt-10 mb-3">
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

        {/* Calendario aftosa 2026 + zonas */}
        <section id="aftosa" className="scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Vacunación antiaftosa 2026</h2>
          <p className="text-data text-zinc-500 mb-4">
            Res. SENASA 711/2025. El día exacto por distrito lo fija el Plan Local del Ente Sanitario.
          </p>
          <div className="mb-6">
            <CalendarioMensual />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CALENDARIO_AFTOSA_2026.map((c) => (
              <div key={c.campana} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold text-ink">{c.campana} campaña</h3>
                  <span className="text-xxs text-accent">{c.ventana}</span>
                </div>
                <p className="mt-1 text-data text-zinc-200 font-medium">{c.categorias}</p>
                <p className="mt-2 text-data text-zinc-400">{c.detalle}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-terminal border border-terminal-border bg-terminal-panel p-4">
            <h3 className="text-data font-semibold text-ink mb-2">Zonas sanitarias</h3>
            <p className="text-data text-zinc-300">
              <span className="text-warning">Zona libre SIN vacunación:</span>{' '}
              {zonasSin.map((z) => z.provincia).join(', ')}.
            </p>
            {zonasMixtas.length > 0 && (
              <ul className="mt-2 space-y-1 text-xxs text-zinc-400">
                {zonasMixtas.map((z) => (
                  <li key={z.provincia}>
                    <span className="text-zinc-200">{z.provincia}</span> — {z.nota}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-data text-zinc-300">
              <span className="text-positive">Zona libre CON vacunación:</span> resto del país (norte y centro,
              unificada en mayo 2025).
            </p>
            <FuenteLinks keys={['aftosa_calendario_2026', 'aftosa_plan']} />
          </div>
        </section>

        {/* Calendario por época */}
        <section id="por-epoca" className="mt-10 scroll-mt-24">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El plan sanitario por época del año</h2>
          <p className="text-zinc-400 mb-4">
            El plan sanitario anual se ordena por estación, con picos en las dos campañas antiaftosa:
          </p>
          <ol className="text-zinc-400 mb-6 space-y-3 list-decimal pl-5">
            {PASOS.map((paso) => (
              <li key={paso.name}>
                <span className="text-zinc-300">{paso.name}.</span> {paso.text}
              </li>
            ))}
          </ol>

          <div className="overflow-x-auto mb-3">
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
                  <td className="px-3 py-2 text-zinc-300">Enero a abril</td>
                  <td className="px-3 py-2">Antiaftosa (1ª campaña)</td>
                  <td className="px-3 py-2">Todo el rodeo</td>
                  <td className="px-3 py-2">Obligatoria (SENASA)</td>
                </tr>
                <tr className="border-b border-terminal-border">
                  <td className="px-3 py-2 text-zinc-300">Con la 1ª campaña</td>
                  <td className="px-3 py-2">Brucelosis</td>
                  <td className="px-3 py-2">Terneras 3–8 meses</td>
                  <td className="px-3 py-2">Obligatoria, única (SENASA)</td>
                </tr>
                <tr className="border-b border-terminal-border">
                  <td className="px-3 py-2 text-zinc-300">2º semestre</td>
                  <td className="px-3 py-2">Antiaftosa (2ª campaña)</td>
                  <td className="px-3 py-2">Terneros y terneras</td>
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
          <p className="text-zinc-500 text-xs">
            Esquema de referencia. El alcance por categoría y las fechas exactas los define SENASA por
            región y campaña; verificá las fechas vigentes con tu Ente Sanitario.
          </p>
        </section>

        {/* Cómo funciona el sistema */}
        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Cómo funciona el sistema sanitario</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {COMO_FUNCIONA.map((c) => (
              <div key={c.titulo} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
                <h3 className="text-data font-semibold text-ink">{c.titulo}</h3>
                <p className="mt-2 text-data text-zinc-400">{c.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planes sanitarios */}
        <section id="planes" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Planes sanitarios obligatorios</h2>
          <p className="text-data text-zinc-500 mb-4">Bovinos y bubalinos. Cada ficha cita su resolución.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLANES.map((p) => (
              <article key={p.id} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-ink">{p.enfermedad}</h3>
                  {p.zoonosis && (
                    <span className="shrink-0 rounded-sm bg-negative/10 text-negative text-xxs px-1.5 py-0.5 uppercase tracking-wide">
                      Zoonosis
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xxs text-zinc-500 italic">{p.agente}</p>
                <dl className="mt-3 space-y-2 text-data text-zinc-300">
                  <div>
                    <dt className="text-xxs uppercase tracking-wide text-zinc-500">Régimen</dt>
                    <dd>{p.regimen}</dd>
                  </div>
                  <div>
                    <dt className="text-xxs uppercase tracking-wide text-zinc-500">Categorías afectadas</dt>
                    <dd>{p.categorias_afectadas}</dd>
                  </div>
                </dl>
                <FuenteLinks keys={p.fuentes} />
              </article>
            ))}
          </div>
        </section>

        {/* Vacunador elegido desde 2027 — Res. 201/2026 + Disp. DNSA 27/2026 */}
        <section id="vacunador-2027" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Elegir el veterinario que vacuna: cambio 2027</h2>
          <p className="text-data text-zinc-500 mb-4">
            Res. SENASA 201/2026, reglamentada por la Disp. DNSA 27/2026. {VACUNADOR_2027.vigencia}.
          </p>
          <div className="rounded-terminal border border-accent/40 bg-terminal-panel p-4">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-ink">Plazo para informar la elección</h3>
              <span className="text-data font-semibold text-accent">{VACUNADOR_2027.plazo}</span>
            </div>
            <p className="mt-1 text-xxs text-zinc-500">{VACUNADOR_2027.plazo_detalle}</p>
            <p className="mt-3 text-data text-zinc-300">{VACUNADOR_2027.resumen}</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {VACUNADOR_2027.puntos.map((p) => (
              <div key={p.titulo} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4 sm:last:col-span-2">
                <h3 className="text-data font-semibold text-ink">{p.titulo}</h3>
                <p className="mt-2 text-data text-zinc-400">{p.texto}</p>
              </div>
            ))}
          </div>
          <FuenteLinks keys={VACUNADOR_2027.fuentes} />
        </section>

        {/* Requisitos de movimiento */}
        <section id="movimiento" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Requisitos para mover hacienda</h2>
          <p className="text-data text-zinc-500 mb-4">
            Bovinos. El DT-e se emite en SIGSA (requiere clave fiscal ARCA); acá está qué se exige.
          </p>
          <div className="rounded-terminal border border-terminal-border bg-terminal-panel divide-y divide-terminal-border">
            {REQUISITOS_MOVIMIENTO.map((r) => (
              <div key={r.concepto} className="p-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-data font-semibold text-ink">{r.concepto}</h3>
                  <span className="text-xxs text-zinc-500">
                    {fuentesDe(r.fuentes).map((f) => f.norma).join(' · ')}
                  </span>
                </div>
                <p className="mt-1 text-data text-zinc-300">{r.regla}</p>
              </div>
            ))}
          </div>
        </section>

        {/* RENSPA → herramienta aparte */}
        <section id="renspa" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Validar / decodificar un RENSPA</h2>
          <p className="text-data text-zinc-500 mb-4">
            El RENSPA (17 caracteres, formato 00.000.0.00000.00) identifica productor + establecimiento +
            actividad, y es la base para vacunar y emitir el DT-e.
          </p>
          <Link
            href="/renspa"
            className="inline-flex items-center gap-2 rounded-terminal border border-accent/40 bg-accent/10 px-4 py-2 text-data text-accent hover:bg-accent/20 transition-colors"
          >
            Abrir el validador de RENSPA →
          </Link>
        </section>

        {/* Trámites */}
        <section id="tramites" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Trámites</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TRAMITES.map((t) => (
              <a
                key={t.titulo}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-terminal border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors"
              >
                <h3 className="text-data font-semibold text-ink group-hover:text-accent">{t.titulo} ↗</h3>
                <p className="mt-1 text-data text-zinc-400">{t.descripcion}</p>
              </a>
            ))}
          </div>
        </section>

        {/* FAQ — mismo array que el FAQPageSchema */}
        <section id="faq" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.pregunta} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4 group">
                <summary className="cursor-pointer text-data font-medium text-zinc-100 marker:text-accent list-disc list-inside">
                  {f.pregunta}
                </summary>
                <p className="mt-2 text-data text-zinc-400">{f.respuesta}</p>
                {f.fuentes && f.fuentes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 text-xxs">
                    {fuentesDe(f.fuentes).map((x) => (
                      <a key={x.norma} href={x.url} target="_blank" rel="noopener noreferrer" className="text-accent/80 hover:text-accent">
                        {x.norma} ↗
                      </a>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>

        {/* CTA MCP / IA */}
        <section className="mt-10 rounded-terminal border border-accent/30 bg-accent/5 p-5">
          <h2 className="text-base font-semibold text-ink">Consultá esto con un agente de IA</h2>
          <p className="mt-2 text-data text-zinc-300">
            Estos datos también se exponen como <span className="text-accent">5 tools MCP</span> —
            <code className="text-accent"> sanidad_plan</code>, <code className="text-accent">sanidad_calendario_aftosa</code>,{' '}
            <code className="text-accent">sanidad_requisitos_movimiento</code>, <code className="text-accent">sanidad_renspa</code> y{' '}
            <code className="text-accent">sanidad_dte_tropa</code> — para que Claude, Cursor u otro agente respondan
            “¿qué tengo que vacunar este mes?” o “¿qué necesito para mover de Corrientes a Buenos Aires?” citando la resolución.
          </p>
          <Link href="/mcp" className="mt-3 inline-block text-data text-accent hover:text-accent-bright underline underline-offset-2">
            Ver el servidor MCP →
          </Link>
        </section>

        {/* Fuentes maestras */}
        <section className="mt-8 border-t border-terminal-border pt-5">
          <h2 className="text-xxs uppercase tracking-widest text-zinc-500 mb-2">Fuentes oficiales</h2>
          <ul className="grid gap-1 sm:grid-cols-2 text-xxs">
            {Object.values(FUENTES).map((f) => (
              <li key={f.norma}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-accent">
                  {f.norma} — {f.titulo}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Links internos */}
        <div className="mt-8 border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
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

        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; las fechas oficiales de cada campaña las fija SENASA y el día por
          distrito, el Ente Sanitario. Actualizado:{' '}{lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
