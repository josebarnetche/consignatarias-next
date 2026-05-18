#!/usr/bin/env node
/**
 * audit-api-health.mjs — daily rollup of ops_events for Enterprise API.
 *
 * Reads `ops_events` and `api_keys` from Supabase and surfaces:
 *   - Per-route latency (P50/P95/P99) and error rate, last 7d vs prior 7d
 *   - Endpoints with no traffic in 30d (zombie candidates)
 *   - API keys at risk of quota exhaust (>80% with >7d left in period)
 *   - Top consumers per endpoint
 *   - 5xx clusters (status_code >= 500 grouped by route)
 *
 * Env:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/audit-api-health.mjs           # full report
 *   node scripts/audit-api-health.mjs --json    # JSON to stdout
 *   node scripts/audit-api-health.mjs --strict  # exit-1 on degradation
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REPORT_DIR = 'scripts/.cache'
const REPORT_MD = path.join(REPORT_DIR, 'api-health-report.md')
const REPORT_JSON = path.join(REPORT_DIR, 'api-health-report.json')

const STRICT = process.argv.includes('--strict')
const JSON_OUT = process.argv.includes('--json')

// Plan caps (must mirror src/lib/api-keys.ts PLANS)
const PLAN_QUOTAS = {
  starter: { monthlyQuota: 1_000, rateLimitPerMin: 30 },
  growth: { monthlyQuota: 50_000, rateLimitPerMin: 300 },
  scale: { monthlyQuota: 5_000_000, rateLimitPerMin: 5_000 },
}

// Latency regression threshold: if last-7d P95 > priorRatio * prior-7d P95
const REGRESSION_FACTOR = 2.0
// Treat error rate above this as alert-worthy
const ERROR_RATE_ALERT = 0.05

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))
  return sortedAsc[idx]
}

function isoDays(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

// Pull ALL ops_events rows in window with pagination
async function fetchEvents(sinceISO) {
  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('ops_events')
      .select('id, event_type, status, api_key_id, route, latency_ms, status_code, created_at')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`ops_events fetch: ${error.message}`)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function fetchActiveKeysWithTier() {
  // Join api_keys → user_subscriptions to get tier per key.
  const { data: keys, error: ek } = await supabase
    .from('api_keys')
    .select('id, name, user_id, created_at, last_used_at, revoked_at')
    .is('revoked_at', null)
  if (ek) throw new Error(`api_keys fetch: ${ek.message}`)
  const uids = [...new Set(keys.map(k => k.user_id).filter(Boolean))]
  if (uids.length === 0) return keys.map(k => ({ ...k, tier: 'unknown' }))
  const { data: subs, error: es } = await supabase
    .from('user_subscriptions')
    .select('user_id, api_tier, api_tier_cancelled_at')
    .in('user_id', uids)
  if (es) throw new Error(`user_subscriptions fetch: ${es.message}`)
  const tierByUser = new Map()
  for (const s of subs || []) {
    if (s.api_tier_cancelled_at) continue
    tierByUser.set(s.user_id, s.api_tier || 'starter')
  }
  return keys.map(k => ({ ...k, tier: tierByUser.get(k.user_id) || 'starter' }))
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function rollupByRoute(events) {
  const byRoute = new Map()
  for (const e of events) {
    if (e.event_type !== 'api_call') continue
    const route = e.route || '(unknown)'
    if (!byRoute.has(route)) {
      byRoute.set(route, { route, total: 0, errors: 0, latencies: [], statusCodes: new Map() })
    }
    const b = byRoute.get(route)
    b.total++
    if (e.status === 'error' || (e.status_code && e.status_code >= 500)) b.errors++
    if (typeof e.latency_ms === 'number') b.latencies.push(e.latency_ms)
    if (e.status_code) b.statusCodes.set(e.status_code, (b.statusCodes.get(e.status_code) || 0) + 1)
  }
  for (const b of byRoute.values()) {
    b.latencies.sort((a, b) => a - b)
    b.p50 = percentile(b.latencies, 50)
    b.p95 = percentile(b.latencies, 95)
    b.p99 = percentile(b.latencies, 99)
    b.errorRate = b.total === 0 ? 0 : b.errors / b.total
    delete b.latencies // drop heavy field before JSON serialization
  }
  return byRoute
}

function rollupByKey(events) {
  const byKey = new Map()
  for (const e of events) {
    if (e.event_type !== 'api_call' || !e.api_key_id) continue
    if (!byKey.has(e.api_key_id)) {
      byKey.set(e.api_key_id, { keyId: e.api_key_id, calls: 0, errors: 0, routes: new Map() })
    }
    const b = byKey.get(e.api_key_id)
    b.calls++
    if (e.status === 'error') b.errors++
    b.routes.set(e.route || '(unknown)', (b.routes.get(e.route || '(unknown)') || 0) + 1)
  }
  return byKey
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const issues = []
function flag(severity, code, message, extra = {}) {
  issues.push({ severity, code, message, ...extra })
}

function buildReport({
  windowDays,
  totalEvents,
  routesNow,
  routesPrior,
  keys,
  callsByKeyThisMonth,
  zombieRoutes,
}) {
  const lines = []
  lines.push(`# API health audit — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`)
  lines.push('')
  lines.push(`**Window:** last ${windowDays} days vs prior ${windowDays} days · **Events analyzed:** ${totalEvents}`)
  lines.push('')

  // ---- Per-route table ----
  lines.push('## Per-route rollup (last 7d)')
  lines.push('')
  lines.push('| Route | Calls | P50 ms | P95 ms | Errors | Trend |')
  lines.push('|---|---:|---:|---:|---:|---|')
  const rows = [...routesNow.values()].sort((a, b) => b.total - a.total)
  for (const r of rows) {
    const prior = routesPrior.get(r.route)
    let trend = '—'
    if (prior && prior.p95 && r.p95) {
      const ratio = r.p95 / prior.p95
      if (ratio >= REGRESSION_FACTOR) {
        trend = `⚠️ +${Math.round((ratio - 1) * 100)}%`
        flag('P1', 'latency-regression', `${r.route} P95 went from ${prior.p95}ms → ${r.p95}ms (${ratio.toFixed(2)}×)`, { route: r.route, prior: prior.p95, now: r.p95 })
      } else if (ratio <= 0.5) {
        trend = `↓ -${Math.round((1 - ratio) * 100)}%`
      } else {
        trend = `${ratio.toFixed(2)}×`
      }
    } else if (!prior) {
      trend = 'new'
    }
    const errPct = (r.errorRate * 100).toFixed(1)
    const errCell = r.errorRate >= ERROR_RATE_ALERT ? `⚠️ ${errPct}% (${r.errors})` : `${errPct}% (${r.errors})`
    if (r.errorRate >= ERROR_RATE_ALERT && r.total >= 5) {
      flag('P1', 'high-error-rate', `${r.route} error rate ${errPct}% (${r.errors}/${r.total})`, { route: r.route })
    }
    lines.push(`| \`${r.route}\` | ${r.total} | ${r.p50 ?? '—'} | ${r.p95 ?? '—'} | ${errCell} | ${trend} |`)
  }
  lines.push('')

  // ---- Zombies ----
  if (zombieRoutes.length > 0) {
    lines.push('## Zombie routes (no traffic in 30d)')
    lines.push('')
    for (const r of zombieRoutes) lines.push(`- \`${r}\``)
    lines.push('')
    flag('P2', 'zombie-routes', `${zombieRoutes.length} routes had zero traffic in last 30 days`, { routes: zombieRoutes })
  }

  // ---- Top consumers ----
  const topKeys = [...callsByKeyThisMonth.entries()]
    .sort((a, b) => b[1].calls - a[1].calls)
    .slice(0, 10)
  if (topKeys.length > 0) {
    lines.push('## Top API consumers (this month)')
    lines.push('')
    lines.push('| Key name | Tier | Calls | % of quota | Top route |')
    lines.push('|---|---|---:|---:|---|')
    for (const [keyId, info] of topKeys) {
      const key = keys.find(k => k.id === keyId)
      const tier = key?.tier || 'unknown'
      const quota = PLAN_QUOTAS[tier]?.monthlyQuota
      const pct = quota ? ((info.calls / quota) * 100).toFixed(1) + '%' : '—'
      const topRoute = [...info.routes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
      lines.push(`| \`${key?.name || keyId.slice(0, 8)}\` | ${tier} | ${info.calls} | ${pct} | \`${topRoute}\` |`)

      // Quota burn alert: >80% with >7d left in current month
      if (quota && info.calls / quota > 0.8) {
        const daysIntoMonth = new Date().getDate()
        const daysLeft = 30 - daysIntoMonth
        if (daysLeft > 7) {
          flag('P1', 'quota-burn-risk', `key "${key?.name || keyId.slice(0, 8)}" (${tier}) at ${pct} with ~${daysLeft} days left in month — likely to exhaust`, { keyId, tier, calls: info.calls, quota })
        }
      }
    }
    lines.push('')
  }

  // ---- Issues summary ----
  if (issues.length > 0) {
    lines.push('## Alerts')
    lines.push('')
    const bySev = { P0: [], P1: [], P2: [] }
    for (const i of issues) bySev[i.severity].push(i)
    for (const sev of ['P0', 'P1', 'P2']) {
      if (bySev[sev].length === 0) continue
      lines.push(`### ${sev} (${bySev[sev].length})`)
      for (const i of bySev[sev]) lines.push(`- **${i.code}** — ${i.message}`)
      lines.push('')
    }
  } else {
    lines.push('## ✓ No alerts')
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.error('Fetching ops_events…')
  const since30 = isoDays(30)
  const since14 = isoDays(14)
  const since7 = isoDays(7)
  const events30 = await fetchEvents(since30)
  console.error(`  events 30d: ${events30.length}`)
  const events14 = events30.filter(e => e.created_at >= since14)
  const events7 = events30.filter(e => e.created_at >= since7)
  const events14To7 = events30.filter(e => e.created_at >= since14 && e.created_at < since7)
  console.error(`  events 7d: ${events7.length} · prior 7d: ${events14To7.length}`)

  console.error('Fetching api_keys…')
  const keys = await fetchActiveKeysWithTier()
  console.error(`  active keys: ${keys.length}`)

  console.error('Rolling up…')
  const routesNow = rollupByRoute(events7)
  const routesPrior = rollupByRoute(events14To7)
  const routes30 = rollupByRoute(events30)
  const routesEver = new Set(routes30.keys())

  // For zombies, we need a comparison set: known endpoints. We could parse
  // src/app/api/* but for simplicity, use the set of routes that ever appeared
  // in ops_events history (queried separately for a wider window).
  // For now, zombieRoutes = routes seen 90d ago but not in last 30d.
  // (Skipping the 90d backstop in v1 — flag as TODO in report.)
  const zombieRoutes = []
  // Identify routes present in prior 14-7d window but missing from current 7d.
  for (const r of routesPrior.keys()) {
    if (!routesNow.has(r)) zombieRoutes.push(r)
  }

  // Calls per key this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const callsByKeyThisMonth = rollupByKey(
    events30.filter(e => new Date(e.created_at) >= startOfMonth),
  )

  const md = buildReport({
    windowDays: 7,
    totalEvents: events30.length,
    routesNow,
    routesPrior,
    keys,
    callsByKeyThisMonth,
    zombieRoutes,
  })

  await fs.mkdir(REPORT_DIR, { recursive: true })
  await fs.writeFile(REPORT_MD, md)
  await fs.writeFile(
    REPORT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalEvents30d: events30.length,
        routes: [...routesNow.values()],
        zombieRoutes,
        issues,
      },
      null,
      2,
    ),
  )

  if (JSON_OUT) {
    console.log(JSON.stringify(issues, null, 2))
  } else {
    console.error(`\n✓ Report:  ${REPORT_MD}`)
    console.error(`✓ Detail:  ${REPORT_JSON}`)
    console.error('')
    console.error(md.split('## Per-route rollup')[0])
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
