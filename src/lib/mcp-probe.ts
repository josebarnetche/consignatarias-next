/**
 * mcp-probe.ts — ¿Esta llamada MCP la hizo un escáner y no un usuario?
 *
 * POR QUÉ EXISTE
 * En 28 días, el 100 % de los 530 errores de `tools/call` vinieron de bots que
 * prueban el server con argumentos vacíos o en cero (python-requests /
 * agentstatus-gate, BrickBlue…). Logueados como `error`, tapan la señal: una
 * falla real de una integración (la de Misiones, por ejemplo) se pierde entre
 * cientos de "errores" que nunca fueron de nadie. `OpsStatus` ya tiene `probe`
 * para eso (ver src/lib/ops.ts); faltaba la regla que lo decida.
 *
 * Es una regla PURA y conservadora: ante la duda devuelve false (mejor un error
 * de más que esconder uno real).
 *
 * CÓMO CABLEARLA (no está cableada a propósito: route.ts lo edita otra persona)
 * En src/app/api/mcp/route.ts, en el case 'tools/call', al loguear el resultado:
 *
 *   const probe = esProbe({
 *     ua: rmeta.ua,
 *     clientName: null,            // tools/call no trae clientInfo (server stateless);
 *                                  // en 'initialize' pasar params.clientInfo.name
 *     args,
 *     isError: !!result.isError,
 *     required: tool.inputSchema?.required,
 *   })
 *   logMcp({
 *     method: 'tools/call',
 *     ok: !result.isError,
 *     probe,                       // logMcp ya traduce probe → status 'probe'
 *     startedAt,
 *     meta: { ...rmeta, tool: name, args: redactArgs(args), is_error: result.isError ?? false, probe },
 *   })
 *
 * Con eso la fila de ops_events queda con `status='probe'` y `metadata.probe=true`,
 * y /admin/ops deja de contarla como error. Lo mismo en la rama de excepción.
 */

/**
 * Firmas de escáneres conocidos, tal como aparecen en la User-Agent o en
 * `clientInfo.name`. Todos medidos en ops_events con CERO uso real.
 * Se comparan en minúsculas, por subcadena.
 */
export const FIRMAS_ESCANER: readonly string[] = [
  'python-requests',
  'agentstatus',
  'brickblue',
  'honestas-mcp-scanner',
  'glimind-probe',
  'fixter',
  'glama',
  'mcp-scanner',
  'mcpbeat',
  'siglume',
]

/** Palabras genéricas de herramientas de sondeo. Van con borde de palabra para no pescar nombres legítimos. */
const PATRON_GENERICO = /\b(scanner|probe|crawler|spider)\b/i

export function esFirmaEscaner(s: string | null | undefined): boolean {
  if (!s) return false
  const t = s.toLowerCase()
  return FIRMAS_ESCANER.some((f) => t.includes(f)) || PATRON_GENERICO.test(t)
}

/**
 * Valor "vacío" en el sentido de un escáner que rellena el schema con ceros:
 * ausente, null, string en blanco, 0, '0', false, [] o {}.
 */
export function esValorVacio(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === '' || v.trim() === '0'
  if (typeof v === 'number') return v === 0 || Number.isNaN(v)
  if (typeof v === 'boolean') return v === false
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

export interface ProbeInput {
  /** User-Agent del request (puede venir vacía: la integración de Misiones la manda vacía). */
  ua?: string | null
  /** `clientInfo.name` del initialize, si se conoce. */
  clientName?: string | null
  /** Argumentos del tools/call. */
  args?: Record<string, unknown> | null
  /** Si la tool devolvió isError. */
  isError?: boolean
  /** `inputSchema.required` de la tool, si se conoce. */
  required?: readonly string[] | null
}

/**
 * true si la llamada es de un escáner:
 *  1. UA o clientInfo de un escáner conocido; o
 *  2. la tool declara parámetros obligatorios y TODOS vienen vacíos/cero/ausentes; o
 *  3. no se conoce el schema, la tool falló, y todos los argumentos vienen
 *     vacíos/cero/ausentes (una tool sin parámetros que responde bien no es probe).
 *
 * Una UA vacía, por sí sola, NO es probe.
 */
export function esProbe({ ua, clientName, args, isError = false, required }: ProbeInput): boolean {
  if (esFirmaEscaner(ua) || esFirmaEscaner(clientName)) return true

  const a = args ?? {}
  const req = (required ?? []).filter(Boolean)
  if (req.length > 0) {
    return req.every((k) => esValorVacio(a[k]))
  }

  if (!isError) return false
  return Object.values(a).every(esValorVacio)
}
