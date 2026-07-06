#!/usr/bin/env node
/**
 * Backfill del dólar OFICIAL diario a `usd_oficial_history` (2006 → hoy).
 *
 * Fuentes:
 *  - 2006-2010: BCRA estadisticascambiarias (tipoCotizacion, A3500 minorista ref.)
 *  - 2011→hoy: ArgentinaDatos /v1/cotizaciones/dolares/oficial (1 request)
 *
 * Uso: node scripts/backfill-usd-oficial.mjs [--dry-run]
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
// GOTCHA .env.local: valores con \n literal y comillas → sanitizar SIEMPRE
const clean = (v) => (v || '').replace(/\\n/g, '').replace(/["'\s]/g, '')
const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('❌ Falta env'); process.exit(1)
}
const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

let total = 0
async function upsert(rows, tag) {
  if (!rows.length) return
  if (DRY_RUN) { console.log(tag, rows.length, 'filas·muestra:', rows[0], rows[rows.length - 1]); return }
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase.from('usd_oficial_history').upsert(rows.slice(i, i + 1000), { onConflict: 'date' })
    if (error) throw new Error(`${tag}: ${error.message}`)
  }
  // sanity check anti-escritura-fantasma
  if (total === 0) {
    const { count } = await supabase.from('usd_oficial_history').select('*', { count: 'exact', head: true })
    if (!count) { console.error('❌ Upsert no llegó a la tabla — abortando.'); process.exit(1) }
  }
  total += rows.length
  console.log(`  ${tag}: ${rows.length} filas (acum ${total})`)
}

// 1) BCRA 2006-2010, por año
for (let y = 2006; y <= 2010; y++) {
  const url = `https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/USD?fechadesde=${y}-01-01&fechahasta=${y}-12-31&limit=1000`
  const res = await fetch(url)
  if (!res.ok) { console.error(`✗ BCRA ${y}: HTTP ${res.status}`); continue }
  const json = await res.json()
  const rows = (json.results ?? [])
    .map((r) => {
      const cot = r.detalle?.[0]?.tipoCotizacion
      return cot > 0 ? { date: r.fecha, venta: cot, compra: null, source: 'bcra-a3500' } : null
    })
    .filter(Boolean)
  await upsert(rows, `bcra-${y}`)
  await new Promise((r) => setTimeout(r, 1500))
}

// 2) ArgentinaDatos 2011→hoy
const res = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial')
if (!res.ok) { console.error(`✗ argentinadatos: HTTP ${res.status}`); process.exit(1) }
const serie = await res.json()
const rows = serie
  .filter((r) => r.venta > 0)
  .map((r) => ({ date: r.fecha, venta: r.venta, compra: r.compra ?? null, source: 'argentinadatos' }))
await upsert(rows, 'argentinadatos-2011+')

console.log(`\nListo: ${total} filas upserteadas`)
