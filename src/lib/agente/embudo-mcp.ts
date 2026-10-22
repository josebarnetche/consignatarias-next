/**
 * /admin/agente → "Del MCP a la operación": cuánto del uso del MCP se convierte
 * en un pedido, cuánto de eso se verifica y cuánto termina en una operación.
 *
 *   uso real (tools/call sin escáneres) → puente (market_match, cattle_buying_request)
 *     → pedidos mcp:* (o demanda de origen mcp) → verificados → en operación
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

export interface LlamadaMcp {
  ip: string | null
  ua: string | null
  has_auth: boolean | null
  probe: string | boolean | null
  tool: string | null
  canonico: string | null
}

export interface PedidoMcp {
  status: string
  /** Estado del caso en el agente, si lo tomó. */
  caso: string | null
}

export interface EmbudoMcp {
  toolsCall: number
  origenes: number
  /** Llamadas de la integración anónima (Misiones): uso real, pero no hay a quién ofrecerle operar. */
  anonimas: number
  puente: number
  pedidos: string
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

const real = (l: LlamadaMcp) => String(l.probe ?? 'false') !== 'true'
const VERIFICADO = ['new', 'routed', 'contacted', 'won']
const EN_OPERACION = ['ofreciendo', 'presentado', 'cerrado']
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0)

/** Arma el embudo con las tools/call de los últimos 7 días y los pedidos mcp desde la base. */
export function armarEmbudoMcp(llamadas: LlamadaMcp[], pedidos: PedidoMcp[]): EmbudoMcp {
  const reales = llamadas.filter(real)
  const toolsCall = reales.length
  const origenes = new Set(reales.map((l) => l.ip).filter(Boolean)).size
  return {
    toolsCall,
    origenes,
    anonimas: reales.filter((l) => esIntegracionAnonima({ ua: l.ua, has_auth: l.has_auth === true })).length,
    puente: reales.filter((l) => TOOLS_PUENTE.includes(l.canonico ?? l.tool ?? '')).length,
    pedidos: rango(pedidos.length),
    verificados: rango(pedidos.filter((p) => VERIFICADO.includes(p.status) || (p.caso != null && p.caso !== 'descartado')).length),
    enOperacion: rango(pedidos.filter((p) => p.caso != null && EN_OPERACION.includes(p.caso)).length),
    vsBase: { toolsCall: pct(toolsCall, BASE_MCP.toolsCallSemana), origenes: pct(origenes, BASE_MCP.origenesSemana) },
  }
}
