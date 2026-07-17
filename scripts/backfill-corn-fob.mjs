#!/usr/bin/env node
/**
 * Backfill histórico del maíz FOB (USD/tn) desde el web service de MAGyP, mensual,
 * 2015-01 → mes actual. Mismo parseo que scrape-auctions.mjs (posición HS 1005,
 * promedio de precios). Espacia las llamadas (rate-limit del server MAGyP) y por
 * cada mes prueba varios días hábiles hasta encontrar dato.
 *
 * Salida: src/lib/data/corn-fob-historico.json  → [{ mes:"YYYY-MM", usd_tn, n }]
 * Uso: node scripts/backfill-corn-fob.mjs [YYYY-MM inicio]
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const OUT = new URL('../src/lib/data/corn-fob-historico.json', import.meta.url)
const BASE = 'https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha='
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DELAY = 2500          // rate-limit MAGyP
const DIAS = [15, 14, 16, 13, 17, 12, 18, 11, 19, 10, 20, 9, 21, 8, 22] // días a probar por mes

async function cornDelDia(dd, mm, yyyy) {
  const url = BASE + `${dd}/${mm}/${yyyy}`
  const r = await fetch(url)
  const txt = await r.text()
  let d = null
  try { d = JSON.parse(txt) } catch { return { error: true } } // "Error" text = rate-limit / sin dato
  const posts = d?.posts || []
  const corn = posts
    .filter((p) => p.posicion && String(p.posicion).startsWith('1005'))
    .map((p) => parseFloat(p.precio))
    .filter((p) => p > 0)
  if (corn.length === 0) return { empty: true }
  const avg = Math.round((corn.reduce((a, b) => a + b, 0) / corn.length) * 100) / 100
  return { usd_tn: avg, n: corn.length }
}

async function cornDelMes(yyyy, mm) {
  for (const dd of DIAS) {
    let res = await cornDelDia(dd, mm, yyyy)
    // reintento una vez si fue rate-limit
    if (res.error) { await sleep(DELAY); res = await cornDelDia(dd, mm, yyyy) }
    await sleep(DELAY)
    if (res.usd_tn) return res
  }
  return null
}

async function main() {
  const now = new Date()
  const endY = now.getFullYear(), endM = now.getMonth() + 1
  const [startY, startM] = (process.argv[2] || '2015-01').split('-').map(Number)

  // resume: si ya hay archivo, no re-pedir meses existentes
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { serie: [] }
  const yaTengo = new Set((prev.serie || []).map((p) => p.mes))
  const serie = [...(prev.serie || [])]

  for (let y = startY; y <= endY; y++) {
    const m0 = y === startY ? startM : 1
    const m1 = y === endY ? endM : 12
    for (let m = m0; m <= m1; m++) {
      const mes = `${y}-${String(m).padStart(2, '0')}`
      if (yaTengo.has(mes)) continue
      const res = await cornDelMes(y, m)
      if (res) {
        serie.push({ mes, usd_tn: res.usd_tn, n: res.n })
        console.log(`${mes} → ${res.usd_tn} USD/tn (${res.n} pos)`)
      } else {
        console.log(`${mes} → SIN DATO`)
      }
      // persistir incrementalmente por si se corta
      serie.sort((a, b) => a.mes.localeCompare(b.mes))
      writeFileSync(OUT, JSON.stringify({
        fuente: 'MAGyP — Subsecretaría de Mercados Agropecuarios (precios FOB, posición HS 1005 maíz)',
        fuente_url: 'https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/',
        metrica: 'Precio FOB del maíz, USD por tonelada (promedio mensual de posiciones publicadas)',
        actualizado: new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10),
        serie,
      }, null, 2))
    }
  }
  console.log(`\nListo. ${serie.length} meses en corn-fob-historico.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })
