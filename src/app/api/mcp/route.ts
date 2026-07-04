import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import { isValidCategory, categoryLabel, getCurrentPrice, CATEGORY_VALUES } from '@/lib/price-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * MCP server (Streamable HTTP, JSON-RPC 2.0) — "Consignatarias como servicio para IAs".
 *
 * Expone la data ganadera argentina como TOOLS que cualquier agente MCP (Claude,
 * Cursor, etc.) usa nativamente conectándose a https://www.consignatarias.com.ar/api/mcp
 *
 * Implementación propia (sin mcp-handler) para no arrastrar el conflicto zod v3/v4 ni
 * Redis: el subset que necesita un tool-server es chico — initialize / tools/list /
 * tools/call. Los tools de lectura son públicos; `crear_alerta_precio` requiere una
 * API key de un plan (Authorization: Bearer sk_..., mismo sistema que el API REST).
 */

const SERVER_INFO = { name: 'consignatarias', version: '1.0.0' }
const PROTOCOL_VERSION = '2025-06-18'

// ── Tools (wrappers finos sobre data/lógica existente) ───────────────────────
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }
interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresAuth?: boolean
  run: (args: Record<string, unknown>, req: NextRequest) => Promise<ToolResult>
}

const prices = marketPrices as unknown as {
  inmag: { current: number; change: number; prev: number }
  categories: Record<string, { current: number; change: number }>
  lastUpdate: string
}
const remates = rematesData as unknown as Array<{
  title: string; consignatariaName: string; consignatariaSlug: string; date: string
  time: string | null; location: string; province: string; mainCategory: string
  estimatedHeads: number | null; youtubeUrl: string | null; status: string
}>

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] })
const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], isError: true })
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

const TOOLS: Tool[] = [
  {
    name: 'get_indice_novillo',
    description:
      'Índice Novillo (INMAG) del Mercado Agroganadero argentino: precio de referencia hoy en ARS/kg vivo, variación y fecha. Es el número que el mercado bovino argentino usa como referencia del novillo.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const { current, change, prev } = prices.inmag
      return ok(
        `Índice Novillo (INMAG) — ${prices.lastUpdate}\n` +
          `Hoy: ${fmt(current)}/kg vivo (${change >= 0 ? '+' : ''}${change}% vs anterior ${fmt(prev)})\n` +
          `Fuente: Mercado Agroganadero (Cañuelas), vía consignatarias.com.ar\n\n` +
          JSON.stringify({ inmag: current, change_pct: change, prev, unit: 'ARS/kg vivo', date: prices.lastUpdate }),
      )
    },
  },
  {
    name: 'get_precios_hacienda',
    description:
      'Precios de hacienda en ARS/kg vivo por categoría (novillos, novillitos, vaquillonas, vacas, toros, terneros) del Mercado Agroganadero argentino. Sin argumento devuelve todas.',
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: Object.keys((marketPrices as { categories: object }).categories) },
      },
      additionalProperties: false,
    },
    async run(args) {
      const cat = typeof args.categoria === 'string' ? args.categoria : null
      const entries = Object.entries(prices.categories).filter(([k]) => !cat || k === cat)
      if (entries.length === 0) return fail(`Categoría desconocida. Válidas: ${Object.keys(prices.categories).join(', ')}`)
      const lines = entries.map(([k, v]) => `${k}: ${fmt(v.current)}/kg (${v.change >= 0 ? '+' : ''}${v.change}%)`)
      return ok(
        `Precios de hacienda — ${prices.lastUpdate} (ARS/kg vivo)\n${lines.join('\n')}\n\n` +
          JSON.stringify(Object.fromEntries(entries.map(([k, v]) => [k, { price: v.current, change_pct: v.change }]))),
      )
    },
  },
  {
    name: 'list_remates',
    description:
      'Próximos remates de hacienda en Argentina. Filtros opcionales: provincia y límite. Devuelve fecha, consignataria, ubicación, categoría y transmisión en vivo si hay.',
    inputSchema: {
      type: 'object',
      properties: {
        provincia: { type: 'string', description: 'Filtra por provincia (ej. "Buenos Aires")' },
        limite: { type: 'number', description: 'Máximo de remates (default 10)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const today = new Date().toISOString().slice(0, 10)
      const prov = typeof args.provincia === 'string' ? args.provincia.toLowerCase() : null
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 10, 50)
      const upcoming = remates
        .filter((r) => r.status === 'scheduled' && r.date >= today && (!prov || r.province.toLowerCase().includes(prov)))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, limite)
      if (upcoming.length === 0) return ok('No hay remates próximos con esos filtros.')
      const lines = upcoming.map(
        (r) =>
          `${r.date}${r.time ? ' ' + r.time : ''} · ${r.consignatariaName} · ${r.location}, ${r.province}` +
          `${r.mainCategory ? ' · ' + r.mainCategory : ''}${r.youtubeUrl ? ' · 🔴 en vivo' : ''}`,
      )
      return ok(`Próximos ${upcoming.length} remates:\n${lines.join('\n')}`)
    },
  },
  {
    name: 'crear_alerta_precio',
    description:
      'Crea una alerta de precio por umbral: cuando el precio de referencia de una categoría cruza el valor dado, se notifica por webhook (POST price.threshold_crossed). Requiere una API key de un plan.',
    requiresAuth: true,
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: ['inmag', ...CATEGORY_VALUES.filter((c) => c !== 'inmag')] },
        umbral: { type: 'number', description: 'Umbral en ARS/kg vivo (ej. 5000)' },
        direccion: { type: 'string', enum: ['above', 'below'], description: 'Cruzar hacia arriba o abajo (default above)' },
        webhook_url: { type: 'string', description: 'URL https pública que recibe el POST cuando cruza' },
      },
      required: ['categoria', 'umbral', 'webhook_url'],
      additionalProperties: false,
    },
    async run(args, req) {
      const auth = await authenticate(req)
      if (!auth.ok) return fail('Requiere una API key válida de un plan. Conseguí una en /cuenta/api-keys.')
      const categoria = String(args.categoria || '').toLowerCase()
      const umbral = Number(args.umbral)
      const direccion = args.direccion === 'below' ? 'below' : 'above'
      const webhook = String(args.webhook_url || '').trim()
      if (!isValidCategory(categoria)) return fail(`Categoría inválida. Válidas: ${CATEGORY_VALUES.join(', ')}`)
      if (!Number.isFinite(umbral) || umbral <= 0) return fail('Umbral inválido.')
      let host = ''
      try { host = new URL(webhook).hostname.toLowerCase() } catch { return fail('webhook_url inválida.') }
      if (!webhook.startsWith('https://') || host === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
        return fail('webhook_url debe ser una URL https pública.')

      const service = requireServiceClient()
      let current: number | null = null
      try { current = await getCurrentPrice(service, categoria) } catch { /* best-effort */ }
      const { data, error } = await service
        .from('price_alerts')
        .insert({ user_id: auth.key.userId, webhook_url: webhook, category: categoria, threshold: umbral, direction: direccion, last_value: current, status: 'active', source: 'api' })
        .select('id')
        .single()
      if (error) return fail('No se pudo crear la alerta.')
      return ok(
        `Alerta creada (#${data.id}). Te aviso al webhook cuando el ${categoryLabel(categoria)} ` +
          `${direccion === 'above' ? 'cruce' : 'baje de'} ${fmt(umbral)}. Precio hoy: ${current != null ? fmt(current) : 's/d'}.`,
      )
    },
  },
]

// ── JSON-RPC 2.0 handler ─────────────────────────────────────────────────────
function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } })
}
function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> }
  try {
    msg = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }
  const { id, method, params } = msg

  // Notificaciones (sin id) → 202 sin body.
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') return new NextResponse(null, { status: 202 })
    return new NextResponse(null, { status: 202 })
  }

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: (params?.protocolVersion as string) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'Datos del mercado ganadero argentino (precios de hacienda, índice novillo INMAG, remates). Usá get_indice_novillo y get_precios_hacienda para precios de referencia, list_remates para el calendario, y crear_alerta_precio (con API key) para avisos por umbral.',
      })
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      })
    case 'tools/call': {
      const name = params?.name as string
      const tool = TOOLS.find((t) => t.name === name)
      if (!tool) return rpcError(id, -32602, `Tool desconocida: ${name}`)
      try {
        const result = await tool.run((params?.arguments as Record<string, unknown>) || {}, req)
        return rpcResult(id, result)
      } catch (err) {
        console.error('[mcp] tool error', name, err)
        return rpcResult(id, { content: [{ type: 'text', text: 'Error interno ejecutando la tool.' }], isError: true })
      }
    }
    default:
      return rpcError(id, -32601, `Método no soportado: ${method}`)
  }
}

// No ofrecemos stream server→cliente (tool-server stateless): GET → 405.
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed. Usá POST (JSON-RPC MCP).' }, { status: 405 })
}
