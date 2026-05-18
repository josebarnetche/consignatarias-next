#!/usr/bin/env node
/**
 * audit-link-graph.mjs — internal link graph audit.
 *
 * Crawls every sitemap URL, extracts internal `<a href>` targets, and builds
 * the directed graph of how pages link to each other. Surfaces:
 *
 *   - Orphan pages (zero inbound from any sitemap URL)
 *   - Weak nodes (< MIN_INBOUND inbound)
 *   - Broken internal links (href to path not in sitemap and 404)
 *   - Anchor-text repetition per target (>80% identical anchors signals weak SEO)
 *   - PageRank (power iteration, 25 rounds) to find equity sinks/peaks
 *   - Outbound spam (pages with > 200 outbound internal links)
 *
 * Reuses the harness style from audit-content-quality.mjs.
 *
 * Env / args:
 *   BASE=http://localhost:3000           # dev server (or prod for read-only)
 *   CONCURRENCY=16
 *   LIMIT=N                              # cap for quick runs
 *
 * Usage:
 *   node scripts/audit-link-graph.mjs
 *   BASE=https://www.consignatarias.com.ar node scripts/audit-link-graph.mjs
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.BASE || 'http://localhost:3000'
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '16', 10)
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
const REPORT_DIR = 'scripts/.cache'
const REPORT_MD = path.join(REPORT_DIR, 'link-graph-report.md')
const REPORT_JSON = path.join(REPORT_DIR, 'link-graph-report.json')

const MIN_INBOUND_WARN = 3       // pages with < this many inbound = weak
const OUTBOUND_SPAM = 200        // pages with > this many outbound = noisy
const ANCHOR_MONOCULTURE = 0.8   // > this fraction of identical anchors

// Commercial/conversion pages — orphan status on these is a P0 issue
const COMMERCIAL_PATHS = new Set([
  '/',
  '/enterprise',
  '/planes',
  '/precios',
  '/api-docs',
  '/calculadora',
])

const issues = []
function flag(severity, code, message, extra = {}) {
  issues.push({ severity, code, message, ...extra })
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function stripTagBlocks(html, ...tags) {
  let out = html
  for (const tag of tags) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')
    out = out.replace(re, ' ')
  }
  return out
}

function extractLinks(html) {
  // Get all <a> tags with href and inner text. We do strip nav/footer/aside
  // because those repeat on every page and would inflate inbound counts
  // misleadingly — we want CONTENT-area link signal.
  const cleaned = stripTagBlocks(html, 'script', 'style', 'nav', 'footer', 'aside', 'header')
  const out = []
  const re = /<a\b[^>]*href=["']([^"'#]+)(?:#[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(cleaned))) {
    const href = m[1].trim()
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    out.push({ href, text })
  }
  return out
}

function normalizeHref(href, baseUrl) {
  try {
    const u = new URL(href, baseUrl)
    if (u.host !== new URL(baseUrl).host) return null // external
    let p = u.pathname
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return p
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Crawl
// ---------------------------------------------------------------------------

async function fetchSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml`)
  const xml = await res.text()
  // Sitemap emits production URLs; rewrite host to BASE so we crawl the
  // same server we're inspecting (otherwise BASE=localhost would silently
  // hit production and show stale data).
  const baseHost = new URL(BASE).origin
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    try { return baseHost + new URL(m[1]).pathname } catch { return m[1] }
  })
}

async function crawlOne(url) {
  const pathname = new URL(url).pathname
  try {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status >= 300 && res.status < 400) {
      return { url, pathname, status: res.status, location: res.headers.get('location') }
    }
    if (!res.ok) {
      return { url, pathname, status: res.status, error: 'http-' + res.status, links: [] }
    }
    const html = await res.text()
    const links = extractLinks(html)
    const internal = []
    for (const l of links) {
      const norm = normalizeHref(l.href, BASE)
      if (norm) internal.push({ to: norm, text: l.text })
    }
    return { url, pathname, status: res.status, links: internal }
  } catch (e) {
    return { url, pathname, error: e.message, links: [] }
  }
}

async function crawlAll(urls) {
  const out = new Array(urls.length)
  let idx = 0
  const workers = []
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(
      (async () => {
        while (true) {
          const i = idx++
          if (i >= urls.length) return
          out[i] = await crawlOne(urls[i])
          if ((i + 1) % 100 === 0 || i + 1 === urls.length) {
            process.stderr.write(`  crawled ${i + 1}/${urls.length}\n`)
          }
        }
      })(),
    )
  }
  await Promise.all(workers)
  return out
}

// ---------------------------------------------------------------------------
// Graph analysis
// ---------------------------------------------------------------------------

function buildGraph(pages, sitemapSet) {
  const adjacency = new Map()        // from → Map<to, count>
  const inbound = new Map()          // to → Map<from, count>
  const anchorsByTarget = new Map()  // to → Map<text, count>

  for (const p of pages) {
    if (!p.links) continue
    const from = p.pathname
    if (!adjacency.has(from)) adjacency.set(from, new Map())
    const fromMap = adjacency.get(from)
    for (const l of p.links) {
      fromMap.set(l.to, (fromMap.get(l.to) || 0) + 1)
      if (!inbound.has(l.to)) inbound.set(l.to, new Map())
      inbound.get(l.to).set(from, (inbound.get(l.to).get(from) || 0) + 1)
      if (!anchorsByTarget.has(l.to)) anchorsByTarget.set(l.to, new Map())
      const am = anchorsByTarget.get(l.to)
      if (l.text) am.set(l.text, (am.get(l.text) || 0) + 1)
    }
  }
  return { adjacency, inbound, anchorsByTarget }
}

function pageRank(adjacency, allNodes, iters = 25, damping = 0.85) {
  const N = allNodes.length
  const idx = new Map(allNodes.map((n, i) => [n, i]))
  let rank = new Array(N).fill(1 / N)

  // Pre-build sparse rep: for each i, list of j it links to (each j only once)
  const out = allNodes.map(n => {
    const m = adjacency.get(n)
    if (!m) return []
    return [...m.keys()].filter(t => idx.has(t)).map(t => idx.get(t))
  })
  const outDegree = out.map(o => o.length)

  for (let k = 0; k < iters; k++) {
    const next = new Array(N).fill((1 - damping) / N)
    let dangling = 0
    for (let i = 0; i < N; i++) {
      if (outDegree[i] === 0) {
        dangling += rank[i]
        continue
      }
      const share = (damping * rank[i]) / outDegree[i]
      for (const j of out[i]) next[j] += share
    }
    // Distribute dangling mass evenly
    if (dangling > 0) {
      const add = (damping * dangling) / N
      for (let i = 0; i < N; i++) next[i] += add
    }
    rank = next
  }
  const out2 = new Map()
  for (let i = 0; i < N; i++) out2.set(allNodes[i], rank[i])
  return out2
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function buildReport({ pages, graph, sitemapSet, pageRankMap }) {
  const lines = []
  const ok = pages.filter(p => !p.error)
  const errored = pages.filter(p => p.error)

  // Compute inbound counts (links from OTHER pages)
  const inboundCount = new Map()
  for (const url of sitemapSet) inboundCount.set(url, 0)
  for (const [target, fromMap] of graph.inbound) {
    // Only count inbound from pages that are themselves in sitemap
    let c = 0
    for (const from of fromMap.keys()) if (sitemapSet.has(from)) c++
    inboundCount.set(target, c)
  }

  const orphans = [...sitemapSet].filter(u => (inboundCount.get(u) || 0) === 0 && u !== '/')
  const weak = [...sitemapSet].filter(u => {
    const c = inboundCount.get(u) || 0
    return c > 0 && c < MIN_INBOUND_WARN
  })

  // Broken: links to paths NOT in sitemap and not common allowed (api, etc)
  const allTargets = new Set()
  for (const [_, m] of graph.adjacency) for (const t of m.keys()) allTargets.add(t)
  const broken = []
  for (const t of allTargets) {
    if (sitemapSet.has(t)) continue
    if (t.startsWith('/api/')) continue
    if (t.startsWith('/_next/')) continue
    if (t.startsWith('/auth/')) continue
    if (t.startsWith('/admin/')) continue
    if (t === '/login' || t === '/logout' || t.startsWith('/cuenta') || t.startsWith('/mi-cuenta')) continue
    if (t.startsWith('/dashboard') || t.startsWith('/upgrade')) continue
    // Count how many pages link to this
    let n = 0
    for (const [from, m] of graph.adjacency) if (m.has(t)) n++
    broken.push({ to: t, fromCount: n })
  }
  broken.sort((a, b) => b.fromCount - a.fromCount)

  // Anchor monoculture: targets where >80% of inbound use same anchor text
  const monoculture = []
  for (const [target, anchors] of graph.anchorsByTarget) {
    if (!sitemapSet.has(target)) continue
    let total = 0
    let top = 0
    let topText = ''
    for (const [t, c] of anchors) {
      total += c
      if (c > top) { top = c; topText = t }
    }
    if (total >= 5 && top / total >= ANCHOR_MONOCULTURE) {
      monoculture.push({ target, total, dominant: topText, dominantPct: top / total })
    }
  }
  monoculture.sort((a, b) => b.total - a.total)

  // Outbound spam
  const spam = []
  for (const [from, m] of graph.adjacency) {
    const outDeg = [...m.keys()].filter(t => sitemapSet.has(t)).length
    if (outDeg > OUTBOUND_SPAM) spam.push({ from, outDeg })
  }
  spam.sort((a, b) => b.outDeg - a.outDeg)

  // PageRank top + bottom (within sitemap)
  const ranked = [...sitemapSet]
    .map(u => ({ url: u, rank: pageRankMap.get(u) || 0 }))
    .sort((a, b) => b.rank - a.rank)

  // ---- Issues ----
  const commercialOrphans = orphans.filter(o => COMMERCIAL_PATHS.has(o))
  if (commercialOrphans.length > 0) {
    flag('P0', 'commercial-orphan', `${commercialOrphans.length} conversion pages have NO inbound internal links`, { urls: commercialOrphans })
  }
  if (orphans.length > 0) {
    flag('P1', 'orphans', `${orphans.length} orphan pages (zero inbound from any sitemap URL)`, { sample: orphans.slice(0, 20) })
  }
  if (broken.filter(b => b.fromCount >= 5).length > 0) {
    flag('P1', 'broken-links', `${broken.filter(b => b.fromCount >= 5).length} broken internal links referenced by 5+ pages`, { sample: broken.slice(0, 15) })
  }
  if (spam.length > 0) {
    flag('P2', 'outbound-spam', `${spam.length} pages with > ${OUTBOUND_SPAM} internal outbound links`, { sample: spam.slice(0, 10) })
  }

  // ---- Markdown report ----
  lines.push(`# Internal link graph audit — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`)
  lines.push('')
  lines.push(`**Base:** \`${BASE}\` · **Pages crawled:** ${ok.length} (errors ${errored.length}) · **Sitemap URLs:** ${sitemapSet.size}`)
  lines.push('')
  lines.push('## TL;DR')
  lines.push('')
  lines.push(`- **${orphans.length} orphan pages** (zero inbound)`)
  lines.push(`- **${weak.length} weak pages** (< ${MIN_INBOUND_WARN} inbound)`)
  lines.push(`- **${broken.length} broken internal targets** (linked but not in sitemap)`)
  lines.push(`- **${monoculture.length} anchor-text monocultures** (>${ANCHOR_MONOCULTURE * 100}% of inbound use same text)`)
  lines.push(`- **${spam.length} outbound-spam pages** (> ${OUTBOUND_SPAM} internal links)`)
  lines.push('')

  if (issues.length > 0) {
    lines.push('## Alerts')
    lines.push('')
    const bySev = { P0: [], P1: [], P2: [] }
    for (const i of issues) bySev[i.severity].push(i)
    for (const sev of ['P0', 'P1', 'P2']) {
      if (bySev[sev].length === 0) continue
      lines.push(`### ${sev}`)
      for (const i of bySev[sev]) {
        lines.push(`- **${i.code}** — ${i.message}`)
        if (i.urls) for (const u of i.urls) lines.push(`  - \`${u}\``)
      }
      lines.push('')
    }
  }

  lines.push('## Orphans (top 30 by depth)')
  lines.push('')
  for (const o of orphans.slice(0, 30)) lines.push(`- \`${o}\``)
  if (orphans.length > 30) lines.push(`- … +${orphans.length - 30} more`)
  lines.push('')

  if (broken.length > 0) {
    lines.push('## Broken internal links')
    lines.push('')
    lines.push('| Target | Referenced by (n pages) |')
    lines.push('|---|---:|')
    for (const b of broken.slice(0, 25)) lines.push(`| \`${b.to}\` | ${b.fromCount} |`)
    if (broken.length > 25) lines.push(`| … +${broken.length - 25} more | |`)
    lines.push('')
  }

  if (monoculture.length > 0) {
    lines.push('## Anchor-text monoculture')
    lines.push('')
    lines.push('Targets where most inbound links use the same anchor — diversify for SEO.')
    lines.push('')
    lines.push('| Target | Inbound | Dominant anchor | % |')
    lines.push('|---|---:|---|---:|')
    for (const m of monoculture.slice(0, 15)) {
      lines.push(`| \`${m.target}\` | ${m.total} | "${m.dominant}" | ${(m.dominantPct * 100).toFixed(0)}% |`)
    }
    lines.push('')
  }

  lines.push('## Top 15 PageRank (most internal equity)')
  lines.push('')
  for (const r of ranked.slice(0, 15)) {
    const inb = inboundCount.get(r.url) || 0
    lines.push(`- \`${r.url}\` — rank ${r.rank.toFixed(5)} · ${inb} inbound`)
  }
  lines.push('')

  lines.push('## Bottom 10 PageRank among COMMERCIAL pages')
  lines.push('')
  const commercialRanked = ranked.filter(r => COMMERCIAL_PATHS.has(r.url)).slice().reverse()
  for (const r of commercialRanked.slice(0, 10)) {
    const inb = inboundCount.get(r.url) || 0
    lines.push(`- \`${r.url}\` — rank ${r.rank.toFixed(5)} · ${inb} inbound`)
  }
  lines.push('')

  return { md: lines.join('\n'), orphans, weak, broken, monoculture, spam, ranked }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.error(`Fetching sitemap from ${BASE}/sitemap.xml`)
  let urls = await fetchSitemap()
  console.error(`Got ${urls.length} URLs`)
  if (LIMIT < urls.length) {
    urls = urls.slice(0, LIMIT)
    console.error(`Capped to ${urls.length}`)
  }

  const sitemapSet = new Set(urls.map(u => new URL(u).pathname.replace(/\/$/, '') || '/'))

  console.error(`Crawling with ${CONCURRENCY} concurrent workers…`)
  const t0 = Date.now()
  const pages = await crawlAll(urls)
  console.error(`Crawled in ${Math.round((Date.now() - t0) / 1000)}s`)

  console.error('Building graph…')
  const graph = buildGraph(pages, sitemapSet)

  console.error('Computing PageRank (25 iterations)…')
  const allNodes = [...sitemapSet]
  const pageRankMap = pageRank(graph.adjacency, allNodes)

  console.error('Writing report…')
  const { md, orphans, broken, monoculture, ranked } = buildReport({
    pages,
    graph,
    sitemapSet,
    pageRankMap,
  })

  await fs.mkdir(REPORT_DIR, { recursive: true })
  await fs.writeFile(REPORT_MD, md)
  await fs.writeFile(
    REPORT_JSON,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      stats: {
        pagesCrawled: pages.length,
        sitemapUrls: sitemapSet.size,
        orphans: orphans.length,
        broken: broken.length,
        monoculture: monoculture.length,
      },
      orphans,
      broken: broken.slice(0, 100),
      monoculture: monoculture.slice(0, 50),
      topRank: ranked.slice(0, 30),
      issues,
    }, null, 2),
  )

  console.error(`\n✓ Report:  ${REPORT_MD}`)
  console.error(`✓ Detail:  ${REPORT_JSON}`)
  console.error('')
  console.error(md.split('## Alerts')[0])
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
