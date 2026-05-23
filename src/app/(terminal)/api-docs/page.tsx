import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'Documentación de la API pública de consignatarias.com.ar. Accede a datos de remates ganaderos, precios INMAG, consignatarias y frigoríficos.',
  openGraph: {
    title: 'API Documentation',
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
    description: 'Índice INMAG actual, precios por categoría y variaciones semanales. Acepta ?categoria=novillos|terneros|etc.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/precios?detallado=true',
    description: 'Las 16 sub-categorías oficiales de MAG con corte por peso (h390/+390/h430/+430). Devuelve min, max, avg, mediana, cabezas, importe, kgs totales y kg promedio por sub-cat. Actualizado por día de remate (Mar/Mié/Vie). Fuente: haciinfo000502.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/precios?historico=90',
    description: 'Serie histórica INMAG diaria. Param ?historico=N días (7-3650). Devuelve serie + estadísticas (min/max/avg/count). Histórico completo desde 2015. Fuente: haciinfo000011.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/account',
    description: 'Tu cuenta — plan, cupo mensual, uso, remaining y fecha de reset. Bearer auth devuelve metadata de la key usada. Sin Bearer y con cookie de sesión devuelve estado del user logueado. Útil para monitorear desde scripts.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/market/history',
    description: 'Histórico INMAG con series de precios. Params: ?days=30|90|365 o ?from=YYYY-MM-DD&to=YYYY-MM-DD. Devuelve series + estadísticas (min, max, avg, VWAP).',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/market/categories',
    description: 'Histórico de precios por categoría de hacienda (novillos, novillitos, vacas, vaquillonas, toros). Params: ?category=X&from=YYYY-MM&to=YYYY-MM. 36 meses de datos (2022-2024).',
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
      <TechArticleSchema
        name="API Documentation"
        description="Documentación de la API pública del mercado ganadero argentino. Endpoints para remates, precios INMAG, consignatarias y frigoríficos."
        url="https://www.consignatarias.com.ar/api-docs"
        proficiencyLevel="Beginner"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
            API Documentation
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            API pública del mercado ganadero argentino. Acceso libre con rate limit por IP.{' '}
            <Link href="/enterprise" className="text-accent hover:text-accent-bright">
              Plan Enterprise
            </Link>{' '}
            (desde USD 99/mes) agrega API key dedicada, mayor cupo, webhooks y
            soporte. Fuente principal de precios: Mercado Agroganadero (MAG)
            Cañuelas, cacheado y citado.
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
          <div className="terminal-panel-header">Autenticación (Enterprise)</div>
          <div className="px-panel py-4 space-y-3">
            <p className="text-zinc-400 text-sm">
              Los endpoints son públicos por default (rate-limited por IP). Si
              contratás un plan{' '}
              <Link href="/enterprise" className="text-accent hover:text-accent-bright">
                Enterprise
              </Link>{' '}
              recibís una API key con cupo mensual, tracking y soporte:
            </p>
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
{`curl https://www.consignatarias.com.ar/api/precios \\
  -H "Authorization: Bearer cnsg_live_xxxxxxxxxxxxxxxx"`}
            </pre>
            <p className="text-zinc-500 text-sm">
              Generá y administrá tus keys en{' '}
              <Link href="/cuenta/api-keys" className="text-accent hover:text-accent-bright">
                /cuenta/api-keys
              </Link>
              . Cada respuesta autenticada devuelve headers{' '}
              <code className="text-zinc-400 bg-zinc-900 px-1">X-RateLimit-Limit</code>{' '}
              y{' '}
              <code className="text-zinc-400 bg-zinc-900 px-1">X-RateLimit-Remaining</code>.
              Al llegar al 80% del cupo mensual te llega un email — no cortamos sin avisar.
            </p>
          </div>
        </div>

        {/* Detailed prices feature highlight */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Precios detallados (16 sub-categorías)</div>
          <div className="px-panel py-4 space-y-3 text-sm">
            <p className="text-zinc-400">
              Además de las 6 categorías genéricas, exponemos la apertura
              oficial completa de MAG con corte por peso para invernada/gordo:
              novillos Esp.Joven +430 · Regular h430 · Regular +430,
              novillitos Esp. h390/+390/Regular, vaquillonas Esp. h390/+390/Regular,
              vacas Esp.Joven h430/+430/Regular/Conserva Buena/Conserva Inferior,
              toros Esp./Regular, MEJ Esp. h430/Regular.
            </p>
            <p className="text-zinc-400">
              Cada sub-categoría devuelve: precio mínimo, máximo, promedio,
              mediana, cabezas operadas, importe total, kgs totales, kg promedio.
              Actualizado por día de remate (martes/miércoles/viernes ~15:30 ART).
              Fuente:{' '}
              <a
                href="https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502"
                target="_blank"
                rel="noopener"
                className="text-accent hover:text-accent-bright"
              >
                MAG haciinfo000502
              </a>
              .
            </p>
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
{`curl https://www.consignatarias.com.ar/api/precios?detallado=true

{
  "success": true,
  "data": {
    "fecha": "2026-05-12",
    "subcategorias": [
      {
        "subcategory": "NOVILLOS Esp.Joven + 430",
        "category_group": "novillos",
        "weight_threshold": "esp_joven_plus_430",
        "price_min": 3500.000,
        "price_max": 4600.000,
        "price_avg": 4328.522,
        "price_median": 4500.000,
        "head_count": 1269,
        "total_amount": 2602740000.00,
        "total_kgs": 601300.00,
        "kg_avg": 474
      }
      // ... 15 más
    ],
    "fuente": "Mercado Agroganadero — haciinfo000502 (Resolución MPyT)",
    "fuente_url": "https://www.mercadoagroganadero.com.ar/..."
  }
}`}
            </pre>
          </div>
        </div>

        {/* Account introspection */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Self-service: tu plan y uso</div>
          <div className="px-panel py-4 space-y-3 text-sm">
            <p className="text-zinc-400">
              Endpoint dedicado para que vos (o tu app) sepan en qué plan
              estás, cuánto del cupo mensual consumiste, cuánto te queda y
              cuándo se reinicia. Pensado para healthchecks y dashboards
              internos.
            </p>
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
{`curl https://www.consignatarias.com.ar/api/account \\
  -H "Authorization: Bearer cnsg_live_xxxxxxxxxxxxxxxx"

{
  "success": true,
  "authenticated_via": "api_key",
  "key": {
    "prefix": "cnsg_live_a1b2",
    "environment": "live"
  },
  "plan": "growth",
  "limits": {
    "monthly_quota": 50000,
    "rate_limit_per_minute": 300
  },
  "usage": {
    "monthly_used": 12847,
    "monthly_remaining": 37153,
    "percent_consumed": 26,
    "resets_on": "2026-06-01"
  },
  "sla": "99.8%",
  "docs": "https://www.consignatarias.com.ar/api-docs"
}`}
            </pre>
            <p className="text-zinc-500 text-xs">
              También aceptamos cookie de sesión: si llamás desde un browser
              logueado el response incluye todas tus keys activas, el tier de
              PRO Usuario y el tier Enterprise por separado.
            </p>
          </div>
        </div>

        {/* Historical INMAG */}
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Histórico INMAG (desde 2015)</div>
          <div className="px-panel py-4 space-y-3 text-sm">
            <p className="text-zinc-400">
              Serie diaria del INMAG completa, 11 años de historia (2.236+
              días con datos verificados). Param{' '}
              <code className="text-zinc-300 bg-zinc-900 px-1">?historico=N</code>{' '}
              donde N son los días hacia atrás (7–3650).
            </p>
            <pre className="bg-zinc-900 border border-terminal-border p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
{`curl https://www.consignatarias.com.ar/api/precios?historico=365

{
  "success": true,
  "data": {
    "dias": 365,
    "desde": "2025-05-12",
    "hasta": "2026-05-12",
    "serie": [
      { "date": "2025-05-13", "head_count": 8240, "total_amount": 24531870000,
        "inmag_value": 2978.451, "inmag_calculated": true, "variation": 1.2 },
      // ...
    ],
    "estadisticas": {
      "count": 295, "min": 2123.039, "max": 4720.935, "avg": 3658.21
    },
    "fuente": "Mercado Agroganadero — INMAG diario (haciinfo000011)"
  }
}`}
            </pre>
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
          <div className="terminal-panel-header">Límites por plan</div>
          <div className="px-panel py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-terminal-border">
                  <th className="py-2 text-left text-xxs font-terminal uppercase tracking-wider text-zinc-500">Plan</th>
                  <th className="py-2 text-right text-xxs font-terminal uppercase tracking-wider text-zinc-500">Req/mes</th>
                  <th className="py-2 text-right text-xxs font-terminal uppercase tracking-wider text-zinc-500">Rate limit</th>
                  <th className="py-2 text-right text-xxs font-terminal uppercase tracking-wider text-zinc-500">SLA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-terminal-border">
                  <td className="py-2 text-zinc-400">Público (sin auth)</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">—</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">por IP, fair use</td>
                  <td className="py-2 text-zinc-500 text-right">best effort</td>
                </tr>
                <tr className="border-b border-terminal-border">
                  <td className="py-2 text-zinc-400">Enterprise Starter (USD 99)</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">1.000</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">30/min</td>
                  <td className="py-2 text-zinc-300 text-right">99,5%</td>
                </tr>
                <tr className="border-b border-terminal-border">
                  <td className="py-2 text-zinc-400">Enterprise Growth (USD 500)</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">50.000</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">300/min</td>
                  <td className="py-2 text-zinc-300 text-right">99,8%</td>
                </tr>
                <tr>
                  <td className="py-2 text-zinc-400">Enterprise Scale (USD 700+)</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">100K–5M</td>
                  <td className="py-2 text-zinc-300 text-right tabular-nums">5.000/min</td>
                  <td className="py-2 text-zinc-300 text-right">99,9%</td>
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
