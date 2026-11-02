/**
 * Identificación del cliente de un `tools/call` para la alerta de consumo MCP
 * (`/api/cron/mcp-consumption-alert`). El clientInfo vive en `initialize`, no en
 * `tools/call`: se cruza por `origen`, con el user-agent como respaldo.
 */

// Nombres a ignorar: crawlers/scoring/probes conocidos + clientes de prueba propios.
export const DENY_EXACT = new Set(
  [
    'audit', 'deploy-probe', 'glama-healthcheck-sim', 'jose-spec-check', 'a', 'test',
    'glama', 'siglume mcp router', 'glimind-probe', 'agent-tools.cloud', 'agent-lab',
    'mcpexplorerbot', 'mcpscoringengine', 'aisec-registry-probe', 'capability-probe',
    'prsm-mcp-graph', 'verifymcp-probe', 'mcp-indexer', 'mcp-rugpull-research',
    'mcp-spec-check', 'agent-seo', 'mcp',
    // Proyectos PROPIOS de Memola (no son demanda externa).
    'trazabilidad-simple',
    // Pruebas propias con curl (verif-39, smoke-39…) y clientes de un solo carácter.
    't', 'probe', 'verif-39', 'smoke-39', 'smoke-verif-39',
  ].map((s) => s.toLowerCase()),
)
// Heurística: cualquier cosa que huela a herramienta automatizada.
const DENY_RX = /probe|crawler|scanner|scoring|registry|spec[-_ ]?check|health[-_ ]?check|indexer|router|discover|inspector|monitor|uptime|glimind|siglume|collector|incremental|sonar|verifi|\bcheck\b|\btest\b|bot\b/i

export function isNoise(name: string): boolean {
  const n = name.trim().toLowerCase()
  return DENY_EXACT.has(n) || DENY_RX.test(n) || /^(smoke|verif)[-_]/.test(n)
}

// Librerías HTTP genéricas: un UA así no identifica a nadie.
const UA_GENERICO = /^(python-requests|python-httpx|aiohttp|curl|wget|go-http-client|node-fetch|undici|axios|okhttp|java|libwww|ruby|php)\b/i

/** Primer token del user-agent ("trazabilidad-simple/1.0 (+https://…)" → "trazabilidad-simple"). */
export function nombreDesdeUA(ua: unknown): string | null {
  if (typeof ua !== 'string') return null
  const t = ua.trim()
  if (!t || UA_GENERICO.test(t)) return null
  const tok = t.split(/[\s/]/)[0]?.trim()
  return tok || null
}

/** Nombre del cliente de un tools/call: clientInfo del initialize de su origen; si no, el UA. */
export function resolverCliente(
  md: Record<string, unknown>,
  clientePorOrigen: Map<string, { name: string; version: string | null }>,
): { name: string; version: string | null } | null {
  const propio = (md.client ?? null) as { name?: string; version?: string } | null
  if (propio?.name?.trim()) return { name: propio.name.trim(), version: propio.version ?? null }
  const origen = typeof md.origen === 'string' ? md.origen : null
  const delInit = origen ? clientePorOrigen.get(origen) : undefined
  if (delInit) return delInit
  const ua = nombreDesdeUA(md.ua)
  return ua ? { name: ua, version: null } : null
}
