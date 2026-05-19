#!/usr/bin/env node
/**
 * merge-senasa-into-frigorificos.mjs — reconcile our static frigorificos.json
 * with the current SENASA registry snapshot.
 *
 * Reads:
 *   src/lib/data/frigorificos.json       (our curated list — was 362)
 *   src/lib/data/senasa-habilitados.json (current SENASA Ciclo I/II/III)
 *
 * Writes back to frigorificos.json with:
 *   - Existing rows: stamped with `senasaActive` (true if CUIT in current
 *     snapshot, false otherwise) and `senasaLastSeen` (snapshot date, or
 *     null if never verified).
 *   - New rows: every SENASA CUIT not in our list gets appended. Stage is
 *     mapped from the registry's Ciclo (I=1, II=2, III=3; if multiple,
 *     keep the most operational i.e. lowest).
 *
 * Run: node scripts/merge-senasa-into-frigorificos.mjs
 * Idempotent — running twice with the same SENASA snapshot produces no diff
 * beyond the senasaLastSeen date.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FRIGS_PATH = join(ROOT, 'src/lib/data/frigorificos.json')
const SENASA_PATH = join(ROOT, 'src/lib/data/senasa-habilitados.json')

const CICLO_TO_STAGE = {
  'CICLO I - MAT.FRIG.': 1,
  'CICLO II - ELABORADOR': 2,
  'CICLO III - DADOR DE FRIO': 3,
}

function pickStage(ciclos) {
  // Multiple ciclos can apply. Pick the most operational (lowest stage).
  let best = 3
  for (const c of ciclos) {
    const s = CICLO_TO_STAGE[c]
    if (s && s < best) best = s
  }
  return best
}

function normalizeProvince(p) {
  // SENASA already uppercases. Trim + sanity.
  return String(p || '').trim().toUpperCase()
}

const frigs = JSON.parse(readFileSync(FRIGS_PATH, 'utf8'))
const senasa = JSON.parse(readFileSync(SENASA_PATH, 'utf8'))
const senasaDate = senasa.scrapedAt.slice(0, 10)

const byCuit = new Map()
for (const f of frigs) byCuit.set(f.cuit, f)

let stampedActive = 0
let stampedInactive = 0
let added = 0

// 1) Stamp existing rows
for (const f of frigs) {
  const inSenasa = senasa.byCuit[f.cuit] != null
  f.senasaActive = inSenasa
  if (inSenasa) {
    f.senasaLastSeen = senasaDate
    stampedActive++
  } else {
    // Keep any prior senasaLastSeen if it exists, otherwise null
    if (f.senasaLastSeen == null) f.senasaLastSeen = null
    stampedInactive++
  }
}

// 2) Append SENASA-only rows. Preserve sort = original then appended.
for (const cuit of Object.keys(senasa.byCuit)) {
  if (byCuit.has(cuit)) continue
  const r = senasa.byCuit[cuit]
  frigs.push({
    cuit,
    name: r.nombre || r.propietario || '(sin razón social)',
    matricula: r.nroOficial || '',
    province: normalizeProvince(r.provincia),
    stage: pickStage(r.ciclos),
    senasaActive: true,
    senasaLastSeen: senasaDate,
    source: 'senasa',
  })
  added++
}

writeFileSync(FRIGS_PATH, JSON.stringify(frigs, null, 2) + '\n')

console.log(`Updated ${FRIGS_PATH}`)
console.log(`  existing rows stamped active:    ${stampedActive}`)
console.log(`  existing rows stamped inactive:  ${stampedInactive}`)
console.log(`  new rows from SENASA:            ${added}`)
console.log(`  total now:                       ${frigs.length}`)
