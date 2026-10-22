/**
 * Qué leads puede tomar el agente sin que una persona los haya verificado.
 *
 * Los pedidos que entran por el MCP (`source` 'mcp:…', p. ej. 'mcp:market_match')
 * los carga un agente externo: puede poner el email de OTRA persona. Por eso entran
 * en `needs_review`, y el agente no les escribe hasta que alguien los verifique y
 * los pase a `new`. Coordinado con la sesión del MCP (INTEGRACION-SESIONES-2026-10-22.md).
 */

/** Orígenes que cargó un tercero automatizado: no se les escribe sin verificación humana. */
export function esOrigenSinVerificar(source: string | null | undefined): boolean {
  return /^mcp:/i.test((source ?? '').trim())
}

/** ¿Puede el agente tomar (y escribirle a) este lead? */
export function tomable(l: { status: string | null | undefined; source: string | null | undefined }): boolean {
  if (l.status === 'new') return true
  if (l.status === 'needs_review') return !esOrigenSinVerificar(l.source)
  return false
}
