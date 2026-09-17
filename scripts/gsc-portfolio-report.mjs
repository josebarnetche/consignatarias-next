#!/usr/bin/env node
/**
 * Reporte semanal del PORTFOLIO de Search Console: las 20 propiedades de la cuenta de Jose
 * (consignatarias, siagro, lossada, memola, proactive, ethics, los dominios agro, etc.),
 * en un solo mail y un solo archivo versionado. Hermano de gsc-report.mjs (que cubre
 * consignatarias en profundidad); este mira el conjunto.
 *
 *   node scripts/gsc-portfolio-report.mjs            # genera + guarda + emailea
 *   node scripts/gsc-portfolio-report.mjs --no-email # solo genera + guarda
 *
 * Por propiedad: clics/impresiones/CTR/posición de la semana vs la anterior, 28 días,
 * páginas con impresiones, top 3 queries, estado de indexación de la home (URL Inspection)
 * y sitemaps con error. Arriba, el total del portfolio y las alertas: caídas > 30 %,
 * homes no indexadas, sitemaps rotos, propiedades sin verificar.
 *
 * AUTH: el token OAuth de Jose (GSC_OAUTH_CREDENTIALS / GSC_OAUTH_TOKEN) — es la única
 * credencial que ve las 20 propiedades; las service accounts ven 3 (handoff 07-09-2026).
 * Email: RESEND_API_KEY. Destinatario: GSC_REPORT_TO.
 */
import { google } from 'googleapis'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT_DIR = join(ROOT, 'reports/gsc-portfolio')
const C = { cielo: '#0ea5e9', carbon: '#0f172a', ink: '#1e293b', muted: '#64748b', line: '#e2e8f0', pos: '#059669', neg: '#dc2626', warn: '#b45309', bg: '#f8fafc' }
const CAIDA_ALERTA = -30 // % de clics semana contra semana

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* CI */ }
}
loadEnvLocal()

async function gscClient() {
  const credRaw = process.env.GSC_OAUTH_CREDENTIALS || (existsSync(join(HERE, 'archive/oauth-credentials.json')) && readFileSync(join(HERE, 'archive/oauth-credentials.json'), 'utf8'))
  const tokRaw = process.env.GSC_OAUTH_TOKEN || (existsSync(join(HERE, 'archive/oauth-token.json')) && readFileSync(join(HERE, 'archive/oauth-token.json'), 'utf8'))
  if (!credRaw || !tokRaw) throw new Error('Sin GSC_OAUTH_CREDENTIALS/GSC_OAUTH_TOKEN: el portfolio necesita el OAuth de Jose (las service accounts ven 3 propiedades).')
  const cred = JSON.parse(credRaw).installed
  const o = new google.auth.OAuth2(cred.client_id, cred.client_secret, 'http://localhost:3333')
  o.setCredentials(JSON.parse(tokRaw))
  return google.searchconsole({ version: 'v1', auth: o })
}

const iso = (d) => d.toISOString().slice(0, 10)
function ranges() {
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3) // lag de GSC
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6)
  const pend = new Date(start); pend.setUTCDate(pend.getUTCDate() - 1)
  const pstart = new Date(pend); pstart.setUTCDate(pstart.getUTCDate() - 6)
  const m28 = new Date(end); m28.setUTCDate(m28.getUTCDate() - 27)
  return { start: iso(start), end: iso(end), pstart: iso(pstart), pend: iso(pend), m28: iso(m28) }
}

const label = (site) => site.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '')
const home = (site) => (site.startsWith('sc-domain:') ? `https://${site.slice(10)}/` : site)
const EMPTY = { clicks: 0, impressions: 0, ctr: 0, position: 0 }

async function porPropiedad(sc, site, r) {
  const q = (body) => sc.searchanalytics.query({ siteUrl: site, requestBody: { ...body, type: 'web' } }).then((x) => x.data.rows || []).catch(() => [])
  const tot = (s, e) => ({ startDate: s, endDate: e, dimensions: [] })
  const [curT, prevT, m28T, queries, pages] = await Promise.all([
    q(tot(r.start, r.end)), q(tot(r.pstart, r.pend)), q(tot(r.m28, r.end)),
    q({ startDate: r.start, endDate: r.end, dimensions: ['query'], rowLimit: 3 }),
    q({ startDate: r.m28, endDate: r.end, dimensions: ['page'], rowLimit: 5000 }),
  ])
  let inspect = null
  try {
    // La home cuenta la historia de indexación del dominio; en las propiedades de dominio, la
    // URL con o sin www puede ser una redirección: probamos las dos y nos quedamos con la mejor.
    const urls = site.startsWith('sc-domain:') ? [home(site), `https://www.${site.slice(10)}/`] : [home(site)]
    const res = await Promise.all(urls.map((u) => sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: u, siteUrl: site } }).then((x) => x.data.inspectionResult.indexStatusResult).catch(() => null)))
    inspect = res.filter(Boolean).sort((a, b) => (a.verdict === 'PASS' ? -1 : 1) - (b.verdict === 'PASS' ? -1 : 1))[0] || null
  } catch { /* sin permiso o cuota */ }
  let sitemaps = []
  try { sitemaps = (await sc.sitemaps.list({ siteUrl: site })).data.sitemap || [] } catch { /* */ }
  return {
    site, label: label(site),
    cur: curT[0] || EMPTY, prev: prevT[0] || EMPTY, m28: m28T[0] || EMPTY,
    queries, pagesConImpr: pages.length, pagesConClic: pages.filter((p) => p.clicks > 0).length,
    home: inspect ? { verdict: inspect.verdict, coverage: inspect.coverageState, lastCrawl: (inspect.lastCrawlTime || '').slice(0, 10) } : null,
    sitemaps: sitemaps.map((s) => ({ path: s.path, errors: Number(s.errors || 0), warnings: Number(s.warnings || 0), lastDownloaded: (s.lastDownloaded || '').slice(0, 10) })),
  }
}

const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : (a > 0 ? 100 : 0))
const nf = (n) => Number(n || 0).toLocaleString('es-AR')
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function alertas(props, sinVerificar) {
  const A = []
  for (const p of props) {
    const d = pct(p.cur.clicks, p.prev.clicks)
    if (p.prev.clicks >= 20 && d <= CAIDA_ALERTA) A.push({ nivel: 'neg', txt: `${p.label}: clics ${d}% (${nf(p.prev.clicks)} → ${nf(p.cur.clicks)})` })
    // "Page with redirect" y "Alternate page with proper canonical tag" son la home de una
    // propiedad espejo (www / .com) apuntando a la canónica: correcto, no alerta (regla anti-ruido).
    const espejo = /redirect|Alternate page/i.test(p.home?.coverage || '')
    if (p.home && p.home.verdict !== 'PASS' && !espejo) A.push({ nivel: 'neg', txt: `${p.label}: home "${p.home.coverage}"${p.home.lastCrawl ? ` (rastreada ${p.home.lastCrawl})` : ''}` })
    for (const s of p.sitemaps) if (s.errors > 0) A.push({ nivel: 'warn', txt: `${p.label}: sitemap con ${s.errors} error(es) — ${s.path}` })
    if (p.m28.impressions === 0) A.push({ nivel: 'warn', txt: `${p.label}: cero impresiones en 28 días` })
  }
  for (const s of sinVerificar) A.push({ nivel: 'warn', txt: `${label(s)}: propiedad sin verificar (no se puede leer)` })
  return A
}

function deltaBadge(d, invert = false) {
  if (d === 0) return `<span style="color:${C.muted}">=</span>`
  const good = invert ? d < 0 : d > 0
  return `<span style="color:${good ? C.pos : C.neg};font-weight:600">${d > 0 ? '▲' : '▼'} ${d > 0 ? '+' : ''}${d}%</span>`
}
const th = (t, right) => `<td style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${C.muted};${right ? 'text-align:right' : ''}">${t}</td>`
const td = (v, right) => `<td style="padding:7px 8px;border-top:1px solid ${C.line};font-size:13px;color:${C.ink};${right ? 'text-align:right;font-variant-numeric:tabular-nums' : ''}">${v}</td>`

function buildHtml({ r, props, total, prevTotal, alerts, week }) {
  const kpi = (l, v, d) => `<td style="padding:6px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px"><tr><td style="padding:14px 16px"><div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${l}</div><div style="font-size:26px;font-weight:700;color:${C.carbon};line-height:1.1;margin-top:4px">${v}</div>${d != null ? `<div style="font-size:12px;margin-top:2px">${deltaBadge(d)}</div>` : ''}</td></tr></table></td>`
  let body = `<table width="100%" cellpadding="0" cellspacing="0"><tr>${kpi('Clics · portfolio', nf(total.clicks), pct(total.clicks, prevTotal.clicks))}${kpi('Impresiones', nf(total.impressions), pct(total.impressions, prevTotal.impressions))}${kpi('Propiedades con clics', props.filter((p) => p.cur.clicks > 0).length + ' / ' + props.length, null)}</tr></table>`
  if (alerts.length) {
    body += `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 8px 4px"><div style="font-size:15px;font-weight:700;color:${C.carbon}">Alertas</div></td></tr>`
    body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px">${alerts.map((a) => `<tr><td style="padding:7px 10px;border-top:1px solid ${C.line};font-size:13px;color:${a.nivel === 'neg' ? C.neg : C.warn}">${esc(a.txt)}</td></tr>`).join('')}</table></td></tr></table>`
  }
  body += `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:18px 8px 4px"><div style="font-size:15px;font-weight:700;color:${C.carbon}">Por propiedad · semana ${r.start} → ${r.end}</div></td></tr>`
  body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px;overflow:hidden"><tr>${th('Propiedad')}${th('Clics', 1)}${th('vs sem.', 1)}${th('Impr', 1)}${th('Pos', 1)}${th('Home')}</tr>`
  for (const p of props) {
    const h = p.home ? (p.home.verdict === 'PASS' ? '<span style="color:#059669">indexada</span>' : /redirect|Alternate page/i.test(p.home.coverage) ? `<span style="color:${C.muted}">espejo → canónica</span>` : `<span style="color:${C.neg}">${esc(p.home.coverage)}</span>`) : '—'
    body += `<tr>${td(esc(p.label))}${td(nf(p.cur.clicks), 1)}${td(p.prev.clicks || p.cur.clicks ? deltaBadge(pct(p.cur.clicks, p.prev.clicks)) : '—', 1)}${td(nf(p.cur.impressions), 1)}${td(p.cur.position ? p.cur.position.toFixed(1) : '—', 1)}${td(h)}</tr>`
  }
  body += `</table></td></tr>`
  const conQueries = props.filter((p) => p.queries.length && p.cur.clicks > 0)
  if (conQueries.length) {
    body += `<tr><td style="padding:18px 8px 4px"><div style="font-size:15px;font-weight:700;color:${C.carbon}">Qué buscan, por propiedad</div></td></tr>`
    body += `<tr><td style="padding:0 8px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${C.line};border-radius:10px">`
    for (const p of conQueries) body += `<tr><td style="padding:7px 10px;border-top:1px solid ${C.line};font-size:12px;color:${C.ink}"><b>${esc(p.label)}</b> — ${p.queries.map((q) => `${esc(q.keys[0])} <span style="color:${C.muted}">(${nf(q.clicks)} clics · pos ${q.position.toFixed(1)})</span>`).join(' · ')}</td></tr>`
    body += `</table></td></tr>`
  }
  body += `</table>`
  return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px"><table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
    <tr><td style="background:${C.carbon};border-radius:12px 12px 0 0;padding:20px 24px"><div style="color:#fff;font-size:18px;font-weight:700">Memola Medios <span style="color:${C.cielo}">·</span> Search Console</div><div style="color:#94a3b8;font-size:13px;margin-top:2px">Portfolio semanal · ${props.length} propiedades · ${week}</div></td></tr>
    <tr><td style="padding:8px 8px 0">${body}</td></tr>
    <tr><td style="padding:18px 24px;color:${C.muted};font-size:11px;line-height:1.5">Semana ${r.start} → ${r.end} contra ${r.pstart} → ${r.pend}. Home = inspección de URL de la portada. Alerta de caída: clics ≤ ${CAIDA_ALERTA}% con base ≥ 20. Generado automáticamente desde el repo de consignatarias.</td></tr>
  </table></td></tr></table></body></html>`
}

function buildMd({ r, props, total, prevTotal, alerts, week }) {
  const L = [`# Portfolio Search Console — ${week}`, ``, `Semana ${r.start} → ${r.end} (vs ${r.pstart} → ${r.pend}). Generado ${iso(new Date())}.`, ``]
  L.push(`**Portfolio:** ${nf(total.clicks)} clics (${pct(total.clicks, prevTotal.clicks)}%) · ${nf(total.impressions)} impresiones (${pct(total.impressions, prevTotal.impressions)}%)`, ``)
  if (alerts.length) L.push(`## Alertas`, ...alerts.map((a) => `- ${a.nivel === 'neg' ? '🔴' : '🟠'} ${a.txt}`), ``)
  L.push(`## Por propiedad`, ``, `| Propiedad | Clics | vs sem. | Impr | CTR | Pos | Págs. impr. 28d | Home | Sitemaps |`, `|---|---:|---:|---:|---:|---:|---:|---|---|`)
  for (const p of props) L.push(`| ${p.label} | ${nf(p.cur.clicks)} | ${pct(p.cur.clicks, p.prev.clicks)}% | ${nf(p.cur.impressions)} | ${(p.cur.ctr * 100).toFixed(1)}% | ${p.cur.position ? p.cur.position.toFixed(1) : '—'} | ${nf(p.pagesConImpr)} | ${p.home ? p.home.coverage : '—'} | ${p.sitemaps.length ? p.sitemaps.map((s) => `${s.errors ? '⚠️ ' : ''}${s.path.replace(/^https?:\/\/[^/]+/, '')}`).join(', ') : '—'} |`)
  L.push(``, `## Top queries de la semana`, ``)
  for (const p of props) if (p.queries.length && p.cur.clicks > 0) L.push(`- **${p.label}**: ${p.queries.map((q) => `${q.keys[0]} (${nf(q.clicks)} clics, pos ${q.position.toFixed(1)})`).join(' · ')}`)
  return L.join('\n') + '\n'
}

async function sendEmail(html, subject) {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.log('  (sin RESEND_API_KEY → no se emailea)'); return }
  const to = (process.env.GSC_REPORT_TO || 'jose.barnetche19@gmail.com').split(',').map((s) => s.trim())
  const from = process.env.RESEND_FROM_EMAIL || 'Consignatarias <noreply@consignatarias.com>'
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, subject, html }) })
  console.log(res.ok ? '  ✓ email enviado a ' + to.join(', ') : '  ✗ email falló: ' + res.status + ' ' + (await res.text()).slice(0, 100))
}

async function main() {
  const noEmail = process.argv.includes('--no-email')
  const r = ranges()
  const now = new Date()
  const week = `${now.getUTCFullYear()}-W${String(Math.ceil(((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)).padStart(2, '0')}`
  const sc = await gscClient()
  const sites = (await sc.sites.list()).data.siteEntry || []
  const sinVerificar = sites.filter((s) => s.permissionLevel === 'siteUnverifiedUser').map((s) => s.siteUrl)
  const legibles = sites.filter((s) => s.permissionLevel !== 'siteUnverifiedUser').map((s) => s.siteUrl).sort()
  console.log(`GSC: ${sites.length} propiedades (${sinVerificar.length} sin verificar)`)
  const props = []
  for (const site of legibles) { process.stdout.write(`  ${label(site)} … `); props.push(await porPropiedad(sc, site, r)); console.log('ok') }
  props.sort((a, b) => b.cur.clicks - a.cur.clicks || b.cur.impressions - a.cur.impressions)
  const sum = (k, f) => props.reduce((s, p) => s + Number(p[k][f] || 0), 0)
  const total = { clicks: sum('cur', 'clicks'), impressions: sum('cur', 'impressions') }
  const prevTotal = { clicks: sum('prev', 'clicks'), impressions: sum('prev', 'impressions') }
  const alerts = alertas(props, sinVerificar)
  const args = { r, props, total, prevTotal, alerts, week }
  mkdirSync(OUT_DIR, { recursive: true })
  const md = buildMd(args), html = buildHtml(args)
  writeFileSync(join(OUT_DIR, `${week}.md`), md)
  writeFileSync(join(OUT_DIR, `${week}.json`), JSON.stringify({ range: r, total, prevTotal, alerts, props, sinVerificar, generated: now.toISOString() }, null, 2))
  writeFileSync(join(OUT_DIR, 'latest.md'), md)
  writeFileSync(join(OUT_DIR, 'latest.html'), html)
  console.log(`\n✓ reports/gsc-portfolio/${week}.{md,json} + latest.{md,html}`)
  console.log(`  portfolio: ${nf(total.clicks)} clics (${pct(total.clicks, prevTotal.clicks)}%) · ${nf(total.impressions)} impresiones · ${alerts.length} alerta(s)`)
  if (!noEmail) await sendEmail(html, `Search Console · portfolio ${week} · ${nf(total.clicks)} clics · ${alerts.length} alerta(s)`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
