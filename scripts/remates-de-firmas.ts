/**
 * remates-de-firmas.ts — pasa al calendario los remates que las firmas cargan o
 * corrigen desde su panel (18-10-2026).
 *
 * El calendario (/remates, la ficha de cada remate, el mail semanal, la propuesta PRO)
 * lee `src/lib/data/remates.json`. Lo que la firma carga vive en `consignataria_auctions`
 * y sólo lo veían las superficies que consultan la base en vivo (su perfil, el widget,
 * el iCal). Este script los une en el JSON:
 *
 *   1. Saca las filas que puso una corrida anterior (las que traen `firmaAuctionId`):
 *      así un remate que la firma borró desaparece, y el script se puede correr
 *      cualquier cantidad de veces sin duplicar.
 *   2. Por cada remate de la firma, saca el del calendario que corrige (misma firma y
 *      misma fecha|localidad, o la `reemplaza_clave` guardada) y pone el de la firma.
 *
 * Lo corre el scrape diario después del scraper y el workflow `remates-de-firmas.yml`
 * cada hora, que commitea sólo si algo cambió.
 *
 * Uso: npx tsx scripts/remates-de-firmas.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Auction } from '../src/lib/db/schema'
import { claveRemate, normalizeOwnerAuction } from '../src/lib/dal/auctions'
import { getAllProfiles, getCanonicalSlug } from '../src/lib/data/consignataria-slugs'

const RUTA = resolve(process.cwd(), 'src/lib/data/remates.json')
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

/** Igual que normalizeProvince del scraper: mayúsculas y sin acentos. */
const provincia = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

function estado(fecha: string, hoy: string): Auction['status'] {
  return fecha < hoy ? 'completed' : fecha === hoy ? 'live' : 'scheduled'
}

async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } })
  const { data, error } = await db
    .from('consignataria_auctions')
    .select('id, consignataria_slug, title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url, status, flyer_url, reemplaza_clave')
    .order('date', { ascending: true })
    .limit(5000)
  if (error || !data) {
    console.error('No se pudo leer consignataria_auctions:', error?.message)
    process.exit(1)
  }

  const original = readFileSync(RUTA, 'utf8')
  const actuales = JSON.parse(original) as Auction[]
  let remates = actuales.filter((a) => a.firmaAuctionId == null)
  const nombres = new Map(getAllProfiles().map((p) => [p.canonicalSlug, p.displayName]))
  const canonico = (s: string) => getCanonicalSlug(s) || s
  const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10) // hora argentina

  let reemplazados = 0
  for (const fila of data) {
    const slug = canonico(fila.consignataria_slug)
    const nombre = nombres.get(slug)
    if (!nombre) {
      console.warn(`  [salteado] ${fila.consignataria_slug}: no es una firma del directorio`)
      continue
    }
    const propio = normalizeOwnerAuction(fila, nombre, slug)
    propio.province = provincia(propio.province)
    propio.status = estado(propio.date, hoy)
    const claves = new Set([claveRemate(propio), fila.reemplaza_clave].filter(Boolean))
    const antes = remates.length
    remates = remates.filter((a) => !(canonico(a.consignatariaSlug) === slug && claves.has(claveRemate(a))))
    reemplazados += antes - remates.length
    remates.push(propio)
  }

  const nuevo = JSON.stringify(remates, null, 2) + '\n'
  if (nuevo === original) {
    console.log(`Sin cambios (${data.length} remates de firmas).`)
    return
  }
  writeFileSync(RUTA, nuevo)
  console.log(`remates.json: ${data.length} remates de firmas, ${reemplazados} del calendario corregidos por la firma.`)
}

main()
