/**
 * /admin/agente → "Del MCP a la operación": cuánto del uso del MCP se convierte
 * en un pedido, cuánto de eso se verifica y cuánto termina en una operación.
 *
 *   uso real (tools/call sin escáneres) → puente (market_match, cattle_buying_request)
 *     → pedidos mcp:* (o demanda de origen mcp) → confirmación enviada (doble opt-in)
 *     → verificados (los confirmó la persona o José a mano) → en operación
 *
 * La foto contra la que se compara es la del 22-10 (docs/mcp-medicion-base.md):
 * los orígenes se cuentan por ip para que el corte cuadre con esa base.
 * Los pedidos van en rangos, nunca en conteos exactos (regla de privacidad de
 * INTEGRACION-SESIONES-2026-10-22.md), aunque el tablero sea interno.
 */
import { esIntegracionAnonima } from '@/lib/mcp/integracion'

/** Semana completa del 12-10 en docs/mcp-medicion-base.md: la última entera antes de publicar 1.9.0. */
export const BASE_MCP = { fecha: '22-10-2026', toolsCallSemana: 1505, origenesSemana: 77, pedidos: 0 }

export const TOOLS_PUENTE = ['market_match', 'cattle_buying_request']

/**
 * Clientes que no son una persona detrás de un asistente: librerías HTTP y bots que
 * barren directorios de MCP (y los que se presentan con "+https://…" en el UA, como manda la
 * convención de bots). `probe` solo marca initialize/tools/list de escáneres;
 * estos llegan a tools/call igual (medición de la 39, 22-10: ~350 de ~365 llamadas).
 */
const UA_NO_HUMANO = /python-requests|python-httpx|httpx|aiohttp|curl|wget|go-http|node-fetch|axios|okhttp|bot\b|bot\/|crawler|spider|scan|checkup|collector|evyai|mcpyp|rokmcp|probe|census|sentinel|smoke|\(\+https?:|\+mailto:/i
/** Un origen que en un mismo día llama tantas tools distintas está barriendo el catálogo. */
export const BARRIDO_TOOLS_DIA = 15

export interface LlamadaMcp {
  ip: string | null
  ua: string | null
  has_auth: boolean | null
  probe: string | boolean | null
  tool: string | null
  canonico: string | null
  created_at?: string | null
  /** `ops_events.status`: 'probe' también marca tools inexistentes (unknown_tool), que no llevan metadata.probe. */
  status?: string | null
}

export interface PedidoMcp {
  status: string
  /** Estado del caso en el agente, si lo tomó. */
  caso: string | null
  /** Le salió el mail de doble opt-in (agente_mensajes, plantilla 'confirmacion'). */
  confirmacionEnviada?: boolean
  /** Lo confirmó la propia persona con el link (lead_activity, actor 'confirmacion'). */
  confirmado?: boolean
}

export interface EmbudoMcp {
  toolsCall: number
  origenes: number
  /** Llamadas de la integración anónima (Misiones): uso real, pero no hay a quién ofrecerle operar. */
  anonimas: number
  /** Consultas de una persona detrás de un asistente: sin anónimas, sin librerías ni bots, sin barridos. */
  humanas: number
  origenesHumanos: number
  puente: number
  pedidos: string
  confirmacionEnviada: string
  /** De los verificados, cuántos confirmó la persona (el resto lo verificó José a mano). */
  confirmados: string
  verificados: string
  enOperacion: string
  /** Variación de tools/call y orígenes contra la base, en %. */
  vsBase: { toolsCall: number; origenes: number }
}

/** Rango para mostrar un conteo de pedidos sin dar el número exacto. */
export function rango(n: number): string {
  if (n <= 0) return '0'
  if (n <= 2) return '1–2'
  if (n <= 9) return '3–9'
  if (n <= 49) return '10–49'
  return '50+'
}

const real = (l: LlamadaMcp) => l.status !== 'probe' && String(l.probe ?? 'false') !== 'true'
const VERIFICADO = ['new', 'routed', 'contacted', 'won']
const EN_OPERACION = ['ofreciendo', 'presentado', 'cerrado']
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0)

/** Arma el embudo con las tools/call de los últimos 7 días y los pedidos mcp desde la base. */
export function armarEmbudoMcp(llamadas: LlamadaMcp[], pedidos: PedidoMcp[]): EmbudoMcp {
  const reales = llamadas.filter(real)
  const toolsCall = reales.length
  const origenes = new Set(reales.map((l) => l.ip).filter(Boolean)).size
  const anonima = (l: LlamadaMcp) => esIntegracionAnonima({ ua: l.ua, has_auth: l.has_auth === true })
  const barridos = origenesBarrido(reales)
  const humanas = reales.filter((l) => !anonima(l) && !UA_NO_HUMANO.test(l.ua ?? '') && !barridos.has(l.ip ?? ''))
  return {
    toolsCall,
    origenes,
    anonimas: reales.filter(anonima).length,
    humanas: humanas.length,
    origenesHumanos: new Set(humanas.map((l) => l.ip).filter(Boolean)).size,
    puente: reales.filter((l) => TOOLS_PUENTE.includes(l.canonico ?? l.tool ?? '')).length,
    pedidos: rango(pedidos.length),
    confirmacionEnviada: rango(pedidos.filter((p) => p.confirmacionEnviada).length),
    confirmados: rango(pedidos.filter((p) => p.confirmado).length),
    verificados: rango(pedidos.filter((p) => VERIFICADO.includes(p.status) || (p.caso != null && p.caso !== 'descartado')).length),
    enOperacion: rango(pedidos.filter((p) => p.caso != null && EN_OPERACION.includes(p.caso)).length),
    vsBase: { toolsCall: pct(toolsCall, BASE_MCP.toolsCallSemana), origenes: pct(origenes, BASE_MCP.origenesSemana) },
  }
}

/** Orígenes (ip) que algún día llamaron BARRIDO_TOOLS_DIA tools distintas o más. */
function origenesBarrido(llamadas: LlamadaMcp[]): Set<string> {
  const porDia = new Map<string, Set<string>>()
  for (const l of llamadas) {
    if (!l.ip) continue
    const k = `${l.ip}|${(l.created_at ?? '').slice(0, 10)}`
    const tools = porDia.get(k) ?? new Set<string>()
    tools.add(l.canonico ?? l.tool ?? '')
    porDia.set(k, tools)
  }
  return new Set([...porDia].filter(([, t]) => t.size >= BARRIDO_TOOLS_DIA).map(([k]) => k.split('|')[0]))
}
