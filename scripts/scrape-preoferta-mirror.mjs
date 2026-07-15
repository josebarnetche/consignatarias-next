#!/usr/bin/env node
/**
 * Espejo del VALOR ACTUAL del libro de elrural, por lote → Supabase.
 *
 * Fuente: endpoint público de elrural `GET /lote/ajax/<id>/ofertas` → historial
 * de ofertas [{Fecha, Oferta}]; el valor actual es la mayor. Consignatarias se
 * vuelve la ventana de observabilidad del libro (no un libro paralelo).
 *
 * Escribe una fila en preoferta_mirror (remate_slug, valores jsonb, scraped_at).
 * Guarda de cierre: no hace nada pasado el cierre de la pre-oferta.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Uso: node scripts/scrape-preoferta-mirror.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const REMATE_SLUG = 'el-tigre'
const BASE_URL = 'https://preofertas.elrural.com/lote/ajax'
const UA = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36'
const clean = (s) => (s || '').trim().replace(/^["']|["']$/g, '')

const data = JSON.parse(readFileSync('src/lib/data/preoferta-el-tigre.json', 'utf8'))

// Guarda de cierre — no correr pasado el cierre de la pre-oferta.
if (Date.now() >= new Date(data.cierre_preoferta).getTime()) {
  console.log('Pre-oferta cerrada — nada que espejar.')
  process.exit(0)
}

const parseMonto = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0

async function valorActual(id) {
  try {
    const r = await fetch(`${BASE_URL}/${id}/ofertas`, {
      headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    })
    if (!r.ok) return null
    const j = await r.json()
    const montos = (j.data ?? []).map((row) => parseMonto(row.Oferta)).filter((n) => n > 0)
    return montos.length ? Math.max(...montos) : null
  } catch {
    return null
  }
}

async function main() {
  const lotes = (data.lotes ?? []).filter((l) => l.elrural_id)
  const valores = {}
  let ok = 0
  for (const l of lotes) {
    const v = await valorActual(l.elrural_id)
    if (v != null) { valores[l.rp] = v; ok++ }
    await new Promise((res) => setTimeout(res, 120)) // gentil con elrural
  }
  console.log(`Espejo: ${ok}/${lotes.length} lotes con valor de elrural.`)

  // Guarda: si no scrapeamos nada (p.ej. Cloudflare bloqueó la IP de CI), NO
  // pisar el espejo existente con un objeto vacío.
  if (ok === 0) {
    console.error('0 lotes espejados — probable bloqueo de IP. No se actualiza (evita clobber).')
    process.exit(1)
  }

  const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Faltan envs de Supabase.'); process.exit(1) }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { error } = await supabase
    .from('preoferta_mirror')
    .upsert({ remate_slug: REMATE_SLUG, valores, scraped_at: new Date().toISOString() }, { onConflict: 'remate_slug' })
  if (error) { console.error('Upsert falló:', error.message); process.exit(1) }
  console.log('Espejo actualizado en preoferta_mirror.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
