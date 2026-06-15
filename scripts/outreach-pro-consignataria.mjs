#!/usr/bin/env node
/**
 * outreach-pro-consignataria.mjs — the 1:1 outreach that converts the first
 * PRO Consignataria firms: "tu perfil fue visto N veces → activá PRO".
 *
 * Pulls REAL profile_views (last 30d) per consignataria, joins the firm's email,
 * and renders a personalized message linking to /consignatarias/<slug>/activar
 * (the email-first checkout CTA). This is the conversion act for the first peso —
 * firms convert by direct outreach with their own real number, not by the funnel.
 *
 * DEFAULT = DRY RUN (prints, sends NOTHING). Cold email is outward-facing — it only
 * sends with --send (gently rate-limited). Always review the dry run first.
 * Skips firms already featured (already PRO).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (--send also: RESEND_API_KEY)
 * Usage:
 *   node scripts/outreach-pro-consignataria.mjs            # dry run, threshold 20 views/30d
 *   node scripts/outreach-pro-consignataria.mjs --min 10   # custom threshold
 *   node scripts/outreach-pro-consignataria.mjs --send     # actually send (review dry run first!)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(2)
}

const args = process.argv.slice(2)
const SEND = args.includes('--send')
const minIdx = args.indexOf('--min')
const MIN_VIEWS = minIdx >= 0 ? parseInt(args[minIdx + 1], 10) : 20
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
const FROM = process.env.RESEND_FROM_PERSONAL || 'José Barnetche <hola@consignatarias.com>'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

// 1) view counts per consignataria (last 30d) — tally client-side
const { data: views, error: vErr } = await supabase
  .from('profile_views')
  .select('entity_slug')
  .eq('entity_type', 'consignataria')
  .gte('viewed_at', since)
if (vErr) {
  console.error('profile_views query failed:', vErr.message)
  process.exit(1)
}

const counts = new Map()
for (const r of views || []) counts.set(r.entity_slug, (counts.get(r.entity_slug) || 0) + 1)

const slugs = [...counts.keys()].filter((s) => (counts.get(s) || 0) >= MIN_VIEWS)
if (slugs.length === 0) {
  console.log(`No hay firmas con >= ${MIN_VIEWS} vistas en 30 días.`)
  process.exit(0)
}

// 2) firm email + display_name + featured (skip already-PRO)
const { data: firms, error: fErr } = await supabase
  .from('consignatarias')
  .select('canonical_slug, display_name, email, featured')
  .in('canonical_slug', slugs)
if (fErr) {
  console.error('consignatarias query failed:', fErr.message)
  process.exit(1)
}
const firmBySlug = new Map((firms || []).map((f) => [f.canonical_slug, f]))

const targets = slugs
  .map((slug) => ({ slug, views: counts.get(slug), firm: firmBySlug.get(slug) }))
  .filter((t) => t.firm && t.firm.email && !t.firm.featured)
  .sort((a, b) => b.views - a.views)

const noEmail = slugs
  .map((slug) => ({ slug, views: counts.get(slug), firm: firmBySlug.get(slug) }))
  .filter((t) => t.firm && !t.firm.email && !t.firm.featured)

function renderMessage(t) {
  const name = t.firm.display_name || t.slug
  const subject = `Tu perfil en consignatarias.com.ar fue visto ${t.views} veces este mes`
  const html = `
    <p>Hola, equipo de <strong>${name}</strong>:</p>
    <p>Tu perfil en consignatarias.com.ar fue visto <strong>${t.views} veces</strong> en los últimos 30 días por productores que buscan dónde y con quién operar.</p>
    <p>Con <strong>PRO</strong> aparecés con prioridad (destacado), con tu badge verificado, tu calendario y la analítica de tu perfil — para que esas visitas se vuelvan consultas.</p>
    <p><a href="${APP_URL}/consignatarias/${t.slug}/activar">Activá PRO acá</a> — ARS 45.000/mes, cancelás cuando quieras.</p>
    <p>Saludos,<br>José — consignatarias.com.ar</p>
  `.trim()
  return { subject, html }
}

console.log(`\n${SEND ? '📤 SEND' : '🧪 DRY RUN'} · umbral ${MIN_VIEWS} vistas/30d · ${targets.length} firmas objetivo · ${noEmail.length} sin email\n`)
if (targets.length) {
  console.table(targets.map((t) => ({ firma: t.firm.display_name || t.slug, email: t.firm.email, vistas: t.views })))
}
if (noEmail.length) {
  console.log('\nSin email (contacto manual):')
  console.table(noEmail.map((t) => ({ firma: t.firm.display_name || t.slug, slug: t.slug, vistas: t.views })))
}

if (!SEND) {
  for (const t of targets) {
    const { subject } = renderMessage(t)
    console.log(`\n— ${t.firm.display_name || t.slug} <${t.firm.email}> · ${t.views} vistas`)
    console.log(`  Asunto: ${subject}`)
    console.log(`  Link:   ${APP_URL}/consignatarias/${t.slug}/activar`)
  }
  console.log(`\n(dry run — no se envió nada. Revisá la lista y agregá --send para enviar.)\n`)
  process.exit(0)
}

// --send: requires Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY for --send')
  process.exit(2)
}
const { Resend } = await import('resend')
const resend = new Resend(RESEND_API_KEY)

let sent = 0
for (const t of targets) {
  const { subject, html } = renderMessage(t)
  try {
    await resend.emails.send({ from: FROM, to: t.firm.email, subject, html })
    sent++
    console.log(`✓ enviado a ${t.firm.email} (${t.views} vistas)`)
    await new Promise((r) => setTimeout(r, 1200)) // gentle rate-limit
  } catch (e) {
    console.error(`✗ falló ${t.firm.email}:`, e?.message || e)
  }
}
console.log(`\nEnviados: ${sent}/${targets.length}\n`)
