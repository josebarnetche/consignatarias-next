import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

/**
 * POST /api/track/ai-referral
 *
 * Beacon de atribución AI. El cliente (AnalyticsProvider) lo llama una vez por sesión
 * cuando detecta que la visita llegó desde un motor de IA (por referrer o por utm_source).
 * Persiste el dato en ai_referrals para tenerlo propio, unificado y queryable — GA4 no
 * lo expone por engine vía Data API. Espejo del evento GA4 `ai_referral`.
 */

// Lista blanca de engines aceptados (evita basura en la tabla).
const ALLOWED = new Set([
  'chatgpt', 'perplexity', 'copilot', 'gemini', 'claude', 'grok',
  'deepseek', 'mistral', 'poe', 'phind', 'you', 'kagi', 'andi', 'brave',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const engine = typeof body.engine === 'string' ? body.engine.toLowerCase().slice(0, 32) : ''
    if (!ALLOWED.has(engine)) {
      return NextResponse.json({ error: 'Invalid engine' }, { status: 400 })
    }

    const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null)

    const supabase = requireServiceClient()
    const { error } = await supabase.from('ai_referrals').insert({
      engine,
      landing_page: clip(body.landing, 512),
      referrer: clip(body.referrer, 512),
      utm_source: clip(body.utmSource, 128),
      detected_via: body.detectedVia === 'utm' ? 'utm' : 'referrer',
      path: clip(body.path, 512),
    })

    if (error) {
      console.error('ai_referral insert error:', error)
      // Tabla puede no existir todavía en algún entorno — no romper la navegación.
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ai-referral track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
