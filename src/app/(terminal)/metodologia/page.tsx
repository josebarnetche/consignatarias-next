import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'
import { FileText, Database, BarChart3, Shield, Calendar, Users, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Metodología del Índice de Precios',
  description: 'Metodología completa del Índice de Precios Consignatarias (IPC): fuentes de datos, cálculo, ponderaciones, cobertura geográfica y gobernanza. Transparencia total.',
  openGraph: {
    title: 'Metodología del Índice de Precios',
    description: 'Metodología del Índice de Precios Consignatarias: fuentes, cálculo, cobertura y gobernanza.',
    url: 'https://www.consignatarias.com.ar/metodologia',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/metodologia',
  },
}

export default function MetodologiaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="metodologia" sectionName="Metodología" />
      <TechArticleSchema
        name="Metodología del Índice de Precios Consignatarias"
        description="Metodología completa del Índice de Precios Consignatarias (IPC): fuentes de datos oficiales, cálculo VWAP, ponderaciones por categoría, cobertura de 5 provincias y gobernanza transparente."
        url="https://www.consignatarias.com.ar/metodologia"
      />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Header */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-2">
          Metodología del Índice de Precios
        </h1>
        <p className="text-zinc-500 text-xs mb-6">
          Versión 1.2 — Junio 2026 — Memola Medios S.A.S.
        </p>

        <p className="text-zinc-400 mb-8">
          El Índice de Precios Consignatarias (IPC) es un indicador de precios de hacienda en pie 
          calculado a partir de datos observados en remates públicos. Este documento detalla la 
          metodología completa para garantizar <span className="text-zinc-200">transparencia</span> y{' '}
          <span className="text-zinc-200">trazabilidad</span>.
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="border border-zinc-800 rounded p-3 text-center">
            <Database className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">12</p>
            <p className="text-zinc-500 text-xs">Provincias</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <BarChart3 className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">6</p>
            <p className="text-zinc-500 text-xs">Categorías</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">2015→</p>
            <p className="text-zinc-500 text-xs">Histórico (11 años)</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <Users className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">104</p>
            <p className="text-zinc-500 text-xs">Consignatarias</p>
          </div>
        </div>

        {/* Section 1: Fuentes */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          1. Fuentes de Datos
        </h2>
        
        <h3 className="text-zinc-300 font-medium mb-2">Fuente Primaria: MAG (Mercado Agroganadero S.A.)</h3>
        <p className="text-zinc-400 mb-3">
          Integración directa con Mercado Agroganadero S.A., la fuente oficial del sector ganadero argentino.
          Precios observados reales, no sintéticos.
        </p>
        <div className="border border-zinc-800 rounded overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900">
              <tr>
                <th className="text-left text-zinc-400 p-2">Endpoint MAG</th>
                <th className="text-left text-zinc-400 p-2">Datos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr><td className="text-zinc-300 p-2 font-mono">haciinfo000011</td><td className="text-zinc-400 p-2">INMAG diario + volumen</td></tr>
              <tr><td className="text-zinc-300 p-2 font-mono">haciinfo000002</td><td className="text-zinc-400 p-2">Precios por categoría</td></tr>
              <tr><td className="text-zinc-300 p-2 font-mono">haciinfo000003</td><td className="text-zinc-400 p-2">Entrada por provincia</td></tr>
              <tr><td className="text-zinc-300 p-2 font-mono">haciinfo000006</td><td className="text-zinc-400 p-2">Entrada por consignatario</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="text-zinc-400 space-y-1 mb-4 list-disc list-inside">
          <li><span className="text-zinc-300">Categorías:</span> Novillo, Novillito, Vaquillona, Vaca, Toro, Ternero</li>
          <li><span className="text-zinc-300">Unidad:</span> Pesos argentinos por kilogramo vivo (ARS/kg)</li>
          <li><span className="text-zinc-300">Frecuencia:</span> Diaria (actualización 14:00 ART)</li>
          <li><span className="text-zinc-300">Método:</span> API scraping automatizado + validación cruzada</li>
          <li><span className="text-zinc-300">Volumen:</span> Cabezas por operación (para cálculo VWAP)</li>
        </ul>

        <h3 className="text-zinc-300 font-medium mb-2">Validación de Datos</h3>
        <div className="border border-zinc-800 rounded p-3 mb-6">
          <ol className="text-zinc-400 space-y-2 list-decimal list-inside text-xs">
            <li>Validación de rango (precio dentro de límites históricos ±3σ)</li>
            <li>Comparación con día anterior (alertas si variación {'>'} 10%)</li>
            <li>Cruce con fuentes secundarias (SENASA SIO cuando disponible)</li>
          </ol>
        </div>

        {/* Section 2: Cálculo */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-500" />
          2. Cálculo del Índice
        </h2>

        <h3 className="text-zinc-300 font-medium mb-2">Ponderaciones por Categoría</h3>
        <p className="text-zinc-400 mb-3">
          El índice general se calcula como promedio ponderado basado en la composición típica de faena:
        </p>
        <div className="border border-zinc-800 rounded overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900">
              <tr>
                <th className="text-left text-zinc-400 p-2">Categoría</th>
                <th className="text-right text-zinc-400 p-2">Ponderación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr><td className="text-zinc-300 p-2">Novillo</td><td className="text-zinc-400 text-right p-2">35%</td></tr>
              <tr><td className="text-zinc-300 p-2">Ternero</td><td className="text-zinc-400 text-right p-2">25%</td></tr>
              <tr><td className="text-zinc-300 p-2">Vaquillona</td><td className="text-zinc-400 text-right p-2">20%</td></tr>
              <tr><td className="text-zinc-300 p-2">Vaca</td><td className="text-zinc-400 text-right p-2">15%</td></tr>
              <tr><td className="text-zinc-300 p-2">Toro</td><td className="text-zinc-400 text-right p-2">5%</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-zinc-300 font-medium mb-2">VWAP (Precio Promedio Ponderado por Volumen)</h3>
        <p className="text-zinc-400 mb-4">
          Cuando datos de volumen (cabezas) están disponibles, calculamos VWAP para mayor precisión:
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3 mb-4 font-mono text-xs text-zinc-300">
          VWAP = Σ (Precio × Volumen) / Σ Volumen
        </div>

        {/* Section 3: Cobertura */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          3. Cobertura Geográfica
        </h2>

        <p className="text-zinc-400 mb-4">
          El directorio cubre <span className="text-zinc-200">104 consignatarias en 12 provincias</span>,
          con mayor densidad en la Pampa Húmeda y el Litoral (Buenos Aires, Santa Fe, Córdoba,
          Corrientes, Entre Ríos) y presencia en NEA, NOA, Cuyo y Patagonia.
        </p>

        <h3 className="text-zinc-300 font-medium mb-2">Cobertura del índice vs. el mercado real</h3>
        <div className="border border-amber-800/40 bg-amber-900/10 rounded p-4 mb-4">
          <p className="text-zinc-300 text-xs mb-2">
            Principio de honestidad: <span className="text-amber-400">el índice no es el mercado entero, y lo decimos.</span>
          </p>
          <ul className="text-zinc-400 space-y-1.5 list-disc list-inside text-xs">
            <li>El <span className="text-zinc-200">INMAG</span> observa el canal formal del Mercado Agroganadero de Cañuelas — aproximadamente el <span className="text-zinc-200">~12% del rodeo nacional</span>. Es la referencia que el mercado sigue, pero no el universo completo.</li>
            <li>La FCV-UBA estima que <span className="text-zinc-200">~71% de la hacienda argentina se opera fuera de pantalla</span> (estancia a estancia, venta directa a frigorífico, «restos») — el segmento opaco que ningún índice observa hoy.</li>
            <li>Nuestra posición editorial: la transparencia real exige reconocer ese 71%. Ser su referencia citable —no fingir cobertura total— es el objetivo del proyecto.</li>
          </ul>
        </div>

        <h3 className="text-zinc-300 font-medium mb-2">Limitaciones Conocidas</h3>
        <ul className="text-zinc-400 space-y-1 mb-6 list-disc list-inside text-xs">
          <li>Mayor cobertura en NEA/Litoral vs. Pampa Húmeda en el directorio de remates</li>
          <li>Datos de volumen incompletos en ~70% de remates (el VWAP cae a promedio simple cuando falta volumen)</li>
          <li>Latencia T+1 (datos del día siguiente al remate)</li>
          <li>El INMAG lo publica el MAG; nosotros lo replicamos, archivamos (desde 2015) y lo superponemos con USD — no lo calculamos</li>
        </ul>

        {/* Section 4: Acceso */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          4. Publicación y Acceso
        </h2>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="border border-zinc-800 rounded p-3">
            <p className="text-zinc-300 font-medium text-xs mb-2">Acceso Público</p>
            <ul className="text-zinc-500 text-xs space-y-1">
              <li>• Índice general diario</li>
              <li>• Precios por categoría</li>
              <li>• Histórico 365 días</li>
              <li>• API REST gratuita</li>
            </ul>
          </div>
          <div className="border border-amber-800/50 bg-amber-900/10 rounded p-3">
            <p className="text-amber-500 font-medium text-xs mb-2">Acceso PRO</p>
            <ul className="text-zinc-400 text-xs space-y-1">
              <li>• Datos por provincia</li>
              <li>• Datos por consignataria</li>
              <li>• Exportación bulk</li>
              <li>• Alertas de precio</li>
            </ul>
          </div>
        </div>

        {/* Links */}
        <div className="border-t border-zinc-800 pt-6 mt-8">
          <p className="text-zinc-400 text-xs mb-4">Acceder a los datos:</p>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/mercado/inmag" 
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5"
            >
              Ver precios en vivo <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              href="/mercado/spread" 
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5"
            >
              Spread Maíz-Novillo <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5"
            >
              Documentación API <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/enterprise#licencia-datos"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-700/50 rounded px-3 py-1.5"
            >
              Licencia institucional <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Governance */}
        <div className="border-t border-zinc-800 pt-6 mt-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-4">Gobernanza</h2>
          <div className="text-zinc-400 text-xs space-y-2">
            <p><span className="text-zinc-300">Responsable:</span> Memola Medios S.A.S. (CUIT: 30-71863222-2)</p>
            <p><span className="text-zinc-300">Revisión:</span> Trimestral (ponderaciones) / Anual (metodología completa)</p>
            <p><span className="text-zinc-300">Contacto:</span> agro@memola.com.ar</p>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-zinc-800 pt-6 mt-8">
          <p className="text-zinc-500 text-xs mb-3">Documentación relacionada:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/calidad" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
              Calidad de Datos
            </Link>
            <span className="text-zinc-700">•</span>
            <Link href="/preguntas-frecuentes" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
              Preguntas Frecuentes
            </Link>
            <span className="text-zinc-700">•</span>
            <Link href="/quienes-somos" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
              Quiénes Somos
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
