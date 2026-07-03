#!/usr/bin/env node
/**
 * check-db-refs — enforcement de la fuente de verdad del esquema.
 *
 * Escanea todos los `.from('tabla')` y `.rpc('funcion')` del código y los valida
 * contra el esquema INTENDIDO = unión de:
 *   1. el esquema REAL de prod (src/lib/database.types.ts, autogenerado), y
 *   2. lo que crean las migraciones del repo (supabase/migrations/*.sql).
 *
 * Clasifica cada referencia:
 *   • OK        → existe en prod (o en migraciones + prod).
 *   • DRIFT     → la crea una migración del repo PERO prod no la tiene (la feature
 *                 falla en silencio en prod hasta reconciliar). Warning, no bloquea.
 *   • ERROR     → no existe en NINGÚN lado (typo real, ej. `alerts`→`alertas`).
 *                 Bloquea (exit 1), salvo que esté en ALLOWLIST (deuda documentada).
 *
 * Motivo: sin tipos aplicados a los clients Supabase, un `.from('alerts')` compila y
 * falla en runtime en silencio — el bug de `dte/ActivationChecklist.tsx`. Ver
 * docs/PROYECTO-C-fuente-de-verdad-esquema.md.
 *
 * Uso:  node scripts/check-db-refs.mjs   (o `pnpm check:db-refs`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const TYPES_PATH = join(ROOT, 'src/lib/database.types.ts')
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')

// Deuda conocida y DOCUMENTADA (no bloquea CI, pero queda visible). Cada entrada
// debe tener un motivo y estar rastreada en docs/PROYECTO-C-fuente-de-verdad-esquema.md.
const ALLOWLIST = new Map([
  ['users', 'El esquema de API-key legacy de alertas/* + onboarding asume public.users, que NO existe en prod ni en migraciones. Deuda: migrar a api_keys hasheadas (Proyecto C §reconciliación).'],
  ['cron_state', 'cron/new-remate-alerts lee/escribe cron_state, que no existe en prod ni en migraciones (¿debería ser cron_runs?). El cron falla en silencio. Deuda a reconciliar (Proyecto C).'],
  ['increment_api_usage', 'FALSO POSITIVO: la función SÍ existe en prod (la usa api-keys.ts) pero el generador de tipos de Supabase no la lista en Functions. No es un bug.'],
])

// ── 1. Esquema real de prod (desde los tipos generados) ──────────────────────
function parseTypes(ts) {
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

// ── 2. Objetos que crean las migraciones del repo ────────────────────────────
function parseMigrations() {
  const tables = new Set()
  const fns = new Set()
  let files = []
  try { files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')) } catch { return { tables, fns } }
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8')
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) tables.add(m[1])
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) tables.add(m[1])
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?["']?([a-zA-Z_][\w]*)/gi)) fns.add(m[1])
  }
  return { tables, fns }
}

// ── 3. Escanear .from()/.rpc() con literal string ────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !p.endsWith('database.types.ts')) out.push(p)
  }
  return out
}
const FROM_RE = /\.from\(\s*['"`]([A-Za-z_][\w]*)['"`]/g
const RPC_RE = /\.rpc\(\s*['"`]([A-Za-z_][\w]*)['"`]/g

// Enmascara comentarios (// y /* */) con espacios, preservando saltos de línea y
// el conteo de líneas, para no matchear `.from()` mencionados en comentarios/docs.
function maskComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
  return out
}

// ── main ─────────────────────────────────────────────────────────────────────
let types
try { types = readFileSync(TYPES_PATH, 'utf8') } catch {
  console.error(`✖ No existe ${TYPES_PATH}. Regenerá los tipos (ver el header del archivo).`); process.exit(2)
}
const prod = parseTypes(types)
if (prod.tables.size === 0) { console.error('✖ No pude parsear database.types.ts.'); process.exit(2) }
const mig = parseMigrations()

const refs = []
for (const path of walk(join(ROOT, 'src'))) {
  const src = maskComments(readFileSync(path, 'utf8')).split('\n')
  src.forEach((line, i) => {
    let m
    FROM_RE.lastIndex = 0
    while ((m = FROM_RE.exec(line))) refs.push({ path, line: i + 1, kind: 'from', name: m[1] })
    RPC_RE.lastIndex = 0
    while ((m = RPC_RE.exec(line))) refs.push({ path, line: i + 1, kind: 'rpc', name: m[1] })
  })
}

const errors = []
const drift = new Map() // name → count
for (const r of refs) {
  const inProd = r.kind === 'from' ? prod.tables.has(r.name) : prod.fns.has(r.name)
  const inMig = r.kind === 'from' ? mig.tables.has(r.name) : mig.fns.has(r.name)
  if (inProd) continue
  if (ALLOWLIST.has(r.name)) continue
  if (inMig) { drift.set(r.name, (drift.get(r.name) || 0) + 1); continue }
  errors.push(r)
}

const rel = (p) => p.replace(ROOT + '/', '')
if (drift.size) {
  console.log(`⚠ DRIFT — ${drift.size} objeto(s) que las migraciones del repo crean pero prod NO tiene (features rotas en prod hasta reconciliar):`)
  for (const [name, n] of [...drift.entries()].sort()) console.log(`   ${name} (${n} refs)`)
  console.log('   → aplicar las migraciones faltantes a prod (ver Proyecto C).\n')
}
if (ALLOWLIST.size) {
  console.log(`ℹ ALLOWLIST — deuda documentada (no bloquea): ${[...ALLOWLIST.keys()].join(', ')}\n`)
}
if (errors.length === 0) {
  console.log(`✓ check-db-refs: OK — sin referencias a objetos inexistentes. (${prod.tables.size} tablas/vistas prod + ${mig.tables.size} de migraciones)`)
  process.exit(0)
}
console.error(`✖ check-db-refs: ${errors.length} referencia(s) a objetos que NO existen en prod NI en migraciones (typo real):\n`)
for (const e of errors) console.error(`  ${rel(e.path)}:${e.line}  .${e.kind}('${e.name}')  ← inexistente`)
console.error('\nCorregí al nombre real, o si es deuda conocida agregala a ALLOWLIST con motivo.')
process.exit(1)
