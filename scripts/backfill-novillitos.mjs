#!/usr/bin/env node
/**
 * One-shot backfill de la serie Novillitos 401/420 kg (MAG haciinfo000307)
 * a Supabase `mag_novillito_history`.
 *
 * La serie existe desde el 9/12/2005 (disposición ONCCA 5701/2005) — cubre la
 * era Liniers y la era MAG. El endpoint NO acepta rangos largos (un año entero
 * devuelve vacío) → pedimos MES a MES.
 *
 * Uso:
 *   node scripts/backfill-novillitos.mjs                  # 2005-12 → hoy
 *   node scripts/backfill-novillitos.mjs --from=2020-01
 *   node scripts/backfill-novillitos.mjs --dry-run        # primer mes, sin escribir
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Throttle: 2s entre meses (~248 requests ≈ 10 min). Cortés con el MAG.
 * Formato fila: Fecha | Máx | Mín | Prom | Mediana | Cabezas | Kgs | Kgs/Cab | Importe
 * (encoding latin-1; mediana viene $0,000 cuando no la calculan → NULL).
 */

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const fromArg = args.find((a) => a.startsWith('--from='))
const DRY_RUN = args.includes('--dry-run')

const FROM = fromArg ? fromArg.split('=')[1] : '2005-12'
const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const THROTTLE_MS = 2000

// GOTCHA .env.local: los valores vienen con `\n` LITERAL y comillas dentro
// (formato del archivo). Con esa basura en la URL, Supabase responde 2xx vacío
// a un path corrupto y el upsert "funciona" sin escribir NADA. Sanitizar SIEMPRE.
const clean = (v) => (v || '').replace(/\\n/g, '').replace(/["'\s]/g, '')
const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const parseNum = (s) => {
  const n = parseFloat(String(s).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Parsea la tabla del mes → filas {date, price_max, ...} */
export function parseMonth(html) {
  const rows = [...html.matchAll(/<TR[^>]*>([\s\S]*?)<\/TR>/gi)]
  const out = []
  for (const m of rows) {
    const cells = [...m[1].matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)]
      .map((c) => c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean)
    if (cells.length < 9) continue
    const dm = cells[0].match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (!dm) continue
    const [pMax, pMin, pAvg, pMed, cab, kgs, kgCab, imp] = cells.slice(1, 9).map(parseNum)
    if (pAvg === null || pAvg <= 0) continue // fila sin operación real
    out.push({
      date: `${dm[3]}-${dm[2]}-${dm[1]}`,
      price_max: pMax,
      price_min: pMin,
      price_avg: pAvg,
      price_median: pMed && pMed > 0 ? pMed : null, // $0,000 = no calculada
      head_count: cab !== null ? Math.round(cab) : null,
      total_kgs: kgs,
      kg_per_head: kgCab,
      total_amount: imp,
    })
  }
  return out
}

export async function fetchMonth(year, month) {
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  const url =
    `https://www.mercadoagroganadero.com.ar/dll/hacienda6.dll/haciinfo000307` +
    `?txtFECHAINI=${encodeURIComponent(`01/${mm}/${year}`)}` +
    `&txtFECHAFIN=${encodeURIComponent(`${lastDay}/${mm}/${year}`)}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return parseMonth(buf.toString('latin1'))
}

async function main() {
  const [fy, fm] = FROM.split('-').map(Number)
  const now = new Date()
  const months = []
  for (let y = fy, m = fm; y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1); ) {
    months.push([y, m])
    m++
    if (m > 12) { m = 1; y++ }
  }
  console.log(`Backfill novillitos 401/420: ${months.length} meses (${FROM} → hoy)${DRY_RUN ? ' [DRY RUN]' : ''}`)

  let total = 0
  let failed = 0
  for (const [y, m] of months) {
    const tag = `${y}-${String(m).padStart(2, '0')}`
    try {
      // Un retry ante fallos transitorios de red/DLL (pasa cada ~30-50 requests)
      let rows
      try {
        rows = await fetchMonth(y, m)
      } catch {
        await new Promise((r) => setTimeout(r, 3000))
        rows = await fetchMonth(y, m)
      }
      if (rows.length && !DRY_RUN) {
        const { error } = await supabase.from('mag_novillito_history').upsert(rows, { onConflict: 'date' })
        if (error) throw new Error(error.message)
        // Sanity check una sola vez: que el write REALMENTE haya llegado a la tabla
        // (un 2xx sobre un path corrupto no da error pero no escribe nada).
        if (total === 0) {
          const { count } = await supabase
            .from('mag_novillito_history')
            .select('*', { count: 'exact', head: true })
          if (!count) {
            console.error('❌ El primer upsert no llegó a la tabla (count 0) — abortando. Revisá URL/key.')
            process.exit(1)
          }
        }
      }
      total += rows.length
      console.log(`  ${tag}: ${rows.length} días (acum ${total})`)
      if (DRY_RUN) { console.log(rows.slice(0, 3)); break }
    } catch (e) {
      failed++
      console.error(`  ✗ ${tag}: ${e.message}`)
      if (failed > 10) { console.error('Demasiados fallos — corto.'); process.exit(1) }
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }
  console.log(`\nListo: ${total} días upserteados · ${failed} meses fallados`)
}

main()
