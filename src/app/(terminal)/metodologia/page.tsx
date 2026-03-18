import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'
import { FileText, Database, BarChart3, Shield, Calendar, Users, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Metodología del Índice de Precios — Consignatarias.com.ar',
  description: 'Metodología completa del Índice de Precios Consignatarias (IPC): fuentes de datos, cálculo, ponderaciones, cobertura geográfica y gobernanza. Transparencia total.',
  openGraph: {
    title: 'Metodología del Índice de Precios — Consignatarias.com.ar',
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
          Versión 1.0 — Marzo 2026 — Memola Medios S.A.S.
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
            <p className="text-zinc-200 text-lg font-medium">5</p>
            <p className="text-zinc-500 text-xs">Provincias</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <BarChart3 className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">5</p>
            <p className="text-zinc-500 text-xs">Categorías</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">365</p>
            <p className="text-zinc-500 text-xs">Días histórico</p>
          </div>
          <div className="border border-zinc-800 rounded p-3 text-center">
            <Users className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-zinc-200 text-lg font-medium">68+</p>
            <p className="text-zinc-500 text-xs">Consignatarias</p>
          </div>
        </div>

        {/* Section 1: Fuentes */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          1. Fuentes de Datos
        </h2>
        
        <h3 className="text-zinc-300 font-medium mb-2">Fuente Primaria: INMAG</h3>
        <p className="text-zinc-400 mb-3">
          Los precios base provienen del Mercado de Invernada de Mercado Agroganadero (INMAG), 
          fuente oficial del sector ganadero argentino.
        </p>
        <ul className="text-zinc-400 space-y-1 mb-4 list-disc list-inside">
          <li><span className="text-zinc-300">Categorías:</span> Novillo, Ternero, Vaquillona, Vaca, Toro</li>
          <li><span className="text-zinc-300">Unidad:</span> Pesos argentinos por kilogramo vivo (ARS/kg)</li>
          <li><span className="text-zinc-300">Frecuencia:</span> Diaria (días hábiles)</li>
          <li><span className="text-zinc-300">Método:</span> Scraping automatizado + validación manual</li>
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

        <div className="border border-zinc-800 rounded overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900">
              <tr>
                <th className="text-left text-zinc-400 p-2">Provincia</th>
                <th className="text-right text-zinc-400 p-2">Consignatarias</th>
                <th className="text-right text-zinc-400 p-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr><td className="text-zinc-300 p-2">Corrientes</td><td className="text-zinc-400 text-right p-2">25</td><td className="text-green-500 text-right p-2">✓ Activo</td></tr>
              <tr><td className="text-zinc-300 p-2">Santa Fe</td><td className="text-zinc-400 text-right p-2">18</td><td className="text-green-500 text-right p-2">✓ Activo</td></tr>
              <tr><td className="text-zinc-300 p-2">Entre Ríos</td><td className="text-zinc-400 text-right p-2">12</td><td className="text-green-500 text-right p-2">✓ Activo</td></tr>
              <tr><td className="text-zinc-300 p-2">Chaco</td><td className="text-zinc-400 text-right p-2">8</td><td className="text-green-500 text-right p-2">✓ Activo</td></tr>
              <tr><td className="text-zinc-300 p-2">Buenos Aires</td><td className="text-zinc-400 text-right p-2">5</td><td className="text-amber-500 text-right p-2">⟳ Expandiendo</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-zinc-300 font-medium mb-2">Limitaciones Conocidas</h3>
        <ul className="text-zinc-400 space-y-1 mb-6 list-disc list-inside text-xs">
          <li>Mayor cobertura en NEA/Litoral vs. Pampa Húmeda</li>
          <li>Datos de volumen incompletos en ~70% de remates</li>
          <li>Latencia T+1 (datos del día siguiente al remate)</li>
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
          </div>
        </div>

        {/* Governance */}
        <div className="border-t border-zinc-800 pt-6 mt-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-4">Gobernanza</h2>
          <div className="text-zinc-400 text-xs space-y-2">
            <p><span className="text-zinc-300">Responsable:</span> Memola Medios S.A.S. (CUIT: 30-71892445-1)</p>
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
