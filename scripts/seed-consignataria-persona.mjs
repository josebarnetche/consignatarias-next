#!/usr/bin/env node
/**
 * seed-consignataria-persona.mjs — push the persona-detrás seed JSON to
 * Supabase. Idempotent (upsert by canonical_slug).
 *
 * Reads:   src/lib/data/consignataria-persona-seed.json
 * Writes:  public.consignatarias  (region_operativa, especialidad, anos_oficio,
 *          bio_referente, referente_nombre, referente_cargo, foto_referente_url)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:  node scripts/seed-consignataria-persona.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SEED = join(ROOT, 'src/lib/data/consignataria-persona-seed.json')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(2)
}

const ALLOWED_KEYS = new Set([
  'region_operativa',
  'especialidad',
  'anos_oficio',
  'bio_referente',
  'referente_nombre',
  'referente_cargo',
  'foto_referente_url',
])

const ESPECIALIDAD_VOCAB = new Set(['cria', 'invernada', 'general', 'reproductores', 'lechera', 'mixto'])

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const seed = JSON.parse(readFileSync(SEED, 'utf8'))

let upserts = 0
let warnings = 0
const errors = []

for (const [slug, payload] of Object.entries(seed)) {
  if (slug.startsWith('$')) continue // skip metadata keys
  const update = {}
  for (const [k, v] of Object.entries(payload)) {
    // Underscore-prefixed keys are audit metadata (_source_urls, _researched_at,
    // _notes, etc.) — kept in the JSON for traceability, silently ignored here.
    if (k.startsWith('_')) continue
    if (!ALLOWED_KEYS.has(k)) {
      console.error(`[${slug}] unknown field "${k}" — skipped`)
      warnings++
      continue
    }
    update[k] = v
  }
  if (update.especialidad && !ESPECIALIDAD_VOCAB.has(update.especialidad)) {
    console.error(`[${slug}] especialidad "${update.especialidad}" not in vocab — skipped`)
    warnings++
    continue
  }
  if (Object.keys(update).length === 0) continue

  const { error } = await supabase
    .from('consignatarias')
    .update(update)
    .eq('canonical_slug', slug)
  if (error) {
    errors.push({ slug, error: error.message })
    continue
  }
  upserts++
  console.log(`✓ ${slug}: ${Object.keys(update).join(', ')}`)
}

console.log('')
console.log(`upserted: ${upserts} · warnings: ${warnings} · errors: ${errors.length}`)
for (const e of errors) console.error(`  ${e.slug}: ${e.error}`)
process.exit(errors.length > 0 ? 1 : 0)
