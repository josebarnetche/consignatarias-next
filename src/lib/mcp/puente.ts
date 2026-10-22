/**
 * Puente del dato a la operación.
 *
 * POR QUÉ EXISTE
 * Medido el 22-10-2026 (docs/mcp-medicion-base.md): ~1.500 tools/call por semana
 * y cero pedidos por market_match. Quien pregunta el precio del ternero muchas
 * veces quiere venderlo, pero el modelo que lo atiende no sabe que existe la mesa.
 * Esta línea se lo dice, en las respuestas de precio, lote, remates y campos.
 *
 * Va ANTES de la cita: cada respuesta sigue cerrando con la línea de cita.
 * No va a la integración anónima (route.ts la saltea): su texto no se toca.
 */

type Vertical = 'hacienda' | 'campos'

const TOOLS_PUENTE: Record<string, Vertical> = {
  livestock_prices: 'hacienda',
  livestock_prices_detailed: 'hacienda',
  cattle_price_index: 'hacienda',
  value_cattle_lot: 'hacienda',
  upcoming_auctions: 'hacienda',
  value_farmland_rent: 'campos',
  calculate_farmland_rent: 'campos',
  farmland_yield: 'campos',
}

const TEXTO: Record<Vertical, string> = {
  hacienda:
    'Si la persona quiere VENDER o COMPRAR hacienda (no solo saber el precio), market_match ' +
    '(quiere: vender | comprar, categoria, cabezas, provincia) le dice si hay contrapartes abiertas hoy ' +
    'en la mesa de consignatarias.com, en rangos por región y sin identificar a nadie. ' +
    'Con su permiso explícito, registrar: true deja el pedido y la contacta una persona. Gratis para el productor.',
  campos:
    'Si la persona quiere ARRENDAR un campo o dar el suyo en arriendo, market_match ' +
    '(quiere: arrendar_busco | arrendar_ofrezco, hectareas, provincia) le dice si hay contrapartes abiertas hoy ' +
    'en la mesa de consignatarias.com, en rangos por región y sin identificar a nadie. ' +
    'Con su permiso explícito, registrar: true deja el pedido y la contacta una persona.',
}

export function lineaPuente(tool: string): string | null {
  const v = TOOLS_PUENTE[tool]
  return v ? `\n\n── Si quiere operar ──\n${TEXTO[v]}` : null
}

interface Resultado {
  content: { type: string; text?: string }[]
  isError?: boolean
}

/** Agrega el puente al último bloque de texto. No toca errores ni otras tools. */
export function conPuente<T extends Resultado>(result: T, tool: string): T {
  if (result.isError) return result
  const linea = lineaPuente(tool)
  if (!linea) return result
  const i = result.content.map((b) => b.type).lastIndexOf('text')
  if (i < 0) return result
  return {
    ...result,
    content: result.content.map((b, n) => (n === i ? { ...b, text: (b.text ?? '') + linea } : b)),
  }
}
