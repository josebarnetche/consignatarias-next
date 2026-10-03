#!/usr/bin/env node
/**
 * Guardarraíl Fase 4 (docs/PLAN-TEMA-WHITE.md §5): evita que vuelva a aparecer
 * un hex de color que YA tiene token — zinc-*, terminal.*, positive/negative/
 * warning/accent/accent-bright/live (oscuro y su versión -600/-700 de claro).
 * Si hace falta ese color, el token ya existe (src/app/globals.css); escribir
 * el hex de nuevo rompe uno de los dos temas.
 *
 * Es un RATCHET, no un bloqueo total: ~80 archivos pre-existentes (de antes de
 * v1.217.0) todavía tienen estos hex hardcodeados — es la "capa cruda" que
 * describe el plan, y limpiarla es el trabajo de Fase 3, no de este script.
 * El script no vuelve a fallar sobre lo que YA estaba (`baseline` abajo);
 * falla si:
 *   (a) aparece un archivo NUEVO con alguno de estos hex, o
 *   (b) un archivo de la baseline SUMA ocurrencias (en vez de bajarlas).
 * Si limpiás un archivo de la lista, no hace falta tocar la baseline — un
 * conteo menor siempre pasa. Si de verdad hace falta el hex (paleta de marca
 * de un logo, mail, imagen OG, badge/widget embebible para terceros), la
 * carpeta/archivo va en EXEMPT_PATHS con el porqué al lado.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const SRC = join(ROOT, 'src')
const BASELINE_PATH = join(ROOT, 'scripts', 'hardcoded-hex-baseline.json')

// Hex EXACTOS de los tokens (oscuro de src/app/globals.css [data-theme=dark],
// claro/default de :root) — zinc, terminal.*, semánticos. Si un componente
// necesita este color, el token ya existe; no hace falta (ni corresponde)
// escribir el hex.
const TOKEN_HEXES = [
  '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a',
  '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b', // zinc
  '#0a0a0f', '#16161d', // terminal.bg / terminal.panel
  '#34d399', '#f87171', '#fbbf24', '#38bdf8', '#0ea5e9', '#10b981', // semánticos (oscuro)
  '#059669', '#dc2626', '#d97706', '#1d4ed8', '#1e40af', '#047857', // semánticos (claro, -600/-700)
]

// Superficies que legítimamente NO siguen el tema del sitio (no tienen
// <html data-theme>, o son de un tercero): mails, imágenes OG/favicons,
// badges/widgets embebibles, y el archivo que define los pares hex↔token.
const EXEMPT_PATHS = [
  'src/lib/email.ts', // Resend — un mail no tiene tema
  'src/lib/newsletter/', // idem, templates de newsletter
  'src/lib/og/brand.tsx', // imágenes OG, server-rendered sin CSS de la página
  'src/app/api/badge/', // badge embebible para sitios de terceros
  'src/app/api/widget/', // widget embebible para sitios de terceros
  'src/lib/ui/tokens.ts', // acá viven los pares hex↔token (SEMANTIC_HEX_STATIC)
]
// Sufijos de archivo cuyo contenido es una imagen generada server-side
// (OG/Twitter cards, favicons) — no hay <html> ni cascada CSS que herede.
const EXEMPT_SUFFIXES = ['opengraph-image.tsx', 'twitter-image.tsx', 'apple-icon.tsx', 'icon.tsx']

function isExempt(relPath) {
  if (EXEMPT_PATHS.some((p) => relPath.startsWith(p))) return true
  if (EXEMPT_SUFFIXES.some((s) => relPath.endsWith(s))) return true
  return false
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full)
    }
  }
  return out
}

function countHexHits(content) {
  let count = 0
  for (const hex of TOKEN_HEXES) {
    const re = new RegExp(hex.replace('#', '\\#'), 'gi')
    const m = content.match(re)
    if (m) count += m.length
  }
  return count
}

function main() {
  const files = walk(SRC)
  const current = {}
  for (const file of files) {
    const relPath = relative(ROOT, file).split('\\').join('/')
    if (isExempt(relPath)) continue
    const content = readFileSync(file, 'utf8')
    const count = countHexHits(content)
    if (count > 0) current[relPath] = count
  }

  if (process.argv.includes('--write-baseline')) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, Object.keys(current).sort(), 2) + '\n')
    console.log(`Baseline escrita: ${Object.keys(current).length} archivos, ${relative(ROOT, BASELINE_PATH)}`)
    process.exit(0)
  }

  let baseline = {}
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch {
    console.error(`✗ check-no-hardcoded-hex: no pude leer ${relative(ROOT, BASELINE_PATH)}`)
    process.exit(1)
  }

  const newFiles = []
  const increased = []
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0
    if (!(file in baseline)) {
      newFiles.push({ file, count })
    } else if (count > allowed) {
      increased.push({ file, count, allowed })
    }
  }

  if (newFiles.length === 0 && increased.length === 0) {
    console.log(
      `✓ check-no-hardcoded-hex: sin hex nuevos de los ${TOKEN_HEXES.length} tokens (${Object.keys(current).length} archivos en la baseline, heredados).`,
    )
    process.exit(0)
  }

  console.error('✗ check-no-hardcoded-hex: hex de un token escrito literal en vez de la clase/variable.\n')
  for (const { file, count } of newFiles) {
    console.error(`  NUEVO   ${file} (${count} ocurrencia${count === 1 ? '' : 's'})`)
  }
  for (const { file, count, allowed } of increased) {
    console.error(`  SUBIÓ   ${file} (${allowed} → ${count})`)
  }
  console.error(
    '\nUsá el token (zinc-*, terminal-*, accent/positive/negative/warning/live, o `ink`) en vez del hex.' +
      ' Si el hex es realmente necesario (mail, imagen OG, badge/widget para terceros), agregá la ruta a' +
      ' EXEMPT_PATHS en scripts/check-no-hardcoded-hex.mjs con el porqué.',
  )
  process.exit(1)
}

main()
