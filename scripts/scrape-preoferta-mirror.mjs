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
import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://preofertas.elrural.com/lote/ajax'
const UA = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36'
const clean = (s) => (s || '').trim().replace(/^["']|["']$/g, '')
const parseMonto = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0

// Todas las pre-ofertas del registry (un JSON por remate) que sigan ABIERTAS.
const DIR = 'src/lib/data'
const PREOFERTAS = readdirSync(DIR)
  .filter((f) => /^preoferta-.*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))
  .filter((p) => p.slug && p.cierre_preoferta && Date.now() < new Date(p.cierre_preoferta).getTime())

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
  if (PREOFERTAS.length === 0) { console.log('No hay pre-ofertas abiertas — nada que espejar.'); return }

  const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Faltan envs de Supabase.'); process.exit(1) }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  let algo = false
  for (const p of PREOFERTAS) {
    const lotes = (p.lotes ?? []).filter((l) => l.elrural_id)
    const valores = {}
    let ok = 0
    for (const l of lotes) {
      const v = await valorActual(l.elrural_id)
      if (v != null) { valores[l.rp] = v; ok++ }
      await new Promise((res) => setTimeout(res, 120)) // gentil con elrural
    }
    console.log(`[${p.slug}] Espejo: ${ok}/${lotes.length} lotes.`)
    // Guarda: si no scrapeamos nada (Cloudflare bloqueó la IP), NO pisar con vacío.
    if (ok === 0) { console.error(`[${p.slug}] 0 lotes — probable bloqueo de IP; no se actualiza.`); continue }
    const { error } = await supabase
      .from('preoferta_mirror')
      .upsert({ remate_slug: p.slug, valores, scraped_at: new Date().toISOString() }, { onConflict: 'remate_slug' })
    if (error) { console.error(`[${p.slug}] Upsert falló:`, error.message); continue }
    algo = true
  }
  if (!algo) process.exit(1) // ninguna se pudo espejar (todas bloqueadas)
  console.log('Espejo actualizado.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
