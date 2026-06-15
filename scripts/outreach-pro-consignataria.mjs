#!/usr/bin/env node
/**
 * outreach-pro-consignataria.mjs — LOCAL PREVIEW of the PRO Consignataria conversion
 * outreach ("tu perfil fue visto N veces → activá PRO").
 *
 * Read-only: shows which firms the cron route would email this run, with their REAL
 * profile_views (30d) and the 30-day cooldown applied — so you can eyeball the first
 * wave before it goes out. It does NOT send: sending is the cron route's job
 * (/api/cron/pro-consignataria-outreach), which holds the secrets on Vercel and logs
 * to outreach_log. This script just mirrors its selection so the preview is faithful.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Usage:
 *   node scripts/outreach-pro-consignataria.mjs            # preview, threshold 20 views/30d
 *   node scripts/outreach-pro-consignataria.mjs --min 10   # custom threshold
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(2)
}

const args = process.argv.slice(2)
const minIdx = args.indexOf('--min')
const MIN_VIEWS = minIdx >= 0 ? parseInt(args[minIdx + 1], 10) : 20
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
const OUTREACH_TYPE = 'pro_consignataria_upgrade'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

// 1) view counts per consignataria (last 30d)
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

// 2) firm email + featured (skip already-PRO)
const { data: firms, error: fErr } = await supabase
  .from('consignatarias')
  .select('canonical_slug, display_name, email, featured')
  .in('canonical_slug', slugs)
if (fErr) {
  console.error('consignatarias query failed:', fErr.message)
  process.exit(1)
}
const firmBySlug = new Map((firms || []).map((f) => [f.canonical_slug, f]))

// 3) 30-day cooldown (same outreach_log/type the cron route uses)
const { data: recent } = await supabase
  .from('outreach_log')
  .select('email_sent_to')
  .eq('type', OUTREACH_TYPE)
  .gte('sent_at', since)
const recentEmails = new Set(
  (recent || []).map((r) => r.email_sent_to?.toLowerCase()).filter(Boolean),
)

const eligible = slugs
  .map((slug) => ({ slug, views: counts.get(slug), firm: firmBySlug.get(slug) }))
  .filter((t) => t.firm && t.firm.email && !t.firm.featured)
  .sort((a, b) => b.views - a.views)

const toSend = eligible.filter((t) => !recentEmails.has(t.firm.email.toLowerCase()))
const cooled = eligible.filter((t) => recentEmails.has(t.firm.email.toLowerCase()))
const noEmail = slugs
  .map((slug) => ({ slug, views: counts.get(slug), firm: firmBySlug.get(slug) }))
  .filter((t) => t.firm && !t.firm.email && !t.firm.featured)

console.log(`\n🧪 PREVIEW · umbral ${MIN_VIEWS} vistas/30d`)
console.log(`   ${toSend.length} se enviarían · ${cooled.length} en cooldown (<30d) · ${noEmail.length} sin email\n`)

if (toSend.length) {
  console.log('Se enviarían:')
  console.table(toSend.map((t) => ({ firma: t.firm.display_name || t.slug, email: t.firm.email, vistas: t.views })))
  for (const t of toSend) {
    console.log(`\n— ${t.firm.display_name || t.slug} <${t.firm.email}> · ${t.views} vistas`)
    console.log(`  Asunto: Tu perfil en consignatarias.com.ar fue visto ${t.views} veces este mes`)
    console.log(`  Link:   ${APP_URL}/consignatarias/${t.slug}/activar`)
  }
}
if (cooled.length) {
  console.log('\nEn cooldown (ya contactadas < 30d):')
  console.table(cooled.map((t) => ({ firma: t.firm.display_name || t.slug, email: t.firm.email, vistas: t.views })))
}
if (noEmail.length) {
  console.log('\nSin email (contacto manual):')
  console.table(noEmail.map((t) => ({ firma: t.firm.display_name || t.slug, slug: t.slug, vistas: t.views })))
}

console.log('\nPara ENVIAR de verdad, la cron route es la que manda (mantiene los secrets en Vercel):')
console.log(`  curl -X POST -H "Authorization: Bearer $CRON_SECRET" "${APP_URL}/api/cron/pro-consignataria-outreach?min=${MIN_VIEWS}&dry=1"   # preview JSON`)
console.log(`  curl -X POST -H "Authorization: Bearer $CRON_SECRET" "${APP_URL}/api/cron/pro-consignataria-outreach?min=${MIN_VIEWS}"          # envía + loguea outreach_log\n`)
