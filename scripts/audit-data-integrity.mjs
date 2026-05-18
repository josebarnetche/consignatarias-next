#!/usr/bin/env node
/**
 * audit-data-integrity.mjs — scraper drift / data sanity checks.
 *
 * Runs against committed JSON data sources (no DB needed) so this is safe
 * to schedule as a GitHub Actions cron without any secrets. The script
 * exits non-zero if any P0 issue is found (so the workflow goes red).
 *
 * Checks (graded by severity):
 *   P0  Critical: silent data corruption that breaks routes or SEO.
 *   P1  Major:    visible quality issues, dead links, drift.
 *   P2  Minor:    cleanup nice-to-have.
 *
 * Usage:
 *   node scripts/audit-data-integrity.mjs           # full report
 *   node scripts/audit-data-integrity.mjs --strict  # exit-1 on any P0 or P1
 *   node scripts/audit-data-integrity.mjs --json    # JSON to stdout
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const REPORT_DIR = 'scripts/.cache'
const REPORT_MD = path.join(REPORT_DIR, 'data-integrity-report.md')
const REPORT_JSON = path.join(REPORT_DIR, 'data-integrity-report.json')

const STRICT = process.argv.includes('--strict')
const JSON_OUT = process.argv.includes('--json')

const TYPE_WHITELIST = new Set(['invernada', 'cria', 'general', 'especial', 'reproductores'])
const PROVINCE_WHITELIST = new Set([
  'BUENOS AIRES', 'CHACO', 'CORDOBA', 'CORRIENTES', 'ENTRE RIOS',
  'FORMOSA', 'LA PAMPA', 'MISIONES', 'NEUQUEN', 'SALTA', 'SAN JUAN',
  'SAN LUIS', 'SANTA FE', 'SANTIAGO DEL ESTERO', 'TUCUMAN',
  'CATAMARCA', 'JUJUY', 'MENDOZA', 'RIO NEGRO', 'CHUBUT',
  'SANTA CRUZ', 'TIERRA DEL FUEGO', 'LA RIOJA',
])

const issues = [] // { severity, code, message, urls?: [], context?: any }

function flag(severity, code, message, extra = {}) {
  issues.push({ severity, code, message, ...extra })
}

// ---------------------------------------------------------------------------
// Load sources
// ---------------------------------------------------------------------------

async function loadJson(rel) {
  const txt = await fs.readFile(path.join(REPO_ROOT, rel), 'utf8')
  return JSON.parse(txt)
}

async function loadCanonicalMap() {
  // We avoid importing the TS file directly to keep this a plain Node script.
  // Parse the PROFILES array from consignataria-slugs.ts via regex; the file
  // shape is stable. Returns Map<rawSlug, canonical>.
  const src = await fs.readFile(
    path.join(REPO_ROOT, 'src/lib/data/consignataria-slugs.ts'),
    'utf8',
  )
  // displayName may use single OR double quotes (the O'Farrell entry uses "")
  const profileRe = /\{\s*canonicalSlug:\s*'([^']+)',\s*displayName:\s*(?:'([^']+)'|"([^"]+)"),\s*allSlugs:\s*\[([^\]]+)\]\s*\}/g
  const map = new Map()
  const canonicals = new Set()
  let m
  while ((m = profileRe.exec(src))) {
    const canonical = m[1]
    canonicals.add(canonical)
    map.set(canonical, canonical)
    const slugs = m[4].match(/'([^']+)'/g) || []
    for (const raw of slugs) map.set(raw.slice(1, -1), canonical)
  }
  return { slugToCanonical: map, canonicals }
}

// ---------------------------------------------------------------------------
// CHECK 1 · remates.json sanity
// ---------------------------------------------------------------------------

async function checkRemates(slugToCanonical) {
  const remates = await loadJson('src/lib/data/remates.json')
  console.error(`  remates.json: ${remates.length} rows`)

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const today = new Date().toISOString().slice(0, 10)

  // P0: malformed required fields
  for (const r of remates) {
    const ctx = { date: r.date, consig: r.consignatariaSlug, type: r.type, province: r.province }
    if (!r.date || !dateRe.test(r.date)) flag('P0', 'malformed-date', 'remate without valid YYYY-MM-DD date', { context: ctx })
    if (!r.consignatariaSlug) flag('P0', 'missing-consig', 'remate without consignatariaSlug', { context: ctx })
    if (r.type && !TYPE_WHITELIST.has(r.type)) flag('P0', 'unknown-type', `remate type "${r.type}" not in whitelist`, { context: ctx })
    if (r.province && !PROVINCE_WHITELIST.has(r.province)) flag('P0', 'unknown-province', `remate province "${r.province}" not whitelisted`, { context: ctx })
  }

  // P0: duplicate auctions (same canonical + type + province + date)
  const dupeMap = new Map()
  for (const r of remates) {
    if (!r.consignatariaSlug || !r.date) continue
    const canonical = slugToCanonical.get(r.consignatariaSlug) ?? r.consignatariaSlug
    const key = `${canonical}|${r.type || 'general'}|${r.province || ''}|${r.date}`
    if (!dupeMap.has(key)) dupeMap.set(key, [])
    dupeMap.get(key).push(r.consignatariaSlug)
  }
  let dupCount = 0
  const dupSamples = []
  for (const [key, slugs] of dupeMap) {
    if (new Set(slugs).size > 1 || slugs.length > 1) {
      dupCount++
      if (dupSamples.length < 6) dupSamples.push({ key, slugs })
    }
  }
  if (dupCount > 0) {
    flag('P0', 'canonical-duplicates', `${dupCount} auctions duplicated across slug variants (same canonical+type+province+date)`, { samples: dupSamples })
  }

  // P2: remates older than 18 months are heavy file weight with little SEO value
  // (the scraper keeps recent past intentionally to populate /remates/anteriores)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 18)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const ancient = remates.filter(r => r.date && r.date < cutoffStr)
  if (ancient.length > 0) {
    flag('P2', 'ancient-remates', `${ancient.length} remates older than 18 months still in current file (consider archiving)`, { sample: ancient.slice(0, 5).map(r => r.consignatariaSlug + ' ' + r.date) })
  }

  // P1: consignataria slugs not resolvable to canonical (would 404 on detail page)
  const unresolvable = new Set()
  for (const r of remates) {
    if (!r.consignatariaSlug) continue
    if (!slugToCanonical.has(r.consignatariaSlug)) unresolvable.add(r.consignatariaSlug)
  }
  if (unresolvable.size > 0) {
    flag('P1', 'unresolvable-slugs', `${unresolvable.size} remate consignataria slugs don't resolve to any canonical (will 404 on profile redirect)`, { slugs: [...unresolvable] })
  }

  return { remates, slugsInUse: new Set(remates.map(r => slugToCanonical.get(r.consignatariaSlug) ?? r.consignatariaSlug)) }
}

// ---------------------------------------------------------------------------
// CHECK 2 · zombie consignatarias (canonicals with no remates in 60d)
// ---------------------------------------------------------------------------

async function checkZombies(canonicals, slugToCanonical) {
  // Use git log on remates.json to find the most recent commit that mentions
  // each canonical slug. Anything not seen in 60 days = zombie.
  const { execSync } = await import('node:child_process')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 60)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Quick path: check the current file. Anything not present TODAY is at
  // least suspect. Then for each suspect, walk git history to find last
  // appearance. Avoids walking all history for healthy canonicals.
  const current = await loadJson('src/lib/data/remates.json')
  const inToday = new Set(
    current
      .filter(r => r.consignatariaSlug)
      .map(r => slugToCanonical.get(r.consignatariaSlug) ?? r.consignatariaSlug),
  )
  const suspects = [...canonicals].filter(c => !inToday.has(c))
  console.error(`  zombie suspects (no remates today): ${suspects.length}`)

  const zombies = []
  for (const canonical of suspects) {
    // Find the most recent commit of remates.json that mentions any slug
    // mapping to this canonical. Build a grep alternation pattern.
    const allSlugs = []
    for (const [raw, c] of slugToCanonical) if (c === canonical) allSlugs.push(raw)
    if (allSlugs.length === 0) continue
    const pattern = allSlugs.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    let lastDate = null
    try {
      const out = execSync(
        `git log -1 --since="${cutoffStr}" --format=%cs --pickaxe-regex -S"${pattern}" -- src/lib/data/remates.json`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      ).trim()
      if (out) lastDate = out
    } catch {
      // ignore
    }
    if (!lastDate) zombies.push(canonical)
  }
  if (zombies.length > 0) {
    flag('P2', 'zombie-consignatarias', `${zombies.length} canonical consignatarias with no remates in the last 60 days`, { slugs: zombies.slice(0, 30) })
  }
}

// ---------------------------------------------------------------------------
// CHECK 3 · frigorificos.json sanity
// ---------------------------------------------------------------------------

async function checkFrigorificos() {
  const frigs = await loadJson('src/lib/data/frigorificos.json')
  console.error(`  frigorificos.json: ${frigs.length} rows`)
  const cuits = new Set()
  for (const f of frigs) {
    if (!f.cuit) {
      flag('P0', 'frig-missing-cuit', 'frigorifico without cuit', { context: f })
      continue
    }
    if (cuits.has(f.cuit)) flag('P1', 'frig-duplicate-cuit', `duplicate cuit ${f.cuit}`)
    cuits.add(f.cuit)
    if (!f.provincia && !f.province) flag('P2', 'frig-missing-province', `frigorifico ${f.cuit} missing province`)
  }
}

// ---------------------------------------------------------------------------
// CHECK 4 · youtube-channels.json keys must be canonical slugs
// ---------------------------------------------------------------------------

async function checkYoutubeChannels(canonicals, slugToCanonical) {
  const channels = await loadJson('src/lib/data/youtube-channels.json')
  for (const [key, info] of Object.entries(channels)) {
    if (key === 'canal-rural' && info.isAggregator) continue
    if (!canonicals.has(key) && !slugToCanonical.has(key)) {
      flag('P1', 'youtube-orphan-key', `youtube-channels.json key "${key}" doesn't map to any canonical — channel won't be used by resolver`)
    }
    if (!info.channelId) flag('P1', 'youtube-missing-channelId', `youtube channel "${key}" missing channelId`)
    if (!info.channelUrl) flag('P1', 'youtube-missing-channelUrl', `youtube channel "${key}" missing channelUrl`)
  }
}

// ---------------------------------------------------------------------------
// CHECK 5 · market-prices.json freshness
// ---------------------------------------------------------------------------

async function checkMarketPrices() {
  try {
    const mp = await loadJson('src/lib/data/market-prices.json')
    // Freshness is carried on the nested sections; pick the most recent of
    // detailedCategories.date / provinceEntry.date / auctionDayEntries.date.
    const candidates = [
      mp?.detailedCategories?.date,
      mp?.provinceEntry?.date,
      mp?.auctionDayEntries?.date,
    ].filter(Boolean)
    if (candidates.length === 0) {
      flag('P1', 'market-prices-no-timestamp', 'market-prices.json has no date field on any subsection')
      return
    }
    const newest = candidates.sort().at(-1)
    const ageDays = (Date.now() - new Date(newest + 'T00:00:00Z').getTime()) / 86400000
    if (ageDays > 7) {
      flag('P0', 'market-prices-stale', `market-prices.json hasn't updated in ${ageDays.toFixed(1)} days (newest=${newest})`)
    } else if (ageDays > 3) {
      flag('P1', 'market-prices-aging', `market-prices.json is ${ageDays.toFixed(1)} days old (newest=${newest})`)
    }
  } catch (e) {
    flag('P2', 'market-prices-load-fail', `couldn't load market-prices.json: ${e.message}`)
  }
}

// ---------------------------------------------------------------------------
// CHECK 6 · sitemap.ts integrity (provinces referenced exist in remates)
// ---------------------------------------------------------------------------

async function checkSitemapCoherence(remates) {
  const provincesWithAuctions = new Set(remates.map(r => r.province).filter(Boolean))
  const expected = ['BUENOS AIRES', 'CHACO', 'CORDOBA', 'CORRIENTES', 'ENTRE RIOS',
    'FORMOSA', 'LA PAMPA', 'MISIONES', 'NEUQUEN', 'SAN LUIS', 'SANTA FE',
    'SANTIAGO DEL ESTERO', 'TUCUMAN']
  for (const p of expected) {
    if (!provincesWithAuctions.has(p)) {
      flag('P2', 'sitemap-empty-province', `sitemap emits /remates/${p.toLowerCase().replace(/\s+/g, '-')} but no remates have province="${p}" today`)
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function buildReport() {
  const bySev = { P0: [], P1: [], P2: [] }
  for (const i of issues) bySev[i.severity].push(i)

  const lines = []
  lines.push(`# Data integrity audit — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`)
  lines.push('')
  lines.push(`**P0 critical:** ${bySev.P0.length} · **P1 major:** ${bySev.P1.length} · **P2 minor:** ${bySev.P2.length}`)
  lines.push('')

  for (const sev of ['P0', 'P1', 'P2']) {
    if (bySev[sev].length === 0) continue
    lines.push(`## ${sev}`)
    lines.push('')
    for (const i of bySev[sev]) {
      lines.push(`### \`${i.code}\` — ${i.message}`)
      if (i.samples) {
        for (const s of i.samples) lines.push(`- \`${s.key}\` → slugs: ${s.slugs.join(', ')}`)
      }
      if (i.slugs) {
        for (const s of i.slugs.slice(0, 12)) lines.push(`- \`${s}\``)
        if (i.slugs.length > 12) lines.push(`- … +${i.slugs.length - 12} more`)
      }
      if (i.sample) {
        for (const s of i.sample) lines.push(`- ${s}`)
      }
      if (i.context) lines.push('  ```\n  ' + JSON.stringify(i.context) + '\n  ```')
      lines.push('')
    }
  }

  if (issues.length === 0) {
    lines.push('## ✓ All clear')
    lines.push('')
    lines.push('No data integrity issues detected.')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.error('Loading sources…')
  const { slugToCanonical, canonicals } = await loadCanonicalMap()
  console.error(`  canonical map: ${canonicals.size} canonicals, ${slugToCanonical.size} slug entries`)

  console.error('Checking remates.json…')
  const { remates } = await checkRemates(slugToCanonical)

  console.error('Checking zombie consignatarias…')
  await checkZombies(canonicals, slugToCanonical)

  console.error('Checking frigorificos.json…')
  await checkFrigorificos()

  console.error('Checking youtube-channels.json…')
  await checkYoutubeChannels(canonicals, slugToCanonical)

  console.error('Checking market-prices.json freshness…')
  await checkMarketPrices()

  console.error('Checking sitemap coherence…')
  await checkSitemapCoherence(remates)

  await fs.mkdir(REPORT_DIR, { recursive: true })
  const md = buildReport()
  await fs.writeFile(REPORT_MD, md)
  await fs.writeFile(REPORT_JSON, JSON.stringify(issues, null, 2))

  if (JSON_OUT) {
    console.log(JSON.stringify(issues, null, 2))
  } else {
    console.error(`\n✓ Report:  ${REPORT_MD}`)
    console.error(`✓ Detail:  ${REPORT_JSON}`)
    console.error('')
    console.error(md.split('\n').slice(0, 4).join('\n'))
  }

  const p0 = issues.filter(i => i.severity === 'P0').length
  const p1 = issues.filter(i => i.severity === 'P1').length
  if (STRICT && (p0 + p1) > 0) process.exit(1)
  if (p0 > 0) process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(2)
})
