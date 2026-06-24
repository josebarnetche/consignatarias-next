import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendConsignatariaViewsOutreach } from '@/lib/email'
import { getFeaturedSlugs } from '@/lib/featured'
import { authorizeCron } from '@/lib/cron-auth'
import { trackCron } from '@/lib/ops'

/**
 * POST /api/cron/pro-consignataria-outreach
 *
 * Motor WARM de conversión PRO. A la consignataria cuyo PERFIL tuvo tracción real
 * ("tu perfil fue visto N veces este mes"), le ofrecemos PRO — warm, no cold.
 *
 * Selección (todas las condiciones, en orden):
 *   1. ≥ min vistas de perfil en 30d (tabla profile_views, default min=10).
 *   2. email no-null.
 *   3. NO sea ya PRO (getFeaturedSlugs: featured=true O subscription activa).
 *   4. NO se haya dado de baja (newsletter_subscribers status='unsubscribed' por ese email).
 *   5. outreach_log: 1 vez por slug + cooldown 30d (no re-pitchear el mismo inbox/slug).
 *
 * GOTEO: máximo 1 envío por corrida (cap duro). Mandamos a la de MÁS vistas primero.
 *
 * Auth: authorizeCron (CRON_SECRET o ADMIN_SECRET vía Bearer / x-cron-secret / ?secret=).
 *
 * Modo TEST seguro: POST .../pro-consignataria-outreach?test=<email>&secret=<...> envía
 * SOLO a ese email (sin tocar la selección ni el outreach_log) y devuelve { sent:1, test:true }.
 *
 * Query: ?min=10 (umbral de vistas) · ?dry=1 (preview, no envía).
 * Los secretos viven en Vercel; NINGÚN envío automático sin que el humano lo decida.
 */
const OUTREACH_TYPE = 'pro_consignataria_upgrade'
const DAILY_CAP = 1 // GOTEO — cap duro por corrida

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const testEmail = (url.searchParams.get('test') || '').trim().toLowerCase()
  const minViews = parseInt(url.searchParams.get('min') || '10', 10)
  const dry = url.searchParams.get('dry') === '1'

  const outcome = await trackCron('pro-consignataria-outreach', async () => {
    // --- Modo TEST: un solo destinatario, sin tocar selección ni outreach_log ---
    if (testEmail) {
      const res = await sendConsignatariaViewsOutreach({
        to: testEmail,
        displayName: 'Consignataria (TEST)',
        slug: 'test',
        views: minViews,
      })
      return {
        status: res.success ? ('ok' as const) : ('error' as const),
        message: res.success
          ? `Warm PRO TEST enviado a ${testEmail}`
          : `Fallo TEST a ${testEmail}`,
        metadata: { sent: res.success ? 1 : 0, test: true, recipient: testEmail },
      }
    }

    const supabase = requireServiceClient()
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()

    // 1) vistas de perfil por consignataria (últimos 30d) — tally en JS
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
      return {
        status: 'ok' as const,
        message: `Sin firmas sobre el umbral (min=${minViews})`,
        metadata: { sent: 0, minViews, candidates: 0 },
      }
    }

    // 2) firmas con email · NO ya PRO (featured=true O subscription activa)
    const [firmsRes, featured] = await Promise.all([
      supabase
        .from('consignatarias')
        .select('canonical_slug, display_name, email')
        .in('canonical_slug', slugs)
        .not('email', 'is', null),
      getFeaturedSlugs(),
    ])

    const eligible = ((firmsRes.data || []) as Array<{
      canonical_slug: string
      display_name: string | null
      email: string | null
    }>)
      .filter((f) => !!f.email && !featured.has(f.canonical_slug))
      .map((f) => ({
        slug: f.canonical_slug,
        email: (f.email as string).trim(),
        displayName: f.display_name || f.canonical_slug,
        views: counts.get(f.canonical_slug) || 0,
      }))
      .sort((a, b) => b.views - a.views) // más vistas primero (goteo a la de mayor tracción)

    if (eligible.length === 0) {
      return {
        status: 'ok' as const,
        message: 'Todas las firmas sobre el umbral ya son PRO o no tienen email',
        metadata: { sent: 0, minViews, candidates: 0 },
      }
    }

    // 3) suppress: emails dados de baja (newsletter_subscribers status='unsubscribed')
    const candidateEmails = [...new Set(eligible.map((e) => e.email.toLowerCase()))]
    const { data: unsub } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'unsubscribed')
      .in('email', candidateEmails)
    const suppressed = new Set(
      ((unsub || []) as Array<{ email: string | null }>)
        .map((r) => r.email?.toLowerCase())
        .filter((e): e is string => !!e),
    )

    // 4) outreach_log: 1 vez por slug + cooldown 30d (por slug o por email)
    const { data: prior } = await supabase
      .from('outreach_log')
      .select('consignataria_slug, email_sent_to, sent_at')
      .eq('type', OUTREACH_TYPE)
    const everSlugs = new Set<string>()
    const recentEmails = new Set<string>()
    for (const r of (prior || []) as Array<{
      consignataria_slug: string | null
      email_sent_to: string | null
      sent_at: string | null
    }>) {
      if (r.consignataria_slug) everSlugs.add(r.consignataria_slug) // 1 vez por slug, siempre
      if (r.email_sent_to && r.sent_at && r.sent_at >= since) {
        recentEmails.add(r.email_sent_to.toLowerCase()) // cooldown 30d por email
      }
    }

    const filtered = eligible.filter(
      (t) =>
        !suppressed.has(t.email.toLowerCase()) &&
        !everSlugs.has(t.slug) &&
        !recentEmails.has(t.email.toLowerCase()),
    )

    // GOTEO: cap duro por corrida
    const toSend = filtered.slice(0, DAILY_CAP)

    if (dry) {
      return {
        status: 'ok' as const,
        message: `DRY: ${toSend.length} a enviar de ${filtered.length} elegibles`,
        metadata: {
          dry: true,
          minViews,
          eligible: eligible.length,
          afterSuppress: filtered.length,
          toSend: toSend.map((t) => ({ slug: t.slug, email: t.email, views: t.views })),
        },
      }
    }

    let sent = 0
    const errors: string[] = []
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
          // nunca fallar la corrida por un error de logging
        }
      } else {
        errors.push(t.email)
      }
    }

    return {
      status: errors.length > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Warm PRO enviado: ${sent}/${toSend.length} (goteo cap=${DAILY_CAP})`,
      metadata: {
        sent,
        minViews,
        eligible: eligible.length,
        afterSuppress: filtered.length,
        cap: DAILY_CAP,
        errors: errors.length,
      },
    }
  })

  return NextResponse.json(outcome.metadata ?? { ok: true })
}
