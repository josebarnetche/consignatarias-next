#!/usr/bin/env node
/**
 * check-db-refs — enforcement de la fuente de verdad del esquema.
 *
 * QUÉ CUBRE (alcance explícito — no vende de más):
 *   • Valida `.from('literal')` y `.rpc('literal')` cuyo argumento es un STRING
 *     LITERAL (comilla simple/doble/backtick sin interpolación).
 *   • Escanea `.ts .tsx .js .mjs` bajo `src/` y `scripts/` (excluye node_modules,
 *     .next, .git, database.types.ts y este propio archivo).
 *   • Ignora comentarios (`//` y `/​* *​/`) para no matchear código comentado.
 *
 * QUÉ **NO** CUBRE (explícito):
 *   • Referencias DINÁMICAS: `.from(variable)`, `.from(`${x}`)`. No resuelve el
 *     valor. ESA capa la cubre ahora el TIPADO de los clients
 *     (`createClient<Database>` en src/lib/supabase*.ts): un `.from(tabla)` con una
 *     variable de tipo tabla lo valida TypeScript, no este scanner. Este scanner es
 *     la barrera para los literales; el tipo, para lo dinámico. (No intentamos
 *     detectar dinámicas acá: es indistinguible por regex de `Array.from`/`Buffer.from`.)
 *   • SQL embebido / migraciones (se usan como fuente, no se validan sus queries).
 *   • `scripts/archive/` (código archivado), edge functions fuera de estas carpetas,
 *     otros lenguajes, ORMs.
 *
 * CLASIFICACIÓN de cada literal:
 *   • OK        → existe en prod (database.types.ts) o en migraciones+prod.
 *   • DRIFT     → lo crea una migración del repo pero prod NO lo tiene (feature
 *                 rota en prod hasta reconciliar). Warning por defecto; con
 *                 `--strict` (o CHECK_DB_REFS_STRICT=1) BLOQUEA.
 *   • ERROR     → no existe en ningún lado (typo real, ej. `alerts`→`alertas`).
 *                 Bloquea (exit 1), salvo que esté en ALLOWLIST (deuda con dueño/fecha).
 *
 * Motivo: sin tipos aplicados, un `.from('alerts')` compila y falla en runtime en
 * silencio (el bug de ActivationChecklist). Ver docs/PROYECTO-C-fuente-de-verdad-esquema.md.
 *
 * Uso:  node scripts/check-db-refs.mjs [--strict]   (o `pnpm check:db-refs`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const TYPES_PATH = join(ROOT, 'src/lib/database.types.ts')
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')
const SCAN_ROOTS = ['src', 'scripts']
const STRICT = process.argv.includes('--strict') || process.env.CHECK_DB_REFS_STRICT === '1'

/**
 * ALLOWLIST — deuda conocida y DOCUMENTADA (no bloquea; queda visible). Cada
 * entrada exige: dueño, fecha de alta, severidad, issue/criterio de vencimiento.
 * No es un cementerio: si vence sin resolver, la CI de gobierno debería escalarla.
 */
const ALLOWLIST = new Map([
  ['users', {
    reason: 'API-key legacy de alertas/* + onboarding asume public.users (texto plano), que NO existe en prod ni en migraciones.',
    owner: 'backend', since: '2026-07-03', severity: 'alta',
    exit: 'Migrar a api_keys hasheadas (Proyecto C §reconciliación). Vence: al reescribir alertas/*.',
  }],
  ['cron_state', {
    reason: 'cron/new-remate-alerts usa cron_state, inexistente en prod y migraciones (¿= cron_runs?).',
    owner: 'backend', since: '2026-07-03', severity: 'media',
    exit: 'Reapuntar a cron_runs o crear la tabla (Proyecto C). Vence: próxima pasada por ese cron.',
  }],
  ['increment_api_usage', {
    reason: 'FALSO POSITIVO: la función SÍ existe en prod (la usa api-keys.ts) pero el generador de tipos no la lista en Functions.',
    owner: 'infra', since: '2026-07-03', severity: 'baja',
    exit: 'Se cierra si un futuro generador la incluye. No es deuda real.',
  }],
])

// ── 1. Esquema real de prod (desde los tipos generados) ──────────────────────
export function parseTypes(ts) {
  const lines = ts.split('\n')
  const tables = new Set()
  const fns = new Set()
  let section = null
  for (const line of lines) {
    const sec = line.match(/^ {4}(Tables|Views|Functions|Enums|CompositeTypes): \{$/)
    if (sec) { section = sec[1]; continue }
    if (/^ {4}\}/.test(line)) { section = null; continue }
    const key = line.match(/^ {6}([A-Za-z_][\w]*): \{$/)
    if (!key) continue
    if (section === 'Tables' || section === 'Views') tables.add(key[1])
    else if (section === 'Functions') fns.add(key[1])
  }
  return { tables, fns }
}

// Extrae objetos (tablas/vistas/funciones) de un string SQL — testeable aparte.
export function parseSql(sql, tables = new Set(), fns = new Set()) {
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) tables.add(m[1])
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) tables.add(m[1])
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) fns.add(m[1])
  return { tables, fns }
}

// Extrae refs literales .from()/.rpc() de un string de código (comentarios enmascarados).
export function extractRefs(code) {
  const refs = []
  maskComments(code).split('\n').forEach((line, i) => {
    let m
    FROM_LIT.lastIndex = 0
    while ((m = FROM_LIT.exec(line))) refs.push({ line: i + 1, kind: 'from', name: m[1] })
    RPC_LIT.lastIndex = 0
    while ((m = RPC_LIT.exec(line))) refs.push({ line: i + 1, kind: 'rpc', name: m[1] })
  })
  return refs
}

// ── 2. Objetos que crean las migraciones del repo ────────────────────────────
function parseMigrations() {
  const tables = new Set()
  const fns = new Set()
  let files = []
  try { files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')) } catch { return { tables, fns } }
  for (const f of files) parseSql(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'), tables, fns)
  return { tables, fns }
}

// ── 3. Recolectar archivos + enmascarar comentarios ──────────────────────────
function walk(dir, out = []) {
  let entries = []
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === '.git' || name === 'archive') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    // Excluye los tipos generados, este script, y los tests (sus fixtures contienen
    // .from('x') de mentira que no son código real).
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name) && !/\.(test|spec)\./.test(name) && !p.endsWith('database.types.ts') && !p.endsWith('check-db-refs.mjs')) out.push(p)
  }
  return out
}
// Enmascara comentarios preservando saltos de línea y conteo de columnas.
function maskComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
  return out
}
// SOLO literales `.from('x')` / `.rpc('x')`. Un nombre de tabla válido es
// [a-z_][\w]* (sin guiones → así se excluye `.storage.from('mi-bucket')`). Lo
// dinámico lo cubre el tipado de los clients (ver header), no este scanner.
const FROM_LIT = /\.from\(\s*['"`]([A-Za-z_][\w]*)['"`]/g
const RPC_LIT = /\.rpc\(\s*['"`]([A-Za-z_][\w]*)['"`]/g

// ── main (solo cuando se corre como CLI, no al importar para tests) ───────────
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) runCli()

function runCli() {
let types
try { types = readFileSync(TYPES_PATH, 'utf8') } catch {
  console.error(`✖ No existe ${TYPES_PATH}. Regenerá los tipos (ver el header del archivo).`); process.exit(2)
}
const prod = parseTypes(types)
if (prod.tables.size === 0) { console.error('✖ No pude parsear database.types.ts.'); process.exit(2) }
const mig = parseMigrations()

const refs = []
for (const root of SCAN_ROOTS) {
  for (const path of walk(join(ROOT, root))) {
    const src = maskComments(readFileSync(path, 'utf8')).split('\n')
    src.forEach((line, i) => {
      let m
      FROM_LIT.lastIndex = 0
      while ((m = FROM_LIT.exec(line))) refs.push({ path, line: i + 1, kind: 'from', name: m[1] })
      RPC_LIT.lastIndex = 0
      while ((m = RPC_LIT.exec(line))) refs.push({ path, line: i + 1, kind: 'rpc', name: m[1] })
    })
  }
}

const errors = []
const driftRefs = []
for (const r of refs) {
  const inProd = r.kind === 'from' ? prod.tables.has(r.name) : prod.fns.has(r.name)
  const inMig = r.kind === 'from' ? mig.tables.has(r.name) : mig.fns.has(r.name)
  if (inProd) continue
  if (ALLOWLIST.has(r.name)) continue
  if (inMig) { driftRefs.push(r); continue }
  errors.push(r)
}

const rel = (p) => p.replace(ROOT + '/', '')
const driftByName = new Map()
for (const r of driftRefs) driftByName.set(r.name, (driftByName.get(r.name) || 0) + 1)

if (driftByName.size) {
  const label = STRICT ? '✖ DRIFT (strict → bloquea)' : '⚠ DRIFT'
  console[STRICT ? 'error' : 'log'](`${label} — ${driftByName.size} objeto(s) que las migraciones crean pero prod NO tiene (feature rota en prod):`)
  for (const [name, n] of [...driftByName.entries()].sort()) console[STRICT ? 'error' : 'log'](`   ${name} (${n} refs)`)
  console[STRICT ? 'error' : 'log']('   → aplicar las migraciones faltantes a prod (ver Proyecto C).\n')
}
if (ALLOWLIST.size) {
  console.log(`ℹ ALLOWLIST — deuda documentada (dueño/fecha/severidad en el script): ${[...ALLOWLIST.keys()].join(', ')}\n`)
}

const driftBlocks = STRICT && driftByName.size > 0
if (errors.length === 0 && !driftBlocks) {
  console.log(`✓ check-db-refs: OK — ${refs.length} refs literales validadas, sin inexistentes. (${prod.tables.size} tablas/vistas prod + ${mig.tables.size} de migraciones${STRICT ? '; modo strict' : ''})`)
  process.exit(0)
}
if (errors.length) {
  console.error(`✖ check-db-refs: ${errors.length} referencia(s) a objetos que NO existen en prod NI en migraciones (typo real):\n`)
  for (const e of errors) console.error(`  ${rel(e.path)}:${e.line}  .${e.kind}('${e.name}')  ← inexistente`)
  console.error('\nCorregí al nombre real, o si es deuda conocida agregala a ALLOWLIST con dueño/fecha/severidad.')
}
process.exit(1)
}
