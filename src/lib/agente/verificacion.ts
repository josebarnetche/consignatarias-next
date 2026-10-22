/**
 * Qué leads puede tomar el agente sin que una persona los haya verificado.
 *
 * Los pedidos que entran por el MCP (`source` 'mcp:…', p. ej. 'mcp:market_match')
 * los carga un agente externo: puede poner el email de OTRA persona. Por eso entran
 * en `needs_review`, y el agente no les escribe hasta que alguien los verifique y
 * los pase a `new`. Coordinado con la sesión del MCP (INTEGRACION-SESIONES-2026-10-22.md).
 */

/**
 * Orígenes que pudo cargar un tercero automatizado: no se les escribe sin verificación humana.
 *  · 'mcp:…' — pedidos del MCP (market_match).
 *  · 'demanda_compra:N' — demandas de compra; las del MCP (cattle_buying_request) entran
 *    en needs_review (demanda.ts → leadDeDemanda). Las de la web entran en `new` y pasan.
 */
export function esOrigenSinVerificar(source: string | null | undefined): boolean {
  return /^(mcp:|demanda_compra:)/i.test((source ?? '').trim())
}

/** ¿Puede el agente tomar (y escribirle a) este lead? */
export function tomable(l: { status: string | null | undefined; source: string | null | undefined }): boolean {
  if (l.status === 'new') return true
  if (l.status === 'needs_review') return !esOrigenSinVerificar(l.source)
  return false
}

/** ¿Es un lead cargado por un tercero que todavía nadie verificó? */
export function pendienteVerificacion(l: { status: string | null | undefined; source: string | null | undefined }): boolean {
  return l.status === 'needs_review' && esOrigenSinVerificar(l.source)
}

/**
 * Un lead sin verificar tiene solo dos salidas: "contacto verificado" (pasa a
 * `new` y lo toma el agente) o descartarlo/perderlo. Rutearlo, marcarlo contactado
 * o ganado lo dejaría fuera del agente para siempre sin que nadie haya confirmado
 * que el mail es de quien dice. Devuelve el motivo del bloqueo, o null si pasa.
 */
export function transicionBloqueada(
  antes: { status: string | null | undefined; source: string | null | undefined },
  cambio: { status?: string; rutea?: boolean },
): string | null {
  if (!pendienteVerificacion(antes)) return null
  if (cambio.rutea || (cambio.status && !['new', 'needs_review', 'discarded', 'lost'].includes(cambio.status))) {
    return 'Este pedido lo cargó un agente externo y el contacto no está verificado: marcalo como verificado (pasa al agente) o descartalo.'
  }
  return null
}
