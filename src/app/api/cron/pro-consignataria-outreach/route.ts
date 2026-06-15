import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendConsignatariaViewsOutreach } from '@/lib/email'

/**
 * POST /api/cron/pro-consignataria-outreach
 *
 * Monthly conversion outreach: "tu perfil fue visto N veces → activá PRO". Pulls
 * real profile_views (30d) per consignataria, joins the firm email, and emails the
 * ones over threshold with their OWN number — the act that converts the first peso.
 *
 * Guardrails:
 *   - skips firms already PRO (featured)
 *   - 30-day per-recipient cooldown via outreach_log (type='pro_consignataria_upgrade');
 *     re-pitching the same inbox monthly with identical copy converts at 0%.
 *
 * Query: ?min=20 (views threshold) · ?dry=1 (preview, sends nothing).
 * Secrets stay on Vercel; trigger by curling with Authorization: Bearer CRON_SECRET.
 */
const CRON_SECRET = process.env.CRON_SECRET
const OUTREACH_TYPE = 'pro_consignataria_upgrade'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const minViews = parseInt(url.searchParams.get('min') || '20', 10)
  const dry = url.searchParams.get('dry') === '1'

  const supabase = requireServiceClient()
  const since = new Date(Date.now() - 30 * 86400_000).toISOString()

  // 1) view counts per consignataria (last 30d) — tally in JS
  const { data: views } = await supabase
    .from('profile_views')
    .select('entity_slug')
    .eq('entity_type', 'consignataria')
    .gte('viewed_at', since)

  const counts = new Map<string, number>()
  for (const r of (views || []) as Array<{ entity_slug: string }>) {
    counts.set(r.entity_slug, (counts.get(r.entity_slug) || 0) + 1)
  }

  const slugs = [...counts.keys()].filter((s) => (counts.get(s) || 0) >= minViews)
  if (slugs.length === 0) {
    return NextResponse.json({ message: 'No firms over threshold', minViews, sent: 0 })
  }

  // 2) firms with an email, not already PRO (featured)
  const { data: firms } = await supabase
    .from('consignatarias')
    .select('canonical_slug, display_name, email, featured')
    .in('canonical_slug', slugs)
    .not('email', 'is', null)

  const eligible = ((firms || []) as Array<{
    canonical_slug: string
    display_name: string | null
    email: string | null
    featured: boolean | null
  }>)
    .filter((f) => f.email && !f.featured)
    .map((f) => ({
      slug: f.canonical_slug,
      email: f.email as string,
      displayName: f.display_name || f.canonical_slug,
      views: counts.get(f.canonical_slug) || 0,
    }))
    .sort((a, b) => b.views - a.views)

  // 3) 30-day per-recipient cooldown
  const { data: recent } = await supabase
    .from('outreach_log')
    .select('email_sent_to')
    .eq('type', OUTREACH_TYPE)
    .gte('sent_at', since)
  const recentEmails = new Set(
    ((recent || []) as Array<{ email_sent_to: string | null }>)
      .map((r) => r.email_sent_to?.toLowerCase())
      .filter((e): e is string => !!e),
  )

  const toSend = eligible.filter((t) => !recentEmails.has(t.email.toLowerCase()))
  const cooled = eligible.length - toSend.length

  if (dry) {
    return NextResponse.json({
      dry: true,
      minViews,
      candidates: eligible.length,
      cooled,
      toSend: toSend.map((t) => ({ slug: t.slug, email: t.email, views: t.views })),
    })
  }

  let sent = 0
  for (const t of toSend) {
    const res = await sendConsignatariaViewsOutreach({
      to: t.email,
      displayName: t.displayName,
      slug: t.slug,
      views: t.views,
    })
    if (res.success) {
      sent++
      try {
        await supabase.from('outreach_log').insert({
          type: OUTREACH_TYPE,
          consignataria_slug: t.slug,
          email_sent_to: t.email,
          notes: `views_30d=${t.views}`,
        })
      } catch {
        // never fail the run on a logging error
      }
    }
  }

  return NextResponse.json({ minViews, candidates: eligible.length, cooled, sent })
}
