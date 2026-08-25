import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendLeadAlert, LEAD_ALERT_TO } from '@/lib/email'
import { enviarEnSegundoPlano } from '@/lib/ops'
import { getConsignatariaPlanStatus } from '@/lib/features'

const SLUG_RE = /^[a-z0-9-]{1,120}$/
const ALLOWED_SOURCES = new Set(['profile', 'go_landing', 'remate', 'card', 'fab'])

/** Un mismo usuario tocando el botón de una firma no genera un lead por clic. */
const LEAD_DEDUPE_HOURS = 24

/**
 * POST /api/track/whatsapp
 *
 * Registra el clic en el botón de WhatsApp de una firma. Hace DOS cosas:
 *
 *  1. `whatsapp_clicks` — el conteo anónimo de siempre, para las métricas del panel.
 *  2. `consignataria_leads` — **si el visitante tiene sesión**, además deja un lead
 *     identificado con su email.
 *
 * El (2) es nuevo y arregla el agujero central del producto: al 21-ago-2026 el sitio
 * tenía 2.245 vistas de perfil y **una sola** fila en `consignataria_leads`. El
 * contacto ya estaba pasando —la gente tocaba el botón y se iba a WhatsApp— pero del
 * lado de la firma no quedaba nada: su panel mostraba ceros y no había con qué
 * justificar una suscripción.
 *
 * Por qué se puede: el bloque de contacto del perfil está detrás de `LoginGate`, así
 * que para llegar a este botón hay que tener cuenta — la identidad ya estaba, sólo
 * que nadie la guardaba. Y el visitante está yendo a escribirle a esa firma por
 * WhatsApp con su propio número: registrar que hubo contacto no le revela nada que
 * él mismo no esté por entregar.
 *
 * Nunca falla el request por esto: si el lead no se puede escribir, el clic igual
 * se cuenta.
 */
export async function POST(req: NextRequest) {
  try {
    const { slug, source = 'profile' } = await req.json()

    // Previously accepted ANY string of any length with no rate limit →
    // unbounded junk inserts that poison per-consignataria analytics. Now:
    // strict slug charset + length, source enum, and a durable per-IP cap.
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }
    const canonical = getCanonicalSlug(slug) ?? slug
    const safeSource =
      typeof source === 'string' && ALLOWED_SOURCES.has(source) ? source : 'profile'

    const rl = await enforceRateLimit({
      action: 'track_whatsapp',
      identity: `ip:${clientIp(req)}`,
      limit: 60,
      windowSeconds: 60,
    })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

    const supabase = requireServiceClient()

    // Insert click record
    const { error } = await supabase
      .from('whatsapp_clicks')
      .insert({
        consignataria_slug: canonical,
        clicked_at: new Date().toISOString(),
        source: safeSource,
      })

    if (error) {
      console.error('WhatsApp click insert error:', error)
      // Table might not exist yet - that's ok, we'll create it
    }

    // Lead identificado, si hay sesión. Best-effort: nunca hace fallar el tracking.
    let leadCreado = false
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()

      if (user?.email) {
        const desde = new Date(Date.now() - LEAD_DEDUPE_HOURS * 3600 * 1000).toISOString()
        const { data: yaEsta } = await supabase
          .from('consignataria_leads')
          .select('id')
          .eq('consignataria_slug', canonical)
          .eq('email', user.email)
          .gte('created_at', desde)
          .maybeSingle()

        if (!yaEsta) {
          const { error: leadError } = await supabase.from('consignataria_leads').insert({
            consignataria_slug: canonical,
            name: (user.user_metadata?.full_name as string | undefined) || user.email.split('@')[0],
            email: user.email,
            phone: (user.user_metadata?.phone as string | undefined) ?? null,
            message: 'Tocó el botón de WhatsApp desde el perfil. El contacto siguió por WhatsApp.',
            source: `whatsapp_${safeSource}`,
            status: 'new',
          })
          if (leadError) {
            console.error('[track/whatsapp] no se pudo crear el lead identificado:', leadError)
          } else {
            leadCreado = true

            // Avisarle a la firma. Sin esto el lead existía en la base y la firma se
            // enteraba sólo si entraba al panel a mirar — que es exactamente lo que
            // una consignataria no hace. El aviso es lo que lo vuelve operativo.
            const { data: cons } = await supabase
              .from('consignatarias')
              .select('display_name, claimed_by_email')
              .eq('canonical_slug', canonical)
              .maybeSingle()
            const owner = cons as { display_name?: string; claimed_by_email?: string | null } | null

            if (owner?.claimed_by_email) {
              const { isPro } = await getConsignatariaPlanStatus(canonical)
              enviarEnSegundoPlano(
                sendLeadAlert({
                  to: owner.claimed_by_email,
                  bcc: LEAD_ALERT_TO,
                  consignataria: owner.display_name || canonical,
                  slug: canonical,
                  isPro,
                  lead: {
                    name: user.email.split('@')[0],
                    email: user.email,
                    message: 'Tocó el botón de WhatsApp desde tu perfil.',
                  },
                }),
              )
            }
          }
        }
      }
    } catch (e) {
      console.error('[track/whatsapp] lead identificado falló (el clic igual se contó):', e)
    }

    return NextResponse.json({ success: true, lead: leadCreado })
  } catch (error) {
    console.error('WhatsApp track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
