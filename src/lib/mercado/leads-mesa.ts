/**
 * leads-mesa.ts — la fila de `producer_leads` que leen la página /mercado/demanda
 * y la tool MCP `market_match`, y de qué lado de la mesa está cada una.
 *
 * Solo clasifica. El trabajo de los leads (cruces, mensajes, seguimiento) es del
 * agente (`src/lib/agente/`).
 */
export interface LeadFila {
  id: number
  created_at: string
  intent: string
  category: string | null
  head_count: number | null
  hectareas: number | null
  province: string | null
  zona?: string | null
  name: string | null
  phone: string | null
  email: string | null
  status: string
  fee_ars: number | null
  source?: string | null
}

export const ESTADOS_ABIERTOS = new Set(['new', 'needs_review', 'routed', 'contacted'])

export type LadoMesa =
  | { vertical: 'hacienda'; lado: 'demanda' | 'oferta' }
  | { vertical: 'campos'; lado: 'demanda' | 'oferta'; operacion: 'arrendamiento' | 'venta' }

/** null = el lead no es de la mesa (p.ej. una consulta sin intención de operar). */
export function ladoDe(l: Pick<LeadFila, 'intent' | 'hectareas'>): LadoMesa | null {
  const esCampo = Boolean(l.hectareas) || l.intent === 'tasar' || l.intent.startsWith('arrendar')
  if (esCampo) {
    return {
      vertical: 'campos',
      lado: l.intent === 'arrendar_busco' || l.intent === 'comprar' ? 'demanda' : 'oferta',
      operacion: l.intent.startsWith('arrendar') ? 'arrendamiento' : 'venta',
    }
  }
  if (l.intent === 'vender' || l.intent === 'consignar' || l.intent === 'comprar') {
    return { vertical: 'hacienda', lado: l.intent === 'comprar' ? 'demanda' : 'oferta' }
  }
  return null
}
