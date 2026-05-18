#!/usr/bin/env node
/**
 * audit-content-quality.mjs — superpoderoso content audit.
 *
 * What it does:
 *   1. Pulls sitemap.xml from a running dev server.
 *   2. Categorizes each URL into a route template (consig detail, frig detail,
 *      remate detail, ciudad, mes, tipo, mercado, static, etc.).
 *   3. Crawls each URL concurrently (default 12), extracts <main>, strips
 *      <nav>/<footer>/<aside>/<script>/<style>, and tokenizes plain text.
 *   4. Detects template boilerplate by finding 3-gram shingles that occur
 *      in >40% of pages within the SAME route type — these are subtracted
 *      from each page's "unique content" word count.
 *   5. Computes per-route distribution stats and flags outlier pages
 *      (below p10 of their route, or below absolute threshold).
 *   6. Clusters near-duplicates via 5-shingle MinHash and reports clusters
 *      with cardinality ≥ 2 where pages have similarity ≥ 0.85.
 *   7. Writes:
 *        - scripts/.cache/content-audit-report.md  (executive)
 *        - scripts/.cache/content-audit-detail.json (every page, every metric)
 *
 * Usage:
 *   node scripts/audit-content-quality.mjs              # local dev (3000)
 *   BASE=http://localhost:3000 node scripts/audit-content-quality.mjs
 *   LIMIT=50 node scripts/audit-content-quality.mjs     # cap for quick run
 *   CONCURRENCY=20 node scripts/audit-content-quality.mjs
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const BASE = process.env.BASE || 'http://localhost:3000'
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '12', 10)
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
const REPORT_DIR = 'scripts/.cache'
const REPORT_MD = path.join(REPORT_DIR, 'content-audit-report.md')
const REPORT_JSON = path.join(REPORT_DIR, 'content-audit-detail.json')

// Thin-content thresholds (unique words after boilerplate subtraction)
const THIN_CRITICAL = 80    // < this = almost certainly won't be indexed
const THIN_WARNING = 200    // < this = at risk

// ---------------------------------------------------------------------------
// 1. Sitemap fetch + URL categorization
// ---------------------------------------------------------------------------

const ROUTE_PATTERNS = [
  { name: 'remate-detail',          re: /^\/remates\/[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/ },
  { name: 'remate-by-province-type', re: /^\/remates\/[a-z-]+\/(invernada|cria|general|especial|reproductores)$/ },
  { name: 'remate-by-province',      re: /^\/remates\/[a-z-]+$/ },
  { name: 'remate-tipo',             re: /^\/remates\/tipo\/[a-z-]+$/ },
  { name: 'remate-mes',              re: /^\/remates\/mes\/[a-z-]+$/ },
  { name: 'remate-ciudad',           re: /^\/remates\/ciudad\/[a-z0-9-]+$/ },
  { name: 'consig-by-province',      re: /^\/consignatarias\/(buenos-aires|chaco|cordoba|corrientes|entre-rios|formosa|la-pampa|misiones|neuquen|san-luis|santa-fe|santiago-del-estero|tucuman)$/ },
  { name: 'consig-detail',           re: /^\/consignatarias\/[a-z0-9-]+$/ },
  { name: 'frig-by-province',        re: /^\/frigorificos\/[a-z-]+$/ },
  { name: 'frig-detail',             re: /^\/frigorificos\/\d+$/ },
  { name: 'mercado-category',        re: /^\/mercado\/(terneros|novillos|novillitos|vaquillonas|vacas|toros)$/ },
  { name: 'mercado-other',           re: /^\/mercado\/[a-z-]+$/ },
  { name: 'static',                  re: /.*/ },
]

function categorize(pathname) {
  for (const p of ROUTE_PATTERNS) if (p.re.test(pathname)) return p.name
  return 'static'
}

async function fetchSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml`)
  const xml = await res.text()
  // Sitemap emits production URLs; rewrite to BASE so we crawl the server
  // we're inspecting (avoids silently hitting prod with stale data).
  const baseHost = new URL(BASE).origin
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    try { return baseHost + new URL(m[1]).pathname } catch { return m[1] }
  })
}

// ---------------------------------------------------------------------------
// 2. HTML extraction
// ---------------------------------------------------------------------------

function stripTagBlocks(html, ...tags) {
  let out = html
  for (const tag of tags) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')
    out = out.replace(re, ' ')
  }
  return out
}

function extractMain(html) {
  // Prefer <main>; fall back to <article>; fall back to <body>
  let m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
  if (!m) m = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
  if (!m) m = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  return m ? m[1] : html
}

function htmlToText(html) {
  const cleaned = stripTagBlocks(html, 'script', 'style', 'nav', 'footer', 'aside', 'header')
  const noTags = cleaned.replace(/<[^>]+>/g, ' ')
  return noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2)
}

function countStructured(html) {
  return {
    tables: (html.match(/<table\b/gi) || []).length,
    lists: (html.match(/<(ul|ol)\b/gi) || []).length,
    links: (html.match(/<a\b[^>]*href=/gi) || []).length,
    headings: (html.match(/<h[1-6]\b/gi) || []).length,
    images: (html.match(/<img\b/gi) || []).length,
    jsonLd: (html.match(/<script[^>]+type="application\/ld\+json"/gi) || []).length,
  }
}

function extractTitle(html) {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : ''
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')
  const m = html.match(re)
  return m ? m[1].trim() : ''
}

// ---------------------------------------------------------------------------
// 3. Shingles for duplicate detection
// ---------------------------------------------------------------------------

function shingles(tokens, k = 5) {
  const out = new Set()
  for (let i = 0; i <= tokens.length - k; i++) {
    out.add(tokens.slice(i, i + k).join(' '))
  }
  return out
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  const [small, big] = a.size < b.size ? [a, b] : [b, a]
  for (const s of small) if (big.has(s)) inter++
  return inter / (a.size + b.size - inter)
}

// 3-gram shingles for boilerplate detection (different from 5-gram for dupes)
function shingles3(tokens) {
  const out = []
  for (let i = 0; i <= tokens.length - 3; i++) out.push(tokens.slice(i, i + 3).join(' '))
  return out
}

// ---------------------------------------------------------------------------
// 4. Concurrent crawl
// ---------------------------------------------------------------------------

async function crawlOne(url) {
  const pathname = new URL(url).pathname
  try {
    const t0 = Date.now()
    const res = await fetch(url, { redirect: 'manual' })
    const ms = Date.now() - t0
    if (res.status >= 300 && res.status < 400) {
      return { url, pathname, status: res.status, location: res.headers.get('location'), error: 'redirect' }
    }
    if (!res.ok) {
      return { url, pathname, status: res.status, error: 'http-' + res.status }
    }
    const html = await res.text()
    const main = extractMain(html)
    const text = htmlToText(main)
    const tokens = tokenize(text)
    const structured = countStructured(main)
    const title = extractTitle(html)
    const description = extractMeta(html, 'description')
    const shingles5 = shingles(tokens, 5)
    return {
      url,
      pathname,
      status: res.status,
      ms,
      route: categorize(pathname),
      title,
      titleLen: title.length,
      description,
      descLen: description.length,
      wordCount: tokens.length,
      uniqueWords: new Set(tokens).size,
      ...structured,
      tokens,
      shingles5,
      shingles3List: shingles3(tokens),
    }
  } catch (e) {
    return { url, pathname, error: e.message }
  }
}

async function crawlAll(urls) {
  const results = new Array(urls.length)
  let nextIdx = 0
  const workers = []
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(
      (async () => {
        while (true) {
          const i = nextIdx++
          if (i >= urls.length) return
          results[i] = await crawlOne(urls[i])
          if ((i + 1) % 50 === 0 || i + 1 === urls.length) {
            process.stderr.write(`  crawled ${i + 1}/${urls.length}\n`)
          }
        }
      })(),
    )
  }
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// 5. Aggregation
// ---------------------------------------------------------------------------

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

function aggregate(pages) {
  const byRoute = new Map()
  for (const p of pages) {
    if (p.error || !p.route) continue
    if (!byRoute.has(p.route)) byRoute.set(p.route, [])
    byRoute.get(p.route).push(p)
  }

  // Compute per-route boilerplate: 3-grams that appear in >40% of pages
  const routeBoilerplate = new Map()
  for (const [route, list] of byRoute) {
    const docFreq = new Map()
    for (const p of list) {
      const seen = new Set(p.shingles3List)
      for (const s of seen) docFreq.set(s, (docFreq.get(s) || 0) + 1)
    }
    const threshold = Math.max(2, list.length * 0.4)
    const boiler = new Set()
    for (const [shingle, count] of docFreq) {
      if (count >= threshold) boiler.add(shingle)
    }
    routeBoilerplate.set(route, boiler)
  }

  // Recompute uniqueWords per page after subtracting boilerplate
  for (const p of pages) {
    if (p.error) continue
    const boiler = routeBoilerplate.get(p.route)
    if (!boiler || boiler.size === 0) {
      p.uniqueContentWords = p.wordCount
      continue
    }
    const tokensInBoilerplate = new Set()
    for (let i = 0; i < p.tokens.length - 2; i++) {
      const s = `${p.tokens[i]} ${p.tokens[i + 1]} ${p.tokens[i + 2]}`
      if (boiler.has(s)) {
        tokensInBoilerplate.add(i)
        tokensInBoilerplate.add(i + 1)
        tokensInBoilerplate.add(i + 2)
      }
    }
    p.uniqueContentWords = p.tokens.length - tokensInBoilerplate.size
    p.boilerplateRatio = p.tokens.length === 0 ? 0 : tokensInBoilerplate.size / p.tokens.length
  }

  // Per-route stats
  const routeStats = []
  for (const [route, list] of byRoute) {
    const ws = list.map(p => p.uniqueContentWords).sort((a, b) => a - b)
    const allWords = list.map(p => p.wordCount).sort((a, b) => a - b)
    routeStats.push({
      route,
      pages: list.length,
      meanUnique: Math.round(ws.reduce((a, b) => a + b, 0) / ws.length),
      medianUnique: percentile(ws, 50),
      p10Unique: percentile(ws, 10),
      p90Unique: percentile(ws, 90),
      meanTotal: Math.round(allWords.reduce((a, b) => a + b, 0) / allWords.length),
      critical: list.filter(p => p.uniqueContentWords < THIN_CRITICAL).length,
      warning: list.filter(p => p.uniqueContentWords >= THIN_CRITICAL && p.uniqueContentWords < THIN_WARNING).length,
    })
  }
  routeStats.sort((a, b) => (b.critical + b.warning) - (a.critical + a.warning))

  return { byRoute, routeBoilerplate, routeStats }
}

// ---------------------------------------------------------------------------
// 6. Duplicate clustering (within route, jaccard ≥ 0.85)
// ---------------------------------------------------------------------------

function clusterDuplicates(byRoute) {
  const clusters = []
  for (const [route, pages] of byRoute) {
    if (pages.length < 2) continue
    const seen = new Set()
    for (let i = 0; i < pages.length; i++) {
      if (seen.has(i)) continue
      const group = [i]
      for (let j = i + 1; j < pages.length; j++) {
        if (seen.has(j)) continue
        const sim = jaccard(pages[i].shingles5, pages[j].shingles5)
        if (sim >= 0.85) {
          group.push(j)
          seen.add(j)
        }
      }
      if (group.length >= 2) {
        seen.add(i)
        clusters.push({
          route,
          size: group.length,
          urls: group.map(k => pages[k].pathname),
          sampleWordCount: pages[group[0]].wordCount,
          sampleUniqueWords: pages[group[0]].uniqueContentWords,
        })
      }
    }
  }
  clusters.sort((a, b) => b.size - a.size)
  return clusters
}

// ---------------------------------------------------------------------------
// 7. Report
// ---------------------------------------------------------------------------

const RECOMMENDATIONS = {
  'remate-detail': 'Add: weather forecast for the auction date · breed mix table · last 3 INMAG closes for the relevant categories · same-consignataria last 5 auctions · nearby remates that week.',
  'remate-by-province': 'Add: province-level YTD volume vs prior year · top 3 consignatarias in the province by lot count · upcoming auctions table sorted by date.',
  'remate-by-province-type': 'Add: type-specific price history for that province (last 30 days) · upcoming + recent auctions of that type in that province.',
  'remate-tipo': 'Add: nationwide upcoming auctions of that type · last-30-day price band · type-specific glossary terms.',
  'remate-ciudad': 'Add: city map · last 5 auctions held there · nearest cities with auctions if local list is thin · MAG-feria reference if MAG-traded city.',
  'remate-mes': 'Add: month-vs-prior-year comparison · monthly auction calendar grid · cumulative head-count.',
  'consig-detail': 'Add: last 90 days auction count + total head · INMAG band the consignataria typically trades · YouTube channel embed (now that we have channel data) · upcoming + last 5 + historical breakdown by type.',
  'consig-by-province': 'Add: province ranking of consignatarias by auction volume · provincial INMAG vs national.',
  'frig-detail': 'Add: SENASA category meaning · last MAGYP report citing the frigorifico if any · capacity vs province average · destination markets (export categories).',
  'frig-by-province': 'Add: province frigorifico count vs national share · top-5 by capacity · SENASA category mix.',
  'mercado-category': 'Add: 30-day price chart · per-province price spread · seasonality vs 5-year average.',
  'mercado-other': 'Section-specific copy — see page.tsx.',
  'static': 'Likely fine; static pages tend to be hand-curated.',
}

function writeReport(crawled, stats, clusters) {
  const lines = []
  const ok = crawled.filter(p => !p.error)
  const errored = crawled.filter(p => p.error)
  const critical = ok.filter(p => p.uniqueContentWords < THIN_CRITICAL)
  const warning = ok.filter(p => p.uniqueContentWords >= THIN_CRITICAL && p.uniqueContentWords < THIN_WARNING)

  lines.push(`# Content quality audit — ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push(`**Crawl base:** \`${BASE}\``)
  lines.push(`**Pages crawled:** ${ok.length} (errors: ${errored.length})`)
  lines.push(`**Thin-content thresholds:** critical < ${THIN_CRITICAL} unique words · warning < ${THIN_WARNING}`)
  lines.push('')
  lines.push('## TL;DR')
  lines.push('')
  lines.push(`- **${critical.length} pages CRITICAL** (likely "Discovered/Crawled, not indexed" in GSC)`)
  lines.push(`- **${warning.length} pages WARNING** (at risk, low link-equity signal)`)
  lines.push(`- **${clusters.length} near-duplicate clusters** (≥ 0.85 jaccard within route)`)
  lines.push(`- **${ok.length - critical.length - warning.length} pages OK**`)
  lines.push('')

  lines.push('## Per-route distribution')
  lines.push('')
  lines.push('| Route | Pages | Median unique words | p10 | Critical | Warning |')
  lines.push('|---|---:|---:|---:|---:|---:|')
  for (const s of stats.routeStats) {
    lines.push(`| \`${s.route}\` | ${s.pages} | ${s.medianUnique} | ${s.p10Unique} | ${s.critical} | ${s.warning} |`)
  }
  lines.push('')

  lines.push('## Top route types with thin content (action plan)')
  lines.push('')
  for (const s of stats.routeStats) {
    if (s.critical === 0 && s.warning === 0) continue
    const rec = RECOMMENDATIONS[s.route] || ''
    lines.push(`### \`${s.route}\` — ${s.critical} critical · ${s.warning} warning`)
    lines.push('')
    lines.push(`**Recommendation:** ${rec}`)
    lines.push('')
    const worst = (stats.byRoute.get(s.route) || [])
      .filter(p => p.uniqueContentWords < THIN_WARNING)
      .sort((a, b) => a.uniqueContentWords - b.uniqueContentWords)
      .slice(0, 8)
    if (worst.length > 0) {
      lines.push('Worst offenders:')
      for (const p of worst) {
        lines.push(`- \`${p.pathname}\` — ${p.uniqueContentWords} unique words (total ${p.wordCount}, ${p.tables}T/${p.lists}L/${p.links}links/${p.headings}H)`)
      }
      lines.push('')
    }
  }

  if (clusters.length > 0) {
    lines.push('## Near-duplicate clusters')
    lines.push('')
    lines.push('Pages within a cluster share ≥ 85% of 5-token shingles. Google likely picks one and ignores the rest.')
    lines.push('')
    for (const c of clusters.slice(0, 20)) {
      lines.push(`### \`${c.route}\` — ${c.size} pages, ~${c.sampleUniqueWords} unique words each`)
      lines.push('')
      for (const u of c.urls.slice(0, 8)) lines.push(`- ${u}`)
      if (c.urls.length > 8) lines.push(`- … +${c.urls.length - 8} more`)
      lines.push('')
    }
  }

  if (errored.length > 0) {
    lines.push('## Crawl errors')
    lines.push('')
    for (const e of errored.slice(0, 20)) {
      lines.push(`- \`${e.pathname}\` — ${e.error}${e.location ? ' → ' + e.location : ''}`)
    }
    if (errored.length > 20) lines.push(`- … +${errored.length - 20} more`)
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Fetching sitemap from ${BASE}/sitemap.xml`)
  let urls = await fetchSitemap()
  console.log(`Got ${urls.length} URLs`)
  if (LIMIT < urls.length) {
    urls = urls.slice(0, LIMIT)
    console.log(`Capped to ${urls.length}`)
  }

  const t0 = Date.now()
  console.log(`Crawling with ${CONCURRENCY} concurrent workers…`)
  const crawled = await crawlAll(urls)
  console.log(`Crawled in ${Math.round((Date.now() - t0) / 1000)}s`)

  console.log('Aggregating and detecting boilerplate…')
  const stats = aggregate(crawled)

  console.log('Clustering near-duplicates…')
  const clusters = clusterDuplicates(stats.byRoute)

  console.log('Writing reports…')
  await fs.mkdir(REPORT_DIR, { recursive: true })

  // Drop heavy fields before JSON serialization
  const lite = crawled.map(p => {
    if (p.error) return p
    const { tokens, shingles5, shingles3List, ...rest } = p
    return rest
  })
  await fs.writeFile(REPORT_JSON, JSON.stringify(lite, null, 2))

  const md = writeReport(crawled, stats, clusters)
  await fs.writeFile(REPORT_MD, md)

  console.log(`\n✓ Report:  ${REPORT_MD}`)
  console.log(`✓ Detail:  ${REPORT_JSON}`)
  console.log('')

  // Echo TL;DR to stdout
  console.log(md.split('## Per-route distribution')[0])
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
