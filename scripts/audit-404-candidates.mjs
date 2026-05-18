#!/usr/bin/env node
/**
 * Audit potential 404 URLs by comparing remate slugs that existed in past
 * commits of remates.json against the current set. Slugs that ever shipped
 * but no longer exist will return 404 because `dynamicParams = false`.
 *
 * Usage: node scripts/audit-404-candidates.mjs
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const REMATES_PATH = 'src/lib/data/remates.json'
const FILE_404 = 'scripts/.cache/404-candidates.json'

function slugFor(r) {
  const consig = r.consignatariaSlug || 'remate'
  const type = r.type || 'general'
  const prov = (r.province || 'argentina').toLowerCase().replace(/\s+/g, '-')
  return `${consig}-${type}-${prov}-${r.date}`
}

function loadCurrent() {
  const data = JSON.parse(fs.readFileSync(REMATES_PATH, 'utf8'))
  return new Set(data.map(slugFor))
}

function loadHistoricalSlugs() {
  // All commits that touched remates.json, oldest → newest
  const commits = execSync(`git log --reverse --format=%H -- ${REMATES_PATH}`, {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)

  const everSeen = new Set()
  const slugFirstSeenInCommit = new Map() // slug -> commit-date (when it first appeared)

  for (const commit of commits) {
    let blob
    try {
      blob = execSync(`git show ${commit}:${REMATES_PATH}`, { encoding: 'utf8' })
    } catch {
      continue
    }
    let data
    try {
      data = JSON.parse(blob)
    } catch {
      continue
    }
    if (!Array.isArray(data)) continue
    for (const r of data) {
      const s = slugFor(r)
      if (!everSeen.has(s)) {
        everSeen.add(s)
        slugFirstSeenInCommit.set(s, commit)
      }
    }
  }

  return { everSeen, slugFirstSeenInCommit }
}

function commitDate(commit) {
  try {
    return execSync(`git show -s --format=%cs ${commit}`, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const current = loadCurrent()
console.log(`Current remates: ${current.size}`)

const { everSeen, slugFirstSeenInCommit } = loadHistoricalSlugs()
console.log(`Distinct slugs ever in remates.json: ${everSeen.size}`)

const removed = [...everSeen].filter(s => !current.has(s))
console.log(`Removed slugs (404 candidates): ${removed.length}\n`)

// Group by consignataria for redirect proposal
const byConsig = {}
for (const slug of removed) {
  const m = slug.match(/^(.+?)-(invernada|cria|general|especial|reproductores)-(.+)-(\d{4}-\d{2}-\d{2})$/)
  const consig = m ? m[1] : 'unknown'
  if (!byConsig[consig]) byConsig[consig] = []
  byConsig[consig].push(slug)
}

const sortedConsig = Object.entries(byConsig).sort((a, b) => b[1].length - a[1].length)
console.log('Top consignatarias with removed remates:')
for (const [consig, slugs] of sortedConsig.slice(0, 15)) {
  console.log(`  ${consig}: ${slugs.length} removed`)
}

// Save full list
const outDir = path.dirname(FILE_404)
fs.mkdirSync(outDir, { recursive: true })
const out = removed.map(slug => {
  const m = slug.match(/^(.+?)-(invernada|cria|general|especial|reproductores)-(.+)-(\d{4}-\d{2}-\d{2})$/)
  const consig = m ? m[1] : null
  const date = m ? m[4] : null
  return {
    slug,
    url: `/remates/${slug}`,
    consignatariaSlug: consig,
    date,
    firstSeen: commitDate(slugFirstSeenInCommit.get(slug)),
  }
})
out.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
fs.writeFileSync(FILE_404, JSON.stringify(out, null, 2))
console.log(`\nWrote ${out.length} candidates to ${FILE_404}`)
console.log(`Date range: ${out[0]?.date} → ${out.at(-1)?.date}`)
