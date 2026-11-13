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
    // Sesiones Claude de José (confirmado 02-11-2026): no son demanda externa.
    'claude-code', 'claude-user', 'claude-ai', 'anthropic/claudeai',
    // Pruebas propias con curl (verif-39, smoke-39…) y clientes de un solo carácter.
    't', 'probe', 'verif-39', 'smoke-39', 'smoke-verif-39',
    // Escáneres/directorios vistos 03→09-11-2026 que la heurística no atrapa.
    'agoranome-seller-tools', 'polly-catalog-verify', 'dollardollardollar-signals',
    'mcp-index', 'mcp-discovery-measurement',
  ].map((s) => s.toLowerCase()),
)
// Heurística: cualquier cosa que huela a herramienta automatizada.
const DENY_RX = /probe|crawler|scanner|scoring|registry|spec[-_ ]?check|health[-_ ]?check|indexer|router|discover|inspector|monitor|uptime|glimind|siglume|collector|incremental|sonar|verifi|\bcheck\b|\btest\b|bot\b/i

export function isNoise(name: string): boolean {
  const n = name.trim().toLowerCase()
  return DENY_EXACT.has(n) || DENY_RX.test(n) || /^(smoke|verif|memola)[-_]/.test(n)
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

/**
 * Uso del MCP como proxy gratis de un LLM (06-11-2026: "17*23=?" con model gpt-4o-mini).
 * Ninguna tool nuestra acepta `model`/`messages`: si los args los traen, no es demanda real.
 */
export function esProxyLLM(args: unknown): boolean {
  let a: unknown = args
  if (typeof a === 'string') {
    try { a = JSON.parse(a) } catch { return false }
  }
  if (!a || typeof a !== 'object' || Array.isArray(a)) return false
  return 'model' in a || 'messages' in a
}

/**
 * IPs propias de Memola (45.175.x): todo lo que sale de ahí es nuestro (memola-civ,
 * pruebas con curl…), con cualquier nombre de cliente. Visto 12-11-2026.
 */
export function esIpPropia(ip: unknown): boolean {
  return typeof ip === 'string' && ip.startsWith('45.175.')
}

/* ------------------------------------------------------------------ */
/*  Vigilancia de la integración anónima de Misiones (13-11-2026).     */
/*  Es el único consumidor externo sostenido y entra SIN UA ni         */
/*  initialize: la alerta por cliente nombrado no la ve nunca. Se la   */
/*  sigue por su firma: 4 alias en castellano, sin UA, IP no propia.   */
/* ------------------------------------------------------------------ */
export const MISIONES_ALIAS = ['get_indice_novillo', 'get_precios_hacienda', 'get_contexto_macro', 'list_remates'] as const
/** Piso por día hábil. 15/10–12/11/2026: 21 días hábiles, mínimo 68, sólo 1 debajo de 76. */
export const MISIONES_PISO = 76

export function esFirmaMisiones(md: Record<string, unknown>): boolean {
  if (md.probe === true) return false
  if (typeof md.tool !== 'string' || !(MISIONES_ALIAS as readonly string[]).includes(md.tool)) return false
  if (typeof md.ua === 'string' && md.ua.trim() !== '') return false
  return !esIpPropia(md.ip)
}

/** Día calendario en Argentina (UTC−3 fijo, sin horario de verano) como YYYY-MM-DD. */
export function diaART(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10)
}

/** Los `n` días lunes–viernes ANTERIORES a `hoy` (YYYY-MM-DD), el más reciente primero. */
export function diasHabilesPrevios(hoy: string, n: number): string[] {
  const out: string[] = []
  const d = new Date(`${hoy}T12:00:00Z`)
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() - 1)
    const w = d.getUTCDay()
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/**
 * Alarma si los DOS últimos días hábiles cerrados quedaron debajo del piso.
 * Un solo día bajo (09/11: 68, y al otro día 108) no alcanza. No conoce los
 * feriados: dos feriados hábiles seguidos darían una falsa alarma, y el mail lo aclara.
 */
export function evaluarMisiones(
  conteo: Map<string, number>,
  hoy: string,
): { dias: { dia: string; n: number }[]; alarma: boolean; clave: string } {
  const dias = diasHabilesPrevios(hoy, 2).map((dia) => ({ dia, n: conteo.get(dia) ?? 0 }))
  return {
    dias,
    alarma: dias.every((x) => x.n < MISIONES_PISO),
    clave: dias.map((x) => x.dia).join('|'),
  }
}
