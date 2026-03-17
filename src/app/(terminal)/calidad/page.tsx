import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Calidad de Datos — Consignatarias.com.ar',
  description: 'Fuentes de datos, metodologia de recoleccion, validacion y frescura de la informacion en Consignatarias.com.ar. 9 fuentes, actualizacion diaria a las 14:00 ART.',
  openGraph: {
    title: 'Calidad de Datos — Consignatarias.com.ar',
    description: 'Fuentes de datos, metodologia y frescura de la informacion ganadera en Consignatarias.com.ar.',
    url: 'https://www.consignatarias.com.ar/calidad',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/calidad',
  },
}

export default function CalidadPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="calidad" sectionName="Calidad de Datos" />
      <TechArticleSchema
        name="Calidad de Datos y Metodología — Consignatarias.com.ar"
        description="Fuentes de datos, metodología de recolección, validación y frescura de la información ganadera en Consignatarias.com.ar. 9 fuentes oficiales, actualización diaria."
        url="https://www.consignatarias.com.ar/calidad"
      />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">Calidad de Datos &amp; Metodologia</h1>

        <p className="text-zinc-400 mb-6">
          Consignatarias.com.ar se compromete con la transparencia y precision de sus datos.
          Esta pagina detalla nuestras fuentes, el proceso de recoleccion y validacion,
          y los compromisos de frescura y cobertura.
        </p>

        {/* ── FUENTES DE DATOS ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Fuentes de datos</h2>
        <p className="text-zinc-400 mb-3">
          Integramos 9 fuentes publicas y oficiales, cada una especializada en un aspecto del mercado ganadero:
        </p>

        <div className="space-y-3 mb-6">
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">CACG &mdash; Camara Argentina de Consignatarios de Ganado</p>
            <p className="text-zinc-500 text-xs">
              API publica con ~128 remates de consignatarias asociadas. Fuente primaria de remates a nivel nacional.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Colombo y Colombo SA</p>
            <p className="text-zinc-500 text-xs">
              Scraping del calendario web. Remates en Buenos Aires, Santa Fe y Corrientes.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Ivan L. O&apos;Farrell Consignataria</p>
            <p className="text-zinc-500 text-xs">
              Scraping del calendario web. Remates en Chaco y Santiago del Estero.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Cooperativa Guillermo Lehmann</p>
            <p className="text-zinc-500 text-xs">
              Scraping del calendario web. Remates de hacienda en Santa Fe.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Madelan SA</p>
            <p className="text-zinc-500 text-xs">
              Scraping del calendario web. Remates con streaming en el NEA.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">UMC Haciendas Villaguay</p>
            <p className="text-zinc-500 text-xs">
              Scraping del calendario web. Remates de hacienda en Entre Rios.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">dolarapi.com</p>
            <p className="text-zinc-500 text-xs">
              API JSON con cotizacion del dolar blue y oficial en tiempo real.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Mercado Agroganadero (mercadoagroganadero.com.ar)</p>
            <p className="text-zinc-500 text-xs">
              Scraping del indice INMAG ($/kg vivo) y precios por categoria de hacienda.
            </p>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-200 font-medium text-xs mb-1">Ministerio de Agricultura (MAGYP)</p>
            <p className="text-zinc-500 text-xs">
              API oficial con precios de maiz FOB y registro nacional de frigorificos habilitados (SENASA).
            </p>
          </div>
        </div>

        <p className="text-zinc-500 text-xs mb-6">
          Ademas, se incorporan datos manuales de: IderCor, Etchevehere Rural, Coop. La Ganadera,
          Tradicion Ganadera, Nangapiry SA, Reggi y Cia, Nestor Hugo Fuentes, Ganaderos de Formosa
          y eventos (Expoagro, Agroactiva, Expo Rural).
        </p>

        {/* ── METODOLOGIA ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Metodologia</h2>
        <p className="text-zinc-400 mb-3">
          El pipeline de datos se ejecuta diariamente y sigue 4 etapas:
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">01</span>
            <div>
              <p className="text-zinc-200 font-medium text-xs mb-1">Recoleccion</p>
              <p className="text-zinc-500 text-xs">
                Un scraper automatizado consulta las 9 fuentes en paralelo cada dia a las 14:00 ART
                (17:00 UTC) via GitHub Actions. Las fuentes manuales (no scrapeables) se preservan entre ejecuciones.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">02</span>
            <div>
              <p className="text-zinc-200 font-medium text-xs mb-1">Normalizacion</p>
              <p className="text-zinc-500 text-xs">
                Cada remate se normaliza: las provincias se corrigen usando un mapa de ~70 ciudades
                (CITY_PROVINCE_MAP), los nombres se estandarizan y las fechas se validan al formato ISO.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">03</span>
            <div>
              <p className="text-zinc-200 font-medium text-xs mb-1">Deduplicacion</p>
              <p className="text-zinc-500 text-xs">
                Los remates se deduplican por la combinacion de fecha + slug de consignataria + localidad,
                evitando duplicados cuando varias fuentes reportan el mismo evento.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">04</span>
            <div>
              <p className="text-zinc-200 font-medium text-xs mb-1">Validacion y publicacion</p>
              <p className="text-zinc-500 text-xs">
                Los datos validados se escriben en archivos JSON (remates.json, market-prices.json),
                se hace commit automatico al repositorio y se dispara una reconstruccion del sitio en Vercel.
              </p>
            </div>
          </div>
        </div>

        {/* ── FRESCURA ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Frescura de los datos</h2>
        <ul className="space-y-2 text-zinc-400 mb-6">
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Remates y precios de mercado:</strong> actualizacion diaria a las 14:00 ART.
              Los datos de precios (INMAG, dolar, maiz) se actualizan en cada ejecucion del scraper.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Perfiles reclamados:</strong> los perfiles de consignatarias verificadas
              se regeneran via ISR (Incremental Static Regeneration) cada 5 minutos.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Directorio de frigorificos:</strong> actualizado periodicamente
              en base al registro oficial de SENASA/MAGYP.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Etiquetas de frescura:</strong> los remates pasados muestran
              indicadores como &quot;AYER&quot; o &quot;HACE N DIAS&quot; para facilitar la lectura temporal.
            </span>
          </li>
        </ul>

        {/* ── COBERTURA ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Cobertura</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-zinc-800 rounded p-3 text-center">
            <p className="text-zinc-100 text-xl font-medium">385+</p>
            <p className="text-zinc-500 text-xs">Remates indexados</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <p className="text-zinc-100 text-xl font-medium">77</p>
            <p className="text-zinc-500 text-xs">Consignatarias</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <p className="text-zinc-100 text-xl font-medium">364</p>
            <p className="text-zinc-500 text-xs">Frigorificos</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <p className="text-zinc-100 text-xl font-medium">10</p>
            <p className="text-zinc-500 text-xs">Provincias</p>
          </div>
        </div>
        <p className="text-zinc-500 text-xs mb-6">
          Provincias cubiertas: Buenos Aires, Chaco, Cordoba, Corrientes, Entre Rios, Formosa,
          La Pampa, Misiones, San Luis, Santa Fe y Santiago del Estero.
        </p>

        {/* ── REPORTAR ERRORES ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Reportar errores</h2>
        <p className="text-zinc-400 mb-6">
          Si encontras un dato incorrecto, un remate faltante o informacion desactualizada,
          por favor escribinos a{' '}
          <a href="mailto:agro@memola.com.ar" className="text-accent hover:underline">
            agro@memola.com.ar
          </a>
          . Revisamos cada reporte e incorporamos correcciones dentro de las 24 horas habiles.
        </p>

        {/* ── SLA INFORMAL ── */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Compromisos de servicio</h2>
        <ul className="space-y-2 text-zinc-400 mb-6">
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Disponibilidad:</strong> los datos del dia estan publicados
              antes de las 14:30 ART, cada dia habil.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Uptime:</strong> 99%+ gracias a generacion estatica (SSG) y
              distribucion global via Vercel CDN. TTFB &lt; 50ms.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Correcciones:</strong> errores reportados se corrigen dentro
              de las 24 horas habiles.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 shrink-0">&bull;</span>
            <span>
              <strong className="text-zinc-300">Transparencia:</strong> el codigo del scraper y la metodologia
              son auditables. Ante cualquier duda, contactanos.
            </span>
          </li>
        </ul>

        {/* Related links */}
        <div className="mt-10 border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">Glosario ganadero</Link>
          <Link href="/quienes-somos" className="text-zinc-500 hover:text-accent transition-colors">Quiénes somos</Link>
          <Link href="/planes" className="text-zinc-500 hover:text-accent transition-colors">Planes</Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">Ver remates</Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Ultima actualizacion de esta pagina: Marzo 2026. Memola Medios S.A.S. &mdash; Todos los derechos reservados.
        </p>
      </div>
    </>
  )
}
