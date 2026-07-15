#!/usr/bin/env node
/**
 * Scrape de la pre-oferta de elrural.com → base + id-de-lote (+ valor actual)
 * por lote, para el 34° Remate Cabaña El Tigre (remate 603).
 *
 * Motivo: la cabaña/consignataria (Pulga) no nos pasa precios; elrural es la
 * fuente de verdad. La página del remate es pública y server-rendered.
 * Las bases NO son uniformes (6,5M / 7M / 7,5M según el lote).
 *
 * Uso: node scripts/scrape-preoferta-elrural.mjs
 * Escribe base/elrural_id en src/lib/data/preoferta-el-tigre.json (match por RP).
 * (Para el valor actual en vivo, cada /lote/<id> tiene su "Valor Actual" —
 *  extender a un cron si se quiere espejar el libro.)
 */
import { readFileSync, writeFileSync } from 'node:fs'

const REMATE_URL = 'https://preofertas.elrural.com/remate/603'
const DATA = 'src/lib/data/preoferta-el-tigre.json'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'

const decode = (s) =>
  s.replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
   .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
   .replace(/&amp;/g, '&').replace(/&#\d+;/g, '')

async function main() {
  const res = await fetch(REMATE_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`elrural HTTP ${res.status}`)
  const html = decode(await res.text())

  const cards = html.split(/(?=Lote\s+[\w-]+\s+RP:)/)
  const byRp = {}
  for (const c of cards) {
    const m = c.match(/Lote\s+([\w-]+)\s+RP:\s*(\d+)/)
    if (!m) continue
    const rp = m[2]
    const id = c.match(/\/lote\/(\d+)/)
    const price = c.match(/([0-9]{1,2}\.[0-9]{3}\.[0-9]{3})/)
    byRp[rp] = {
      elrural_id: id ? id[1] : null,
      base: price ? parseInt(price[1].replace(/\./g, ''), 10) : null,
    }
  }

  const data = JSON.parse(readFileSync(DATA, 'utf8'))
  let hit = 0
  for (const l of data.lotes) {
    const b = byRp[l.rp]
    if (b?.base) { l.base = b.base; l.elrural_id = b.elrural_id; hit++ }
  }
  data.fuente_precios = 'elrural.com/remate/603 (scrape)'
  writeFileSync(DATA, JSON.stringify(data, null, 1) + '\n')
  console.log(`Bases de elrural aplicadas a ${hit}/${data.lotes.length} lotes.`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
