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
  corn: { current: number; change: number; unit: string }
  usdBlue: { current: number; change: number }
  usdOficial: { current: number; change: number }
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
    name: 'get_precios_detallados',
    description:
      'Precios por SUBCATEGORÍA del Mercado Agroganadero (ej. "NOVILLOS Regular +430", "VACAS Conserva Buena") con mínimo, promedio y máximo en ARS/kg vivo. Más granular que get_precios_hacienda. Filtro opcional por grupo (novillos/novillitos/vaquillonas/vacas/toros).',
    inputSchema: {
      type: 'object',
      properties: {
        grupo: { type: 'string', enum: ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros'] },
      },
      additionalProperties: false,
    },
    async run(args) {
      const grupo = typeof args.grupo === 'string' ? args.grupo.toLowerCase() : null
      const service = requireServiceClient()
      const { data: latest } = await service
        .from('mag_prices_detailed')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!latest?.date) return ok('Sin datos de precios detallados por ahora.')
      let qb = service
        .from('mag_prices_detailed')
        .select('subcategory, category_group, price_min, price_avg, price_max, head_count')
        .eq('date', latest.date)
      if (grupo) qb = qb.eq('category_group', grupo)
      const { data, error } = await qb.order('category_group')
      if (error) return fail('Error leyendo precios detallados.')
      if (!data || data.length === 0) return ok('Sin subcategorías para ese filtro.')
      const lines = data.map(
        (r) =>
          `${r.subcategory}: prom ${r.price_avg != null ? fmt(Number(r.price_avg)) : 's/d'}` +
          `${r.price_min != null && r.price_max != null ? ` (${fmt(Number(r.price_min))}–${fmt(Number(r.price_max))})` : ''}` +
          `${r.head_count ? ` · ${r.head_count} cab` : ''}`,
      )
      return ok(`Precios detallados por subcategoría — ${latest.date} (ARS/kg vivo)\n${lines.join('\n')}`)
    },
  },
  {
    name: 'get_contexto_macro',
    description:
      'Contexto macro del mercado ganadero argentino: dólar blue y oficial (ARS), maíz FOB (USD/tn), y el spread novillo/maíz (kg de maíz que compra un kg de novillo — proxy de rentabilidad de feedlot).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const maizArsKg = (prices.corn.current * prices.usdBlue.current) / 1000 // USD/tn → ARS/kg
      const novilloArsKg = prices.inmag.current
      const kgMaizPorKgNovillo = maizArsKg > 0 ? novilloArsKg / maizArsKg : 0
      return ok(
        `Contexto macro — ${prices.lastUpdate}\n` +
          `Dólar blue: ${fmt(prices.usdBlue.current)} ARS · oficial: ${fmt(prices.usdOficial.current)} ARS\n` +
          `Maíz FOB: USD ${prices.corn.current}/tn (≈ ${fmt(maizArsKg)} ARS/kg)\n` +
          `Novillo (INMAG): ${fmt(novilloArsKg)} ARS/kg\n` +
          `Spread novillo/maíz: ${kgMaizPorKgNovillo.toFixed(1)} kg de maíz por kg de novillo\n\n` +
          JSON.stringify({
            usd_blue: prices.usdBlue.current,
            usd_oficial: prices.usdOficial.current,
            maiz_usd_tn: prices.corn.current,
            maiz_ars_kg: Math.round(maizArsKg * 100) / 100,
            novillo_ars_kg: novilloArsKg,
            kg_maiz_por_kg_novillo: Math.round(kgMaizPorKgNovillo * 10) / 10,
          }),
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
    name: 'buscar_consignataria',
    description:
      'Busca consignatarias/casas de remate del directorio argentino por nombre, localidad o provincia. Devuelve nombre, ubicación, categoría, contacto y el perfil en consignatarias.com.ar.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre, localidad o razón social a buscar' },
        provincia: { type: 'string', description: 'Filtra por provincia (opcional)' },
        limite: { type: 'number', description: 'Máximo de resultados (default 8)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    async run(args) {
      // Sanitizar el término para el filtro .or() de PostgREST (evita romper la query).
      const q = String(args.query || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim().slice(0, 80)
      if (q.length < 2) return fail('Pasá un término de al menos 2 caracteres.')
      const prov = typeof args.provincia === 'string' ? args.provincia.replace(/[^\p{L}\p{N}\s]/gu, '').trim() : ''
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 8, 25)

      const service = requireServiceClient()
      let qb = service
        .from('consignatarias')
        .select('display_name, canonical_slug, province, location, category, phone, whatsapp, website')
        .or(`display_name.ilike.%${q}%,name.ilike.%${q}%,location.ilike.%${q}%`)
      if (prov) qb = qb.ilike('province', `%${prov}%`)
      const { data, error } = await qb.limit(limite)
      if (error) return fail('Error buscando en el directorio.')
      if (!data || data.length === 0) return ok(`Sin resultados para "${q}".`)

      const lines = data.map((c) => {
        const contacto = c.whatsapp || c.phone || c.website || ''
        return `${c.display_name}${c.location ? ' · ' + c.location : c.province ? ' · ' + c.province : ''}` +
          `${c.category ? ' · ' + c.category : ''}${contacto ? ' · ' + contacto : ''}\n  https://www.consignatarias.com.ar/consignatarias/${c.canonical_slug}`
      })
      return ok(`${data.length} resultado(s) para "${q}":\n${lines.join('\n')}`)
    },
  },
  {
    name: 'calcular_arrendamiento',
    description:
      'Calcula el canon de arrendamiento rural argentino en pesos: kg de novillo por hectárea × hectáreas × precio del novillo (índice INMAG). Es el método de referencia (contrato indexado al novillo).',
    inputSchema: {
      type: 'object',
      properties: {
        kg_ha: { type: 'number', description: 'Kg de novillo por hectárea por mes (típico 3-6)' },
        hectareas: { type: 'number', description: 'Cantidad de hectáreas' },
        precio_novillo: { type: 'number', description: 'Precio del novillo ARS/kg (default: INMAG actual)' },
      },
      required: ['kg_ha', 'hectareas'],
      additionalProperties: false,
    },
    async run(args) {
      const kgHa = Number(args.kg_ha)
      const hectareas = Number(args.hectareas)
      const precio = Number.isFinite(Number(args.precio_novillo)) && Number(args.precio_novillo) > 0
        ? Number(args.precio_novillo)
        : prices.inmag.current
      if (!Number.isFinite(kgHa) || kgHa <= 0 || !Number.isFinite(hectareas) || hectareas <= 0)
        return fail('kg_ha y hectareas deben ser números positivos.')
      const canonMensual = kgHa * hectareas * precio
      const canonAnual = canonMensual * 12
      const canonHaMes = kgHa * precio
      return ok(
        `Arrendamiento — ${kgHa} kg novillo/ha/mes · ${hectareas} ha · novillo ${fmt(precio)}/kg\n` +
          `Canon mensual: ${fmt(canonMensual)}\n` +
          `Canon anual: ${fmt(canonAnual)}\n` +
          `Por hectárea/mes: ${fmt(canonHaMes)}\n\n` +
          JSON.stringify({ canon_mensual: Math.round(canonMensual), canon_anual: Math.round(canonAnual), canon_ha_mes: Math.round(canonHaMes), kg_ha: kgHa, hectareas, precio_novillo: precio }) +
          `\n\n(Método de referencia indexado al novillo. Es un cálculo, no asesoramiento.)`,
      )
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
