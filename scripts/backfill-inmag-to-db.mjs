#!/usr/bin/env node
/**
 * One-shot INMAG history backfill to Supabase mag_inmag_history.
 *
 * Fetches MAG `haciinfo000011` in 6-month chunks from --from (default 2015-01-01)
 * to today, parses every daily row, upserts into mag_inmag_history.
 *
 * Usage:
 *   node scripts/backfill-inmag-to-db.mjs                 # 2015-01-01 → today
 *   node scripts/backfill-inmag-to-db.mjs --from=2020-01-01
 *   node scripts/backfill-inmag-to-db.mjs --dry-run        # print first chunk only
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Throttle: 5 seconds between chunks. With ~12 chunks/year × 11 years = 132 chunks
 * × 5s = ~11 minutes. Polite to MAG.
 */

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const fromArg = args.find((a) => a.startsWith('--from='))
const DRY_RUN = args.includes('--dry-run')

const FROM = fromArg ? fromArg.split('=')[1] : '2015-01-01'
const TODAY = new Date().toISOString().slice(0, 10)
const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const THROTTLE_MS = 5000

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function ddmmyyyy(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function addMonths(iso, months) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

function clampToToday(iso) {
  return iso > TODAY ? TODAY : iso
}

/**
 * Parse MAG response HTML. Returns array of { date, head_count, total_amount, inmag_value }.
 * Date row format:
 *   <TR><TD>Lu 06/05/2026</TD><TD>9.649</TD><TD>13.164.685.200,00</TD><TD>4.242,232</TD>[<TD>variation</TD>]
 * INMAG value can be `- *` when novillos < 300; we record null + calculated=false in that case.
 */
function parseChunk(html) {
  // Look for rows whose first cell has a date pattern DD/MM/YYYY
  const rowRegex =
    /<TR[^>]*>\s*<TD[^>]*>(?:[A-Za-zñÑáéíóú&;]+\s*)?(\d{2})\/(\d{2})\/(\d{4})<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>\s*<TD[^>]*>([^<]+)<\/TD>(?:\s*<TD[^>]*>([^<]*)<\/TD>)?/gi

  const rows = []
  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const [, dd, mm, yyyy, headStr, importeStr, inmagStr, varStr] = match
    const date = `${yyyy}-${mm}-${dd}`
    const head_count = parseInt(headStr.replace(/\./g, '').trim(), 10) || null
    const total_amount =
      parseFloat(importeStr.replace(/\./g, '').replace(/,/g, '.').trim()) || null

    const rawInmag = inmagStr.trim()
    let inmag_value = null
    let inmag_calculated = true
    if (rawInmag.includes('*') || rawInmag.startsWith('-')) {
      inmag_calculated = false
    } else {
      // "4.242,232" → 4242.232
      const parsed = parseFloat(
        rawInmag.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(/,/g, '.'),
      )
      inmag_value = Number.isFinite(parsed) ? parsed : null
      if (inmag_value === null) inmag_calculated = false
    }

    let variation = null
    if (varStr && varStr.trim() && !varStr.includes('*')) {
      const v = parseFloat(
        varStr
          .replace(/[^\d,.\-+%]/g, '')
          .replace(/%/g, '')
          .replace(/\./g, '')
          .replace(/,/g, '.'),
      )
      if (Number.isFinite(v)) variation = v
    }

    rows.push({ date, head_count, total_amount, inmag_value, inmag_calculated, variation })
  }
  return rows
}

async function fetchChunk(fromIso, toIso) {
  const url =
    `https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011` +
    `?txtFECHAINI=${encodeURIComponent(ddmmyyyy(fromIso))}` +
    `&txtFECHAFIN=${encodeURIComponent(ddmmyyyy(toIso))}&CP=&LISTADO=SI`

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fromIso}..${toIso}`)
  const html = await res.text()
  return parseChunk(html)
}

async function upsertRows(rows) {
  if (!rows.length) return 0
  const { error } = await supabase
    .from('mag_inmag_history')
    .upsert(rows, { onConflict: 'date' })
  if (error) throw error
  return rows.length
}

async function main() {
  console.log(`INMAG backfill: ${FROM} → ${TODAY} ${DRY_RUN ? '(dry-run)' : ''}`)

  let cursor = FROM
  let totalRows = 0
  let chunks = 0

  while (cursor <= TODAY) {
    const chunkEnd = clampToToday(addMonths(cursor, 6))
    chunks++

    let rows
    try {
      rows = await fetchChunk(cursor, chunkEnd)
    } catch (err) {
      console.error(`  ✗ ${cursor}..${chunkEnd}: ${err.message}`)
      cursor = addMonths(cursor, 6)
      continue
    }

    if (DRY_RUN) {
      console.log(`[chunk ${chunks}] ${cursor}..${chunkEnd} → ${rows.length} rows`)
      console.log(rows.slice(0, 3))
      break
    }

    let inserted = 0
    try {
      inserted = await upsertRows(rows)
    } catch (err) {
      console.error(`  ✗ upsert ${cursor}..${chunkEnd}: ${err.message}`)
    }
    totalRows += inserted
    console.log(
      `[${chunks}] ${cursor}..${chunkEnd}: parsed ${rows.length}, upserted ${inserted}`,
    )

    cursor = addMonths(cursor, 6)
    if (cursor <= TODAY) await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }

  console.log(`\n✓ Done. ${chunks} chunks, ${totalRows} rows upserted.`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
