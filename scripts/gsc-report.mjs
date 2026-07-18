#!/usr/bin/env node
/**
 * Reporte semanal de SEO/tráfico: junta Google Search Console + GA4, escribe los
 * archivos en reports/gsc/ (para versionar/consultar local) y emailea el resumen.
 *
 *   node scripts/gsc-report.mjs            # genera + guarda + (si hay Resend) emailea
 *   node scripts/gsc-report.mjs --no-email # solo genera y guarda
 *
 * AUTH (en orden de preferencia, durable primero):
 *   GSC  → service account JWT si hay GSC_SA_KEY o GA4_SA_KEY (agregá ese email como
 *          usuario en GSC). Fallback: token OAuth en scripts/archive/oauth-token.json.
 *   GA4  → getGa4Weekly-style con GA4_SA_KEY + GA4_PROPERTY_ID (soft-fail si faltan).
 *   Mail → RESEND_API_KEY (soft-fail si falta).
 *
 * Env: GSC_SITE (default sc-domain:consignatarias.com.ar), GSC_REPORT_TO (destinatario).
 */
import { google } from 'googleapis'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT_DIR = join(ROOT, 'reports/gsc')
const SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'
const SITE_URL = 'https://www.consignatarias.com.ar'

// .env.local (sin dependencias) para correr local; en CI las vars vienen del entorno.
function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* en CI no existe */ }
}
loadEnvLocal()

const parseSA = (raw) => { try { return JSON.parse(raw) } catch { try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null } } }

// ── Auth GSC: service account (durable) o token OAuth (fallback) ──
async function gscClient() {
  const saRaw = process.env.GSC_SA_KEY || process.env.GA4_SA_KEY
  const sa = saRaw && parseSA(saRaw)
  if (sa?.client_email && sa?.private_key) {
    const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] })
    await jwt.authorize()
    return { sc: google.searchconsole({ version: 'v1', auth: jwt }), via: 'service-account (' + sa.client_email + ')' }
  }
  // fallback OAuth
  const credPath = join(HERE, 'archive/oauth-credentials.json')
  const tokPath = join(HERE, 'archive/oauth-token.json')
  if (existsSync(credPath) && existsSync(tokPath)) {
    const cred = JSON.parse(readFileSync(credPath, 'utf8')).installed
    const o = new google.auth.OAuth2(cred.client_id, cred.client_secret, 'http://localhost:3333')
    o.setCredentials(JSON.parse(readFileSync(tokPath, 'utf8')))
    return { sc: google.searchconsole({ version: 'v1', auth: o }), via: 'oauth-token (caduca ~7d si la app OAuth está en testing)' }
  }
  throw new Error('Sin auth de GSC (ni GSC_SA_KEY/GA4_SA_KEY ni oauth-token.json).')
}

const iso = (d) => d.toISOString().slice(0, 10)
function ranges() {
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3) // GSC tiene ~3d de lag
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6)
  const pend = new Date(start); pend.setUTCDate(pend.getUTCDate() - 1)
  const pstart = new Date(pend); pstart.setUTCDate(pstart.getUTCDate() - 6)
  return { start: iso(start), end: iso(end), pstart: iso(pstart), pend: iso(pend) }
}

async function gscAnalytics(sc, r) {
  const q = (body) => sc.searchanalytics.query({ siteUrl: SITE, requestBody: body }).then((x) => x.data.rows || [])
  const totalsBody = (s, e) => ({ startDate: s, endDate: e, dimensions: [], type: 'web' })
  const [curT, prevT, queries, pages] = await Promise.all([
    q(totalsBody(r.start, r.end)),
    q(totalsBody(r.pstart, r.pend)),
    q({ startDate: r.start, endDate: r.end, dimensions: ['query'], rowLimit: 25 }),
    q({ startDate: r.start, endDate: r.end, dimensions: ['page'], rowLimit: 25 }),
  ])
  const t = (rows) => rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  return { cur: t(curT), prev: t(prevT), queries, pages }
}

// ── GA4 (service account) ──
async function ga4Weekly() {
  const raw = process.env.GA4_SA_KEY, prop = process.env.GA4_PROPERTY_ID
  if (!raw || !prop) return null
  const sa = parseSA(raw); if (!sa?.client_email) return null
  const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
  const property = prop.startsWith('properties/') ? prop : `properties/${prop}`
  const run = async (body) => {
    const { token } = await jwt.getAccessToken()
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('GA4 ' + res.status)
    return res.json()
  }
  try {
    const [totals, top] = await Promise.all([
      run({ dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }, { startDate: '14daysAgo', endDate: '8daysAgo' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }], dimensions: [{ name: 'dateRange' }] }),
      run({ dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }], metrics: [{ name: 'screenPageViews' }], dimensions: [{ name: 'pagePath' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 }),
    ])
    const val = (rows, i) => rows?.find((x) => x.dimensionValues?.[0]?.value === `date_range_${i}`)?.metricValues?.map((m) => Number(m.value)) || [0, 0, 0]
    return {
      cur: val(totals.rows, 0), prev: val(totals.rows, 1),
      topPages: (top.rows || []).map((x) => ({ path: x.dimensionValues[0].value, views: Number(x.metricValues[0].value) })),
    }
  } catch (e) { return { error: e.message } }
}

const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : (a > 0 ? 100 : 0))
const arrow = (d) => (d > 0 ? `▲ +${d}%` : d < 0 ? `▼ ${d}%` : '=')
const nf = (n) => Number(n).toLocaleString('es-AR')

function buildMarkdown({ r, gsc, ga4, weekLabel }) {
  const L = []
  L.push(`# Reporte SEO/Tráfico — ${weekLabel}`)
  L.push(`\nGSC: ${r.start} → ${r.end} (vs ${r.pstart} → ${r.pend}). Generado ${iso(new Date())}.\n`)
  L.push(`## Search Console (Google)`)
  const c = gsc.cur, p = gsc.prev
  L.push(`| Métrica | Semana | vs anterior |`)
  L.push(`|---|--:|--:|`)
  L.push(`| Clicks | ${nf(c.clicks)} | ${arrow(pct(c.clicks, p.clicks))} |`)
  L.push(`| Impresiones | ${nf(c.impressions)} | ${arrow(pct(c.impressions, p.impressions))} |`)
  L.push(`| CTR | ${(c.ctr * 100).toFixed(2)}% | ${arrow(pct(c.ctr, p.ctr))} |`)
  L.push(`| Posición media | ${c.position.toFixed(1)} | ${p.position ? arrow(-pct(c.position, p.position)) : '—'} |`)
  L.push(`\n### Top queries`)
  L.push(`| Query | Clicks | Impr | CTR | Pos |`); L.push(`|---|--:|--:|--:|--:|`)
  gsc.queries.slice(0, 15).forEach((q) => L.push(`| ${q.keys[0]} | ${nf(q.clicks)} | ${nf(q.impressions)} | ${(q.ctr * 100).toFixed(1)}% | ${q.position.toFixed(1)} |`))
  L.push(`\n### Top páginas`)
  L.push(`| Página | Clicks | Impr | Pos |`); L.push(`|---|--:|--:|--:|`)
  gsc.pages.slice(0, 15).forEach((q) => L.push(`| ${q.keys[0].replace(SITE_URL, '')} | ${nf(q.clicks)} | ${nf(q.impressions)} | ${q.position.toFixed(1)} |`))
  if (ga4 && !ga4.error) {
    L.push(`\n## Analytics (GA4) · últimos 7 días`)
    L.push(`| Métrica | Semana | vs anterior |`); L.push(`|---|--:|--:|`)
    L.push(`| Sesiones | ${nf(ga4.cur[0])} | ${arrow(pct(ga4.cur[0], ga4.prev[0]))} |`)
    L.push(`| Usuarios | ${nf(ga4.cur[1])} | ${arrow(pct(ga4.cur[1], ga4.prev[1]))} |`)
    L.push(`| Pageviews | ${nf(ga4.cur[2])} | ${arrow(pct(ga4.cur[2], ga4.prev[2]))} |`)
    L.push(`\n### Top páginas (GA4)`)
    L.push(`| Página | Views |`); L.push(`|---|--:|`)
    ga4.topPages.slice(0, 12).forEach((x) => L.push(`| ${x.path} | ${nf(x.views)} |`))
  } else if (ga4?.error) {
    L.push(`\n## Analytics (GA4)\n_No disponible: ${ga4.error}._`)
  } else {
    L.push(`\n## Analytics (GA4)\n_No configurado localmente (GA4_SA_KEY/GA4_PROPERTY_ID). Corre en CI con los secrets._`)
  }
  return L.join('\n') + '\n'
}

async function sendEmail(md, subject) {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.log('  (sin RESEND_API_KEY → no se emailea)'); return }
  const to = (process.env.GSC_REPORT_TO || 'jose.barnetche19@gmail.com').split(',').map((s) => s.trim())
  const from = process.env.RESEND_FROM_EMAIL || 'Consignatarias <noreply@consignatarias.com>'
  const html = '<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap">' +
    md.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  console.log(res.ok ? '  ✓ email enviado a ' + to.join(', ') : '  ✗ email falló: ' + res.status)
}

async function main() {
  const noEmail = process.argv.includes('--no-email')
  const r = ranges()
  const now = new Date()
  const week = `${now.getUTCFullYear()}-W${String(Math.ceil(((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)).padStart(2, '0')}`

  const { sc, via } = await gscClient()
  console.log('GSC auth:', via)
  const gsc = await gscAnalytics(sc, r)
  const ga4 = await ga4Weekly()

  const md = buildMarkdown({ r, gsc, ga4, weekLabel: week })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `${week}.md`), md)
  writeFileSync(join(OUT_DIR, `${week}.json`), JSON.stringify({ range: r, gsc, ga4, generated: now.toISOString() }, null, 2))
  writeFileSync(join(OUT_DIR, 'latest.md'), md)
  console.log(`\n✓ reports/gsc/${week}.md (+ .json, + latest.md)`)
  console.log(`  clicks ${nf(gsc.cur.clicks)} · impresiones ${nf(gsc.cur.impressions)} · pos ${gsc.cur.position.toFixed(1)}`)

  if (!noEmail) await sendEmail(md, `SEO/Tráfico ${week} · consignatarias.com.ar`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
