import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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

export async function POST(req: NextRequest) {
  try {
    const { entityType, entitySlug } = await req.json()

    if (!entityType || !entitySlug) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') || ''
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true })
    }

    const referrer = req.headers.get('referer') || null
    const service = createServiceClient()

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
