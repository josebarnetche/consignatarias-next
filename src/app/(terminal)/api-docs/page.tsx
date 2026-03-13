import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'API Documentation — Consignatarias.com.ar',
  description: 'Documentación de la API pública de consignatarias.com.ar. Accede a datos de remates ganaderos, precios INMAG, consignatarias y frigoríficos.',
  openGraph: {
    title: 'API Documentation — Consignatarias.com.ar',
    description: 'API pública del mercado ganadero argentino. Remates, precios, consignatarias.',
    url: 'https://www.consignatarias.com.ar/api-docs',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/api-docs',
  },
}

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/remates/stats',
    description: 'Estadísticas generales del mercado: total de remates, distribución por provincia, top consignatarias.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/remates/hoy',
    description: 'Lista de remates programados para hoy.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/remates/proximos',
    description: 'Remates de los próximos 7 días. Acepta ?dias=N y ?provincia=X.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/remates/buscar',
    description: 'Búsqueda de remates por texto, provincia o tipo.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/remates/calendario',
    description: 'Vista de calendario con remates por día.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/precios',
    description: 'Índice INMAG actual, precios por categoría y variaciones semanales.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/consignataria/{slug}',
    description: 'Perfil de una consignataria específica.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/status',
    description: 'Health check y estadísticas de la API.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/planes',
    description: 'Lista de planes de suscripción y precios.',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/alertas',
    description: 'Listar alertas configuradas.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/alertas',
    description: 'Crear nueva alerta de remates.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/webhooks/register',
    description: 'Registrar webhook para notificaciones.',
    auth: true,
  },
]

export default function ApiDocsPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="api-docs" sectionName="API Docs" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
            API Documentation
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            API pública del mercado ganadero argentino. Acceso libre a datos de remates, 
            precios INMAG, perfiles de consignatarias y frigoríficos. Los endpoints con 
            autenticación requieren suscripción PRO.
          </p>
        </div>

        {/* Base URL */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Base URL</div>
          <div className="px-panel py-3">
            <code className="text-accent font-mono text-sm">
              https://www.consignatarias.com.ar/api
            </code>
          </div>
        </div>

        {/* OpenAPI Spec Link */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">OpenAPI Specification</div>
          <div className="px-panel py-3 flex items-center justify-between">
            <span className="text-zinc-400 text-sm">
              Especificación completa en formato OpenAPI 3.0
            </span>
            <a 
              href="/openapi.json" 
              target="_blank"
              className="text-accent text-sm hover:text-accent-bright transition-colors"
            >
              openapi.json →
            </a>
          </div>
        </div>

        {/* Endpoints List */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">Endpoints</div>
          
          <div className="divide-y divide-terminal-border">
            {ENDPOINTS.map((endpoint, i) => (
              <div key={i} className="px-panel py-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className={`
                    inline-block px-2 py-0.5 text-xxs font-terminal font-bold tracking-wider
                    ${endpoint.method === 'GET' 
                      ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30' 
                      : 'text-amber-400 bg-amber-400/10 border border-amber-400/30'}
                  `}>
                    {endpoint.method}
                  </span>
                  <code className="text-zinc-200 font-mono text-sm flex-1">
                    {endpoint.path}
                  </code>
                  {endpoint.auth && (
                    <span className="text-xxs text-amber-400 font-terminal uppercase tracking-wider">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm pl-[52px]">
                  {endpoint.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Autenticación</div>
          <div className="px-panel py-4 space-y-3">
            <p className="text-zinc-400 text-sm">
              Los endpoints públicos no requieren autenticación. Para endpoints PRO, 
              incluí tu API key en el header:
            </p>
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
{`curl -H "x-api-key: tu_api_key" \\
  https://www.consignatarias.com.ar/api/alertas`}
            </pre>
            <p className="text-zinc-500 text-sm">
              Obtené tu API key en{' '}
              <Link href="/dashboard" className="text-accent hover:text-accent-bright">
                tu dashboard
              </Link>{' '}
              después de suscribirte al plan PRO.
            </p>
          </div>
        </div>

        {/* Example Response */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Ejemplo: /api/remates/stats</div>
          <div className="px-panel py-4">
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "resumen": {
      "totalRemates": 280,
      "rematesHoy": 12,
      "rematesProximos7dias": 67,
      "provinciasActivas": 13,
      "consignatariasActivas": 63
    },
    "porProvincia": [
      {"provincia": "BUENOS AIRES", "total": 84, "proximos7dias": 28},
      {"provincia": "SANTA FE", "total": 47, "proximos7dias": 10}
    ]
  },
  "timestamp": "2026-03-13T17:30:27.872Z"
}`}
            </pre>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Límites</div>
          <div className="px-panel py-4">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-terminal-border">
                  <td className="py-2 text-zinc-400">Endpoints públicos</td>
                  <td className="py-2 text-zinc-200 text-right">100 requests/min</td>
                </tr>
                <tr className="border-b border-terminal-border">
                  <td className="py-2 text-zinc-400">Endpoints PRO</td>
                  <td className="py-2 text-zinc-200 text-right">1000 requests/min</td>
                </tr>
                <tr>
                  <td className="py-2 text-zinc-400">Alertas (tier gratuito)</td>
                  <td className="py-2 text-zinc-200 text-right">3 alertas activas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            ¿Preguntas? Contactanos en{' '}
            <a href="mailto:agro@memola.com.ar" className="text-accent hover:text-accent-bright">
              agro@memola.com.ar
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
