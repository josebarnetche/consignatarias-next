import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'

const SLUG_RE = /^[a-z0-9-]{1,120}$/
const ALLOWED_SOURCES = new Set(['profile', 'go_landing', 'remate', 'card', 'fab'])

/**
 * POST /api/track/whatsapp
 *
 * Track WhatsApp button clicks for dashboard analytics.
 * Called client-side when user clicks WhatsApp CTA.
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
