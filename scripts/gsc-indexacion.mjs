#!/usr/bin/env node
/**
 * Estado de indexación real, URL por URL, con la URL Inspection API de Search Console.
 *
 * POR QUÉ EXISTE
 * El informe semanal dice cuántos clics hubo; el histórico dice qué páginas tuvieron
 * impresiones. Ninguno de los dos distingue las dos causas de que una página no traiga
 * nada, que piden arreglos opuestos:
 *   · NO está indexada        → problema técnico (canonical, rastreo, thin, huérfana)
 *   · está indexada sin queries → problema de contenido o de demanda
 * Sin esa distinción se optimiza a ciegas. Esta API es la única fuente que lo dice.
 *
 * CUOTA: 2.000 inspecciones por día y por propiedad, 600 por minuto. Por eso el script
 * es incremental: guarda lo que ya inspeccionó y, en la corrida siguiente, sigue por
 * donde quedó. `--refresh N` vuelve a mirar lo inspeccionado hace más de N días.
 *
 *   node scripts/gsc-indexacion.mjs --limit 1800
 *   node scripts/gsc-indexacion.mjs --only "/productividad/" --limit 500
 *   node scripts/gsc-indexacion.mjs --refresh 14        # revisita lo viejo
 *
 * Escribe reports/gsc/indexacion.csv (una fila por URL, se actualiza en el lugar) y
 * reports/gsc/indexacion-resumen.md (el cuadro por sección).
 */
import { google } from 'googleapis'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT_DIR = join(ROOT, 'reports/gsc')
const CSV = join(OUT_DIR, 'indexacion.csv')
const RESUMEN = join(OUT_DIR, 'indexacion-resumen.md')
const SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'
const SITEMAP = 'https://www.consignatarias.com.ar/sitemap.xml'
const CONCURRENCIA = 4

const arg = (n, def = null) => {
  const i = process.argv.indexOf(n)
  return i > -1 ? process.argv[i + 1] : def
}

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* en CI no hay .env.local y está bien */
  }
}

function auth() {
  const saRaw = process.env.GSC_SA_KEY || process.env.GA4_SA_KEY
  if (saRaw) {
    const c = JSON.parse(saRaw)
    return new google.auth.JWT({
      email: c.client_email,
      key: c.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
  }
  const credPath = join(HERE, 'archive/oauth-credentials.json')
  const tokPath = join(HERE, 'archive/oauth-token.json')
  const credRaw =
    process.env.GSC_OAUTH_CREDENTIALS || (existsSync(credPath) && readFileSync(credPath, 'utf8'))
  const tokRaw = process.env.GSC_OAUTH_TOKEN || (existsSync(tokPath) && readFileSync(tokPath, 'utf8'))
  if (!credRaw || !tokRaw) return null
  const cred = JSON.parse(credRaw)
  const inst = cred.installed || cred.web || cred
  const o = new google.auth.OAuth2(inst.client_id, inst.client_secret, inst.redirect_uris?.[0])
  o.setCredentials(JSON.parse(tokRaw))
  return o
}

const COLS = [
  'url',
  'verdict',
  'coverageState',
  'robotsTxtState',
  'indexingState',
  'pageFetchState',
  'lastCrawlTime',
  'googleCanonical',
  'userCanonical',
  'canonicalOk',
  'inspectedAt',
]
const esc = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function leerPrevio() {
  if (!existsSync(CSV)) return new Map()
  const lines = readFileSync(CSV, 'utf8').trim().split('\n')
  const head = lines.shift().split(',')
  const m = new Map()
  for (const l of lines) {
    // parser mínimo: los campos con coma van entre comillas
    const out = []
    let cur = '', q = false
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]
      if (q) {
        if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    const row = Object.fromEntries(head.map((h, i) => [h, out[i] ?? '']))
    if (row.url) m.set(row.url, row)
  }
  return m
}

async function sitemapUrls() {
  const res = await fetch(SITEMAP)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim())
}

async function inspeccionar(sc, url) {
  for (let intento = 0; intento < 4; intento++) {
    try {
      const r = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: SITE, languageCode: 'es-AR' },
      })
      const i = r.data.inspectionResult?.indexStatusResult || {}
      return {
        url,
        verdict: i.verdict || '',
        coverageState: i.coverageState || '',
        robotsTxtState: i.robotsTxtState || '',
        indexingState: i.indexingState || '',
        pageFetchState: i.pageFetchState || '',
        lastCrawlTime: i.lastCrawlTime || '',
        googleCanonical: i.googleCanonical || '',
        userCanonical: i.userCanonical || '',
        canonicalOk:
          i.googleCanonical && i.userCanonical
            ? String(i.googleCanonical === i.userCanonical)
            : '',
        inspectedAt: new Date().toISOString(),
      }
    } catch (e) {
      const code = e?.code || e?.response?.status
      if (code === 429) {
        // cuota por minuto: esperar y reintentar
        await new Promise((r) => setTimeout(r, 20000))
        continue
      }
      if (code === 403) throw e // cuota diaria agotada o sin permiso: cortar
      return { url, verdict: 'ERROR', coverageState: String(e?.message || e).slice(0, 120), inspectedAt: new Date().toISOString() }
    }
  }
  return { url, verdict: 'ERROR', coverageState: 'reintentos agotados', inspectedAt: new Date().toISOString() }
}

async function main() {
  loadEnvLocal()
  const a = auth()
  if (!a) { console.error('ERROR: sin auth de GSC.'); process.exit(1) }
  const sc = google.searchconsole({ version: 'v1', auth: a })
  mkdirSync(OUT_DIR, { recursive: true })

  const limit = parseInt(arg('--limit', '1800'), 10)
  const only = arg('--only')
  const refreshDias = arg('--refresh') ? parseInt(arg('--refresh'), 10) : null

  const previo = leerPrevio()
  let urls = await sitemapUrls()
  if (only) urls = urls.filter((u) => u.includes(only))

  const corte = refreshDias ? Date.now() - refreshDias * 864e5 : null
  const pendientes = urls.filter((u) => {
    const p = previo.get(u)
    if (!p) return true
    if (corte && new Date(p.inspectedAt).getTime() < corte) return true
    return false
  })

  console.error(`sitemap: ${urls.length} URLs · ya inspeccionadas: ${urls.length - pendientes.length} · a inspeccionar ahora: ${Math.min(pendientes.length, limit)}`)
  const lote = pendientes.slice(0, limit)

  let hechas = 0
  const cola = [...lote]
  async function worker() {
    while (cola.length) {
      const u = cola.shift()
      const row = await inspeccionar(sc, u)
      previo.set(u, row)
      if (++hechas % 100 === 0) console.error(`  ${hechas}/${lote.length}`)
    }
  }
  try {
    await Promise.all(Array.from({ length: CONCURRENCIA }, worker))
  } catch (e) {
    console.error('Corte por cuota o permiso:', e?.message || e)
  }

  const filas = [...previo.values()]
  writeFileSync(CSV, [COLS.join(','), ...filas.map((r) => COLS.map((c) => esc(r[c])).join(','))].join('\n') + '\n')

  // Resumen por sección: lo que se lee para decidir.
  const sec = (u) => {
    const p = u.replace('https://www.consignatarias.com.ar', '').replace(/^\//, '')
    return '/' + (p.split('/')[0] || '(home)')
  }
  const porSec = new Map()
  const porEstado = new Map()
  for (const r of filas) {
    const s = sec(r.url)
    const o = porSec.get(s) || { total: 0, ok: 0, no: 0 }
    o.total++
    if (r.verdict === 'PASS') o.ok++
    else o.no++
    porSec.set(s, o)
    porEstado.set(r.coverageState || '(vacío)', (porEstado.get(r.coverageState || '(vacío)') || 0) + 1)
  }
  const L = []
  L.push(`# Indexación — ${new Date().toISOString().slice(0, 10)}`, '')
  L.push(`Inspeccionadas ${filas.length} de ${urls.length} URLs del sitemap.`, '')
  L.push('| Sección | Inspeccionadas | Indexadas | NO indexadas | % |', '|---|---:|---:|---:|---:|')
  for (const [s, o] of [...porSec.entries()].sort((a, b) => b[1].no - a[1].no)) {
    L.push(`| ${s} | ${o.total} | ${o.ok} | ${o.no} | ${((100 * o.no) / o.total).toFixed(0)}% |`)
  }
  L.push('', '## Motivos (coverageState)', '', '| Motivo | URLs |', '|---|---:|')
  for (const [k, v] of [...porEstado.entries()].sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`)
  writeFileSync(RESUMEN, L.join('\n') + '\n')

  const noIdx = filas.filter((r) => r.verdict && r.verdict !== 'PASS').length
  console.error(`\nTotal acumulado: ${filas.length} · NO indexadas: ${noIdx}`)
  console.error(`→ ${CSV}\n→ ${RESUMEN}`)
}

main().catch((e) => { console.error('ERROR:', e?.message || e); process.exit(1) })
