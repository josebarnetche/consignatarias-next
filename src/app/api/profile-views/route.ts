import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'

const BOT_PATTERNS = [
  'bot', 'crawl', 'spider', 'slurp', 'mediapartners',
  'facebookexternalhit', 'linkedinbot', 'twitterbot',
  'whatsapp', 'telegrambot', 'googlebot', 'bingbot',
  'yandexbot', 'baiduspider', 'duckduckbot',
]

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase()
  return BOT_PATTERNS.some(p => lower.includes(p))
}

const VALID_ENTITY_TYPES = new Set(['consignataria', 'frigorifico', 'remate'])
// Cached canonical-slug set for consignataria validation. The data file is
// static at build time so caching in module scope is safe.
let CANONICAL_CONSIG_SET: Set<string> | null = null
function getConsigSet(): Set<string> {
  if (!CANONICAL_CONSIG_SET) CANONICAL_CONSIG_SET = new Set(getAllCanonicalSlugs())
  return CANONICAL_CONSIG_SET
}

export async function POST(req: NextRequest) {
  try {
    // Per-IP rate-limit. 'pro' tier = 100 inserts/min/IP — well above any
    // real human's browsing rhythm, but flatlines abuse.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const rl = checkRateLimit(`profile-views:${ip}`, 'pro')
    if (!rl.success) {
      return NextResponse.json({ ok: true, throttled: true })
    }

    const { entityType, entitySlug } = await req.json()

    if (!entityType || !entitySlug || typeof entityType !== 'string' || typeof entitySlug !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    if (entitySlug.length > 200) {
      return NextResponse.json({ error: 'entitySlug too long' }, { status: 400 })
    }

    // For consignatarias we know the canonical set. Frigorificos + remates
    // pools are dynamic / dated; accept any slug-shaped string for those.
    if (entityType === 'consignataria' && !getConsigSet().has(entitySlug)) {
      return NextResponse.json({ error: 'Unknown consignataria slug' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') || ''
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true })
    }

    const referrer = req.headers.get('referer') || null
    const service = requireServiceClient()

    await service.from('profile_views').insert({
      entity_type: entityType,
      entity_slug: entitySlug,
      referrer,
      user_agent: userAgent,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
