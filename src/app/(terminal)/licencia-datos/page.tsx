import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const UPDATED = '29 de julio de 2026'

/**
 * Licencia de uso de datos — la vidriera de lo que se puede hacer gratis (citar) y
 * de lo que requiere licencia (redistribuir, incorporar a un producto, usar como
 * referencia contractual). Complementa /terminos (sección 9, propiedad intelectual):
 * los términos prohíben; esta página pone precio y camino.
 *
 * REGLA DE HONESTIDAD (no romper): el INMAG es índice y marca del Mercado
 * Agroganadero — lo republicamos con cita, no lo licenciamos. Lo licenciable es
 * NUESTRO trabajo: compilaciones, índices propios derivados y el servicio.
 */
export const metadata: Metadata = {
  title: 'Licencia de uso de datos — citar es gratis, redistribuir se licencia',
  description:
    'Cómo usar los datos de consignatarias.com.ar: citar con atribución es libre y gratuito. Republicar nuestras compilaciones (calendario de remates, directorio, índices propios) o incorporarlas a un producto requiere licencia. El INMAG es índice del Mercado Agroganadero: lo republicamos con cita, no lo licenciamos.',
  keywords: [
    'licencia de datos ganaderos',
    'citar consignatarias.com.ar',
    'redistribuir datos de remates',
    'licencia índice ganadero',
    'atribución datos mercado ganadero',
  ],
  openGraph: {
    title: 'Licencia de uso de datos — consignatarias.com.ar',
    description:
      'Citar con atribución es gratis. Redistribuir nuestras compilaciones o usarlas en un producto propio requiere licencia. Tres niveles, con precio publicado.',
    url: `${BASE_URL}/licencia-datos`,
    type: 'article',
  },
  alternates: { canonical: `${BASE_URL}/licencia-datos` },
}

const NIVELES = [
  {
    nombre: 'Atribución',
    precio: 'Gratis',
    para: 'Productores, medios, académicos, agentes de IA, cualquiera.',
    incluye: [
      'Consultar todo el observatorio y las herramientas.',
      'Citar un dato puntual en una nota, informe, tesis, posteo o respuesta de un asistente de IA.',
      'Capturas de pantalla y enlaces, sin límite.',
      'Uso interno en la operación diaria de tu firma o establecimiento.',
    ],
    condicion: 'Citar la fuente con enlace (ver más abajo el formato exacto). Sin republicación sistemática.',
    destacado: false,
  },
  {
    nombre: 'Publicación',
    precio: 'ARS 150.000/mes',
    para: 'Medios, consignatarias y plataformas que quieren publicar nuestros datos con su marca.',
    incluye: [
      'Republicar de forma sistemática y recurrente nuestras compilaciones: calendario de remates, panel de precios por categoría, índices propios derivados.',
      'Hasta 3 destinos (web, newsletter, informe periódico, pantalla en salón).',
      'Cita de fuente obligatoria, en formato acordado.',
      'Actualización por el canal que prefieras (API, planilla, feed).',
    ],
    condicion: 'No habilita reventa a terceros ni incorporación a un producto de datos propio.',
    destacado: true,
  },
  {
    nombre: 'Producto',
    precio: 'Desde ARS 400.000/mes',
    para: 'Software, apps, agtechs, bancos y agentes que incorporan los datos a su propio producto.',
    incluye: [
      'Uso de nuestras compilaciones e índices propios dentro de tu producto, app, modelo o feed interno.',
      'Acceso Enterprise por API y MCP incluido, con cupos y SLA del plan.',
      'Serie histórica completa y normalizada en dólares.',
      'Soporte con persona, no formulario.',
    ],
    condicion: 'Alcance, volumen y sublicencia se definen por escrito en el acuerdo.',
    destacado: false,
  },
]

export default function LicenciaDatosPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="licencia-datos" sectionName="Licencia de uso de datos" />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <h1 className="text-zinc-100 text-2xl font-medium mb-3">Licencia de uso de datos</h1>
        <p className="text-zinc-500 text-xs mb-6">Vigente desde el {UPDATED}</p>

        <p className="text-zinc-300 text-base mb-6">
          Citar nuestros datos es <strong className="text-zinc-100">gratis y lo alentamos</strong>. Republicarlos
          de forma sistemática, o incorporarlos a un producto propio, requiere licencia. Esta página dice
          exactamente dónde está la línea y cuánto cuesta cruzarla — sin que tengas que hablar con un vendedor
          para enterarte.
        </p>

        {/* Qué es nuestro y qué no — la parte que sostiene la credibilidad */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué licenciamos y qué no</h2>
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4 mb-4">
          <p className="text-zinc-300 font-medium mb-2">No licenciamos el INMAG.</p>
          <p className="text-zinc-400 mb-3">
            El <strong className="text-zinc-200">INMAG es un índice y una marca del Mercado Agroganadero
            (MAG)</strong>. Lo reproducimos y republicamos con cita de fuente, sin arrogarnos su titularidad:
            si querés publicar el número del día, la fuente es el MAG y no necesitás permiso nuestro. Tampoco
            licenciamos los registros públicos subyacentes (SENASA, MAGYP, resoluciones): son información
            pública y no son objeto de apropiación.
          </p>
          <p className="text-zinc-300 font-medium mb-2">Sí licenciamos nuestro trabajo sobre esos datos.</p>
          <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
            <li>
              El <strong className="text-zinc-200">calendario de remates de hacienda de Argentina</strong>:
              relevamiento diario, normalización, geolocalización y cruce con transmisiones en vivo.
            </li>
            <li>
              El <strong className="text-zinc-200">directorio de consignatarias</strong> y la base de{' '}
              <strong className="text-zinc-200">frigoríficos habilitados</strong>, con su curaduría y
              enriquecimiento.
            </li>
            <li>
              Nuestros <strong className="text-zinc-200">índices propios derivados</strong> — entre ellos el
              Índice de Liquidación (participación de hembras en la hacienda operada) y los rankings de
              actividad por firma.
            </li>
            <li>
              La <strong className="text-zinc-200">serie histórica archivada y normalizada</strong> (continuidad
              diaria desde 2015, conversión a dólares, control de huecos).
            </li>
            <li>
              El <strong className="text-zinc-200">servicio</strong>: acceso por API y MCP, cupos, SLA, entrega
              en bloque y soporte.
            </li>
          </ul>
        </div>
        <p className="text-zinc-400 mb-8">
          En una línea: el dato público es de todos; <strong className="text-zinc-200">la compilación, el
          archivo y el índice derivado son nuestros</strong>, y eso es lo que se licencia. Ver{' '}
          <Link href="/terminos" className="text-accent hover:text-accent-bright">
            términos
          </Link>{' '}
          (sección 9) y{' '}
          <Link href="/metodologia" className="text-accent hover:text-accent-bright">
            metodología
          </Link>
          .
        </p>

        {/* Niveles */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Tres niveles</h2>
        <div className="space-y-4 mb-8">
          {NIVELES.map((n) => (
            <div
              key={n.nombre}
              className={`border rounded-lg p-5 ${
                n.destacado ? 'border-accent/50 bg-accent/[0.04]' : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <h3 className="text-zinc-100 text-base font-medium">{n.nombre}</h3>
                <span className={`font-mono text-sm ${n.destacado ? 'text-accent' : 'text-zinc-300'}`}>
                  {n.precio}
                </span>
              </div>
              <p className="text-zinc-500 text-xs mb-3">{n.para}</p>
              <ul className="text-zinc-400 space-y-1.5 list-disc pl-5 mb-3">
                {n.incluye.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="text-zinc-500 text-xs">{n.condicion}</p>
            </div>
          ))}
        </div>

        {/* Cómo citar — genera la norma y nos trae enlaces */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo citarnos</h2>
        <p className="text-zinc-400 mb-3">
          Para una nota, un informe o la respuesta de un asistente de IA, alcanza con esto:
        </p>
        <pre className="border border-zinc-800 rounded bg-zinc-950 p-3 mb-3 text-xs text-zinc-300 overflow-x-auto">
          Fuente: consignatarias.com.ar — el mercado ganadero argentino, medido.
          https://www.consignatarias.com.ar
        </pre>
        <p className="text-zinc-400 mb-3">
          Si el dato es un precio de mercado, sumá la fecha de la rueda y el origen primario. Por ejemplo:
        </p>
        <pre className="border border-zinc-800 rounded bg-zinc-950 p-3 mb-8 text-xs text-zinc-300 overflow-x-auto">
          INMAG del 24-07-2026 (Mercado Agroganadero), vía consignatarias.com.ar
        </pre>

        {/* Referencia contractual — el producto Urner Barry */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Uso como referencia en contratos</h2>
        <p className="text-zinc-400 mb-8">
          Si querés que un contrato liquide contra uno de nuestros índices propios —un engorde a maquila, un
          arrendamiento indexado, una operación consignada—, hablamos y lo acordamos por escrito. Ese uso
          incluye metodología publicada y versionada, aviso previo de cambios y derecho de auditoría de la
          contraparte. Es un acuerdo a medida: escribinos con el caso.
        </p>

        {/* Prohibiciones */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Lo que no está permitido en ningún nivel</h2>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <strong className="text-zinc-200">Extracción masiva o sistemática</strong> de la base de datos
            (scraping, crawling automatizado del contenido, réplica de secciones completas) sin acuerdo escrito,
            cualquiera sea la herramienta o el agente que la ejecute.
          </li>
          <li>
            <strong className="text-zinc-200">Minería de datos para competir</strong>: usar nuestras
            compilaciones o índices para diseñar, entrenar o desarrollar un producto de datos, índice o servicio
            informativo que compita con el nuestro.
          </li>
          <li>
            <strong className="text-zinc-200">Entrenamiento de modelos</strong> con nuestras compilaciones o
            series históricas sin acuerdo escrito. El uso por asistentes de IA para <em>responder</em> una
            consulta y citarnos sí está permitido y bienvenido — es distinto de incorporar la base al modelo.
          </li>
          <li>Presentar nuestros datos como propios, o sin cita de fuente cuando la cita es exigible.</li>
          <li>Reventa o sublicencia a terceros sin que el acuerdo lo prevea expresamente.</li>
        </ul>

        {/* CTA */}
        <div className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-200 font-medium mb-1">¿Ya estás publicando nuestros datos?</p>
          <p className="text-zinc-400 mb-3">
            No es un problema: es una conversación. Escribinos y lo ordenamos — en general se resuelve con la
            cita de fuente o con el nivel Publicación, y en el camino te damos un canal de actualización mejor
            que el que estés usando.
          </p>
          <a
            href="mailto:agro@memola.com.ar?subject=Licencia%20de%20datos%20-%20consignatarias.com.ar"
            className="inline-block px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
          >
            agro@memola.com.ar
          </a>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/terminos" className="text-zinc-500 hover:text-accent transition-colors">
            Términos y condiciones →
          </Link>
          <Link href="/metodologia" className="text-zinc-500 hover:text-accent transition-colors">
            Metodología
          </Link>
          <Link href="/planes" className="text-zinc-500 hover:text-accent transition-colors">
            Planes y API
          </Link>
          <Link href="/mcp" className="text-zinc-500 hover:text-accent transition-colors">
            Servidor MCP
          </Link>
        </div>

        <p className="text-zinc-500 text-xs mt-4">
          Memola Medios S.A.S. — CUIT 30-71863222-2. Esta página describe la política de licenciamiento y no
          reemplaza el acuerdo escrito que rige cada caso.
        </p>
      </div>
    </>
  )
}
