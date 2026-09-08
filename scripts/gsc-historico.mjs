#!/usr/bin/env node
/**
 * Serie histórica de Search Console, día por día, para todo el año.
 *
 * POR QUÉ EXISTE, SI YA ESTÁ `gsc-report.mjs`
 * El reporte semanal fotografía *una* semana y la nombra por su semana ISO. Eso alcanza
 * para leerlo el lunes, pero no para mirar una serie: cada corrida pisa el archivo de su
 * semana, y si se dispara un día distinto la ventana se corre y el archivo anterior queda
 * sobrescrito con otro rango (pasó el 5 y el 7-sep-2026: dos ventanas distintas, las dos
 * en `2026-W36.md`). Para tendencia y proyección hace falta la serie diaria cruda, que
 * GSC guarda 16 meses y devuelve en una sola llamada con `dimensions: ['date']`.
 *
 * Escribe dos CSV en reports/gsc/:
 *   historico-diario.csv      date,clicks,impressions,ctr,position
 *   historico-por-pagina.csv  date,page,clicks,impressions,ctr,position
 *
 * El segundo permite separar el cluster de arrendamiento del resto del sitio, que es la
 * descomposición que decide si una mejora del CTR global es del sitio o de una sección.
 *
 *   node scripts/gsc-historico.mjs                      # desde 2026-01-01 hasta hoy
 *   node scripts/gsc-historico.mjs --from 2025-06-01    # otro inicio
 *
 * AUTH: igual que gsc-report.mjs — service account (GSC_SA_KEY/GA4_SA_KEY) o token OAuth
 * (GSC_OAUTH_CREDENTIALS/GSC_OAUTH_TOKEN), por env o por archivo en scripts/archive/.
 */
import { google } from 'googleapis'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT_DIR = join(ROOT, 'reports/gsc')
const SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'
const ROW_LIMIT = 25000

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* sin .env.local: se usa el entorno tal cual (es el caso en CI) */
  }
}

function auth() {
  const saRaw = process.env.GSC_SA_KEY || process.env.GA4_SA_KEY
  if (saRaw) {
    const creds = JSON.parse(saRaw)
    return new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
  }
  const credPath = join(HERE, 'archive/oauth-credentials.json')
  const tokPath = join(HERE, 'archive/oauth-token.json')
  const credRaw =
    process.env.GSC_OAUTH_CREDENTIALS || (existsSync(credPath) && readFileSync(credPath, 'utf8'))
  const tokRaw =
    process.env.GSC_OAUTH_TOKEN || (existsSync(tokPath) && readFileSync(tokPath, 'utf8'))
  if (!credRaw || !tokRaw) return null
  const cred = JSON.parse(credRaw)
  const inst = cred.installed || cred.web || cred
  const o = new google.auth.OAuth2(inst.client_id, inst.client_secret, inst.redirect_uris?.[0])
  o.setCredentials(JSON.parse(tokRaw))
  return o
}

const csvEscape = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

/** Pagina sobre startRow: GSC corta en ROW_LIMIT filas por request. */
async function queryAll(sc, body) {
  const rows = []
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE,
      requestBody: { ...body, rowLimit: ROW_LIMIT, startRow },
    })
    const batch = res.data.rows || []
    rows.push(...batch)
    if (batch.length < ROW_LIMIT) break
  }
  return rows
}

async function main() {
  loadEnvLocal()
  const a = auth()
  if (!a) {
    console.error('ERROR: sin auth de GSC (ni service account ni token OAuth por env/archivo).')
    process.exit(1)
  }
  const argFrom = process.argv.indexOf('--from')
  const from = argFrom > -1 ? process.argv[argFrom + 1] : '2026-01-01'
  // GSC tiene ~3 días de lag; pedir hasta hoy no rompe, sólo devuelve menos días.
  const to = new Date().toISOString().slice(0, 10)

  const sc = google.searchconsole({ version: 'v1', auth: a })
  mkdirSync(OUT_DIR, { recursive: true })

  console.error(`Bajando ${SITE} · ${from} → ${to}`)

  const daily = await queryAll(sc, { startDate: from, endDate: to, dimensions: ['date'], type: 'web' })
  const dailyCsv = ['date,clicks,impressions,ctr,position']
  for (const r of daily.sort((x, y) => (x.keys[0] < y.keys[0] ? -1 : 1))) {
    dailyCsv.push([r.keys[0], r.clicks, r.impressions, (r.ctr * 100).toFixed(4), r.position.toFixed(2)].join(','))
  }
  writeFileSync(join(OUT_DIR, 'historico-diario.csv'), dailyCsv.join('\n') + '\n')
  console.error(`historico-diario.csv: ${daily.length} días`)

  const byPage = await queryAll(sc, {
    startDate: from,
    endDate: to,
    dimensions: ['date', 'page'],
    type: 'web',
  })
  const pageCsv = ['date,page,clicks,impressions,ctr,position']
  for (const r of byPage.sort((x, y) => (x.keys[0] < y.keys[0] ? -1 : 1))) {
    pageCsv.push(
      [r.keys[0], csvEscape(r.keys[1]), r.clicks, r.impressions, (r.ctr * 100).toFixed(4), r.position.toFixed(2)].join(','),
    )
  }
  writeFileSync(join(OUT_DIR, 'historico-por-pagina.csv'), pageCsv.join('\n') + '\n')
  console.error(`historico-por-pagina.csv: ${byPage.length} filas`)

  const tc = daily.reduce((s, r) => s + r.clicks, 0)
  const ti = daily.reduce((s, r) => s + r.impressions, 0)
  console.error(`TOTAL: ${tc} clics · ${ti} impresiones · CTR ${((tc / ti) * 100).toFixed(2)}%`)
}

main().catch((e) => {
  console.error('ERROR:', e?.message || e)
  process.exit(1)
})
