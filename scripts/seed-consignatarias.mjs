/**
 * Seed consignatarias table from profiles-export.json + consignatarias.json
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   node scripts/seed-consignatarias.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// Load profiles
const profiles = JSON.parse(
  readFileSync(resolve(__dirname, 'profiles-export.json'), 'utf-8')
)

// Load contact data (optional enrichment)
let contactData = []
try {
  contactData = JSON.parse(
    readFileSync(resolve(__dirname, '../src/lib/data/consignatarias.json'), 'utf-8')
  )
} catch {
  console.warn('No consignatarias.json found, seeding without contact data')
}

// Build a lookup by normalized name
const contactMap = new Map()
for (const c of contactData) {
  const key = c.name?.toLowerCase().trim()
  if (key) contactMap.set(key, c)
}

async function seed() {
  console.log(`Seeding ${profiles.length} consignatarias...`)

  const rows = profiles.map(p => {
    // Try to match contact data by name similarity
    const contact = contactMap.get(p.displayName.toLowerCase().trim())
    return {
      canonical_slug: p.canonicalSlug,
      display_name: p.displayName,
      cuit: contact?.cuit || null,
      province: contact?.province || null,
      phone: contact?.phone || null,
      email: contact?.email || null,
      website: contact?.website || null,
    }
  })

  const { data, error } = await supabase
    .from('consignatarias')
    .upsert(rows, { onConflict: 'canonical_slug' })
    .select('canonical_slug')

  if (error) {
    console.error('Seed error:', error)
    process.exit(1)
  }

  console.log(`Seeded ${data.length} consignatarias`)
}

seed()
