#!/usr/bin/env node
/**
 * scrape-senasa-habilitados.mjs — pull the live SENASA registry of
 * habilitated establishments (Ciclo I/II/III) and persist a JSON snapshot.
 *
 * Source: https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp
 * Method: GET to grab JSF ViewState + JSESSIONID, then POST with "Exportar TODO"
 *   per "Tipo" dropdown value to retrieve the official XLS export.
 *
 * Output: src/lib/data/senasa-habilitados.json
 *   {
 *     "scrapedAt": "2026-05-18T...",
 *     "ciclos": ["CICLO I", "CICLO II", "CICLO III"],
 *     "byCuit": {
 *       "30707283250": { tipo, propietario, cuit, nombre, domicilio, provincia,
 *                         partido, localidad, nroOficial, actividades: [...] }
 *     }
 *   }
 *
 * Run: node scripts/scrape-senasa-habilitados.mjs
 *
 * The script is idempotent. Re-running overwrites the output. Diff via git
 * to see which establishments were added / removed / changed since the last
 * snapshot.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT = join(ROOT, 'src/lib/data/senasa-habilitados.json')

const PAGE_URL = 'https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

// Ciclo dropdown options observed in the JSF form (Form1:_idJsp9):
//   0       == Seleccione Tipo == (no filter — defaults to "all" but the page
//             paginates instead of exporting)
//   7073    CICLO I - MAT.FRIG.    (matarifes/frigorificos — cattle slaughter)
//   7373    CICLO II - ELABORADOR  (procesadores)
//   10003   CICLO III - DADOR DE FRIO (cold-storage only)
//   10001   ESTABLECIMIENTO AVICOLA
//   10000   ESTABLECIMIENTO PESQUERO
// We only care about Ciclo I/II/III — the meat chain.
const CICLOS = [
  { code: '7073',  label: 'CICLO I - MAT.FRIG.' },
  { code: '7373',  label: 'CICLO II - ELABORADOR' },
  { code: '10003', label: 'CICLO III - DADOR DE FRIO' },
]

/** Strip dashes/spaces from CUIT, return 11-digit string or null. */
function normalizeCuit(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length !== 11) return null
  return digits
}

/** Fetch a fresh ViewState + cookie. SENASA requires this on every POST. */
async function getViewState() {
  const r = await fetch(PAGE_URL, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`SENASA GET failed: HTTP ${r.status}`)
  const html = await r.text()
  const viewstate = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/)?.[1]
  if (!viewstate) throw new Error('Could not extract javax.faces.ViewState')
  const formAction = html.match(/<form[^>]+action="([^"]+)"/)?.[1]
  if (!formAction) throw new Error('Could not extract form action')
  const postUrl = new URL(formAction, PAGE_URL).href
  const setCookies = r.headers.getSetCookie?.() ?? []
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ')
  return { viewstate, postUrl, cookie }
}

/** POST "Exportar TODO" for one Tipo, return parsed rows. */
async function fetchCiclo(ciclo) {
  const { viewstate, postUrl, cookie } = await getViewState()
  const body = new URLSearchParams({
    Form1: 'Form1',
    'Form1:_idJsp7': '',
    'Form1:_idJsp9': ciclo.code,
    'Form1:_idJsp12': '',
    'Form1:actividades': '0',
    Form1_SUBMIT: '1',
    'Form1:_idcl': '',
    'Form1:_link_hidden_': '',
    'javax.faces.ViewState': viewstate,
    'Form1:_idJsp20': 'Exportar TODO',
  })
  const r = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
      Referer: PAGE_URL,
      Origin: 'https://aps2.senasa.gov.ar',
    },
    body,
    redirect: 'follow',
  })
  const ct = r.headers.get('content-type') ?? ''
  if (!r.ok) throw new Error(`SENASA POST ${ciclo.label} failed: HTTP ${r.status}`)
  if (!ct.includes('excel') && !ct.includes('ms-excel')) {
    throw new Error(`SENASA POST ${ciclo.label} returned ${ct} (expected Excel)`)
  }
  const buf = Buffer.from(await r.arrayBuffer())
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  // First row is header — drop it.
  return rows.slice(1).filter(r => Array.isArray(r) && r.length >= 9 && r[2])
}

function parseActividades(concat) {
  if (!concat || typeof concat !== 'string') return []
  return concat
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}

async function main() {
  const byCuit = {}
  let totalRows = 0
  let unparsableCuits = 0

  for (const ciclo of CICLOS) {
    process.stderr.write(`Fetching ${ciclo.label}…\n`)
    const rows = await fetchCiclo(ciclo)
    process.stderr.write(`  ${rows.length} rows\n`)
    totalRows += rows.length
    for (const r of rows) {
      const [tipo, propietario, cuitRaw, nombre, domicilio, provincia, partido, localidad, nroOficial, actividadesRaw] = r
      const cuit = normalizeCuit(cuitRaw)
      if (!cuit) {
        unparsableCuits++
        continue
      }
      // A single CUIT may appear under multiple ciclos. Keep the first ciclo
      // we see (insertion order: I before II before III), but record all the
      // ciclos in `ciclos` for full visibility.
      if (!byCuit[cuit]) {
        byCuit[cuit] = {
          cuit,
          tipo: String(tipo || '').trim(),
          propietario: String(propietario || '').trim(),
          nombre: String(nombre || '').trim(),
          domicilio: String(domicilio || '').trim(),
          provincia: String(provincia || '').trim(),
          partido: String(partido || '').trim(),
          localidad: String(localidad || '').trim(),
          nroOficial: String(nroOficial || '').trim(),
          actividades: parseActividades(actividadesRaw),
          ciclos: [String(tipo || '').trim()],
        }
      } else if (!byCuit[cuit].ciclos.includes(String(tipo).trim())) {
        byCuit[cuit].ciclos.push(String(tipo).trim())
      }
    }
  }

  const snapshot = {
    scrapedAt: new Date().toISOString(),
    source: 'https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp',
    ciclos: CICLOS.map(c => c.label),
    totalRowsScraped: totalRows,
    distinctCuits: Object.keys(byCuit).length,
    unparsableCuits,
    byCuit,
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n')
  process.stderr.write(
    `\n✓ Wrote ${snapshot.distinctCuits} habilitados to ${OUTPUT}\n` +
    `  Total rows: ${totalRows} · Ciclos covered: ${CICLOS.length} · Unparsable CUITs: ${unparsableCuits}\n`,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
