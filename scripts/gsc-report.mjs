#!/usr/bin/env node
/**
 * Reporte semanal de SEO/tráfico: Google Search Console + tráfico del sitio
 * (visitantes, motores de AI, perfiles más visitados). Escribe reports/gsc/ y
 * emailea un HTML branded.
 *
 *   node scripts/gsc-report.mjs            # genera + guarda + emailea
 *   node scripts/gsc-report.mjs --no-email # solo genera + guarda
 *
 * AUTH: GSC via service account (GSC_SA_KEY/GA4_SA_KEY) o token OAuth
 * (GSC_OAUTH_CREDENTIALS/GSC_OAUTH_TOKEN por env, o archivos en scripts/archive/).
 * Tráfico: endpoint interno /api/cron/weekly-analytics (Bearer CRON_SECRET).
 * Email: RESEND_API_KEY. Destinatario: GSC_REPORT_TO.
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
const C = { cielo: '#0ea5e9', cieloSoft: '#e0f2fe', carbon: '#0f172a', ink: '#1e293b', muted: '#64748b', line: '#e2e8f0', pos: '#059669', neg: '#dc2626', bg: '#f8fafc' }

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* CI */ }
}
loadEnvLocal()

const parseSA = (raw) => { try { return JSON.parse(raw) } catch { try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null } } }

async function gscClient() {
  const saRaw = process.env.GSC_SA_KEY || process.env.GA4_SA_KEY
  const sa = saRaw && parseSA(saRaw)
  if (sa?.client_email && sa?.private_key) {
    const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] })
    await jwt.authorize()
    return { sc: google.searchconsole({ version: 'v1', auth: jwt }), via: 'service-account' }
  }
  const credRaw = process.env.GSC_OAUTH_CREDENTIALS || (existsSync(join(HERE, 'archive/oauth-credentials.json')) && readFileSync(join(HERE, 'archive/oauth-credentials.json'), 'utf8'))
  const tokRaw = process.env.GSC_OAUTH_TOKEN || (existsSync(join(HERE, 'archive/oauth-token.json')) && readFileSync(join(HERE, 'archive/oauth-token.json'), 'utf8'))
  if (credRaw && tokRaw) {
    const cred = JSON.parse(credRaw).installed
    const o = new google.auth.OAuth2(cred.client_id, cred.client_secret, 'http://localhost:3333')
    o.setCredentials(JSON.parse(tokRaw))
    return { sc: google.searchconsole({ version: 'v1', auth: o }), via: 'oauth-token' }
  }
  throw new Error('Sin auth de GSC (ni service account ni token OAuth por env/archivo).')
}

const iso = (d) => d.toISOString().slice(0, 10)
function ranges() {
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3) // lag de GSC
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6)
  const pend = new Date(start); pend.setUTCDate(pend.getUTCDate() - 1)
  const pstart = new Date(pend); pstart.setUTCDate(pstart.getUTCDate() - 6)
  return { start: iso(start), end: iso(end), pstart: iso(pstart), pend: iso(pend) }
}

async function gscAnalytics(sc, r) {
  const q = (body) => sc.searchanalytics.query({ siteUrl: SITE, requestBody: body }).then((x) => x.data.rows || [])
  const tot = (s, e) => ({ startDate: s, endDate: e, dimensions: [], type: 'web' })
  const [curT, prevT, queries, pages] = await Promise.all([
    q(tot(r.start, r.end)), q(tot(r.pstart, r.pend)),
    q({ startDate: r.start, endDate: r.end, dimensions: ['query'], rowLimit: 15 }),
    q({ startDate: r.start, endDate: r.end, dimensions: ['page'], rowLimit: 12 }),
  ])
  const t = (rows) => rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  return { cur: t(curT), prev: t(prevT), queries, pages }
}

// Tráfico del sitio (endpoint interno). Soft-fail → null.
async function traffic() {
  const secret = process.env.CRON_SECRET
  if (!secret) return null
  try {
    const res = await fetch(`${SITE_URL}/api/cron/weekly-analytics`, { headers: { Authorization: `Bearer ${secret}` } })
    if (!res.ok) return { error: 'HTTP ' + res.status }
    return res.json()
  } catch (e) { return { error: e.message } }
}

const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : (a > 0 ? 100 : 0))
const nf = (n) => Number(n || 0).toLocaleString('es-AR')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── HTML email branded (light, email-safe: tablas + estilos inline) ──
function deltaBadge(d, invert = false) {
  if (d === 0) return `<span style="color:${C.muted}">=</span>`
  const good = invert ? d < 0 : d > 0
  const col = good ? C.pos : C.neg
  const ar = d > 0 ? '▲' : '▼'
  return `<span style="color:${col};font-weight:600">${ar} ${d > 0 ? '+' : ''}${d}%</span>`
}
function kpi(label, value, delta, invert) {
  return `<td style="padding:6px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px"><tr><td style="padding:14px 16px">
    <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${label}</div>
    <div style="font-size:26px;font-weight:700;color:${C.carbon};line-height:1.1;margin-top:4px">${value}</div>
    ${delta != null ? `<div style="font-size:12px;margin-top:2px">${deltaBadge(delta, invert)}</div>` : ''}
  </td></tr></table></td>`
}
function sectionTitle(t) { return `<tr><td style="padding:22px 8px 8px"><div style="font-size:15px;font-weight:700;color:${C.carbon}">${t}</div></td></tr>` }
function tableRows(rows) { return rows.map((r) => `<tr>${r.map((c, i) => `<td style="padding:7px 8px;border-top:1px solid ${C.line};font-size:13px;color:${C.ink};${i ? 'text-align:right;font-variant-numeric:tabular-nums' : ''}">${c}</td>`).join('')}</tr>`).join('') }

function buildHtml({ r, gsc, tr, week }) {
  const c = gsc.cur, p = gsc.prev
  const cards = [
    kpi('Clicks (Google)', nf(c.clicks), pct(c.clicks, p.clicks)),
    kpi('Impresiones', nf(c.impressions), pct(c.impressions, p.impressions)),
    kpi('Posición media', c.position.toFixed(1), p.position ? -pct(c.position, p.position) : null, true),
  ]
  const t2 = tr && !tr.error ? [
    kpi('Visitantes', nf(tr.traffic.cur.visitantes), pct(tr.traffic.cur.visitantes, tr.traffic.prev.visitantes)),
    kpi('Desde motores IA', nf(tr.traffic.cur.aiVisits), pct(tr.traffic.cur.aiVisits, tr.traffic.prev.aiVisits)),
    kpi('Vistas de perfiles', nf(tr.profileViewsTotal), null),
  ] : []

  let body = ''
  body += `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cards.join('')}</tr></table>`
  if (t2.length) body += `<table width="100%" cellpadding="0" cellspacing="0"><tr>${t2.join('')}</tr></table>`

  body += `<table width="100%" cellpadding="0" cellspacing="0">`
  body += sectionTitle('Búsqueda · top queries')
  body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px;overflow:hidden">
    <tr><td style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${C.muted}">Query</td><td style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;color:${C.muted}">Clicks</td><td style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;color:${C.muted}">Impr</td><td style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;color:${C.muted}">Pos</td></tr>
    ${tableRows(gsc.queries.slice(0, 12).map((q) => [esc(q.keys[0]), nf(q.clicks), nf(q.impressions), q.position.toFixed(1)]))}
  </table></td></tr>`

  body += sectionTitle('Búsqueda · top páginas')
  body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px;overflow:hidden">
    ${tableRows(gsc.pages.slice(0, 10).map((q) => [esc(q.keys[0].replace(SITE_URL, '') || '/'), nf(q.clicks), nf(q.impressions), q.position.toFixed(1)]))}
  </table></td></tr>`

  if (tr && !tr.error) {
    if (tr.aiEngines?.length) {
      body += sectionTitle('Tráfico desde motores de IA')
      body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px;overflow:hidden">
        ${tableRows(tr.aiEngines.map((a) => [`<span style="text-transform:capitalize">${esc(a.engine)}</span>`, nf(a.visits) + ' visitas']))}
      </table></td></tr>`
    }
    if (tr.topProfiles?.length) {
      body += sectionTitle('Perfiles de consignataria más visitados')
      body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px;overflow:hidden">
        ${tableRows(tr.topProfiles.map((x) => [`<a href="${SITE_URL}/consignatarias/${esc(x.slug)}" style="color:${C.cielo};text-decoration:none">${esc(x.slug)}</a>`, nf(x.views) + ' vistas']))}
      </table></td></tr>`
    }
  }
  body += `</table>`

  return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <tr><td style="background:${C.carbon};border-radius:12px 12px 0 0;padding:20px 24px">
        <div style="color:#fff;font-size:18px;font-weight:700">consignatarias<span style="color:${C.cielo}">.</span>com<span style="color:${C.cielo}">.</span>ar</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:2px">Reporte semanal · SEO y tráfico · ${week}</div>
      </td></tr>
      <tr><td style="padding:8px 8px 0">${body}</td></tr>
      <tr><td style="padding:18px 24px;color:${C.muted};font-size:11px;line-height:1.5">
        GSC: ${r.start} → ${r.end} (vs ${r.pstart} → ${r.pend}). Tráfico: últimos 7 días.
        Datos de Google Search Console + analytics propio. Generado automáticamente.
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

// Markdown para el archivo versionado (resumen).
function buildMd({ r, gsc, tr, week }) {
  const c = gsc.cur
  const L = [`# Reporte SEO/Tráfico — ${week}`, ``, `GSC: ${r.start} → ${r.end}. Generado ${iso(new Date())}.`, ``]
  L.push(`## Search Console`, `- Clicks: ${nf(c.clicks)} (${pct(c.clicks, gsc.prev.clicks)}%)`, `- Impresiones: ${nf(c.impressions)} (${pct(c.impressions, gsc.prev.impressions)}%)`, `- CTR: ${(c.ctr * 100).toFixed(2)}% · Posición: ${c.position.toFixed(1)}`, ``)
  L.push(`### Top queries`, ...gsc.queries.slice(0, 12).map((q) => `- ${q.keys[0]} — ${nf(q.clicks)} clicks, pos ${q.position.toFixed(1)}`), ``)
  L.push(`### Top páginas`, ...gsc.pages.slice(0, 10).map((q) => `- ${q.keys[0].replace(SITE_URL, '')} — ${nf(q.clicks)} clicks`), ``)
  if (tr && !tr.error) {
    L.push(`## Tráfico (últimos 7 días)`, `- Visitantes: ${nf(tr.traffic.cur.visitantes)} · Pageviews: ${nf(tr.traffic.cur.pageviews)} · Desde IA: ${nf(tr.traffic.cur.aiVisits)}`, ``)
    L.push(`### Motores de IA`, ...(tr.aiEngines || []).map((a) => `- ${a.engine}: ${nf(a.visits)}`), ``)
    L.push(`### Perfiles más visitados`, ...(tr.topProfiles || []).map((x) => `- ${x.slug} — ${nf(x.views)}`), ``)
  } else if (tr?.error) L.push(`## Tráfico\n_No disponible: ${tr.error}._`, '')
  return L.join('\n') + '\n'
}

async function sendEmail(html, subject) {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.log('  (sin RESEND_API_KEY → no se emailea)'); return }
  const to = (process.env.GSC_REPORT_TO || 'jose.barnetche19@gmail.com').split(',').map((s) => s.trim())
  const from = process.env.RESEND_FROM_EMAIL || 'Consignatarias <noreply@consignatarias.com>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  console.log(res.ok ? '  ✓ email enviado a ' + to.join(', ') : '  ✗ email falló: ' + res.status + ' ' + (await res.text()).slice(0, 100))
}

async function main() {
  const noEmail = process.argv.includes('--no-email')
  const r = ranges()
  const now = new Date()
  const week = `${now.getUTCFullYear()}-W${String(Math.ceil(((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)).padStart(2, '0')}`

  const { sc, via } = await gscClient()
  console.log('GSC auth:', via)
  const [gsc, tr] = await Promise.all([gscAnalytics(sc, r), traffic()])
  if (tr?.error) console.log('  tráfico: no disponible (' + tr.error + ')')

  const html = buildHtml({ r, gsc, tr, week })
  const md = buildMd({ r, gsc, tr, week })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `${week}.md`), md)
  writeFileSync(join(OUT_DIR, `${week}.json`), JSON.stringify({ range: r, gsc, traffic: tr, generated: now.toISOString() }, null, 2))
  writeFileSync(join(OUT_DIR, 'latest.md'), md)
  writeFileSync(join(OUT_DIR, 'latest.html'), html)
  console.log(`\n✓ reports/gsc/${week}.{md,json} + latest.{md,html}`)
  console.log(`  clicks ${nf(gsc.cur.clicks)} · impresiones ${nf(gsc.cur.impressions)} · pos ${gsc.cur.position.toFixed(1)}` + (tr && !tr.error ? ` · visitantes ${nf(tr.traffic.cur.visitantes)} · IA ${nf(tr.traffic.cur.aiVisits)}` : ''))

  if (!noEmail) await sendEmail(html, `SEO/Tráfico ${week} · consignatarias.com.ar`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
