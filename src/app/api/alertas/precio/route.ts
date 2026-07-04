import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import { sendPriceAlertConfirm } from '@/lib/email'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { isValidCategory, categoryLabel, getCurrentPrice } from '@/lib/price-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/alertas/precio — alta a una alerta de precio por UMBRAL. El cron
 * price-alerts detecta el CRUCE y notifica una vez. `last_value` se setea al precio
 * actual → solo dispara ante un cruce FUTURO.
 *
 * Dos puertas (auth opt-in):
 *  • Humano (sin Authorization): { email, category, threshold, direction? }.
 *    Email-first, rate-limited, con mail de confirmación. source='web'.
 *  • Agente/IA (Authorization: Bearer <api key hasheada>): { category, threshold,
 *    direction?, webhook_url }. Notifica por webhook (POST price.threshold_crossed).
 *    Enforcea plan + cupo. source='api'. Hace el sitio agent-friendly: la IA que
 *    manda tráfico puede armar el recordatorio.
 */

/** Bloqueo SSRF básico: solo https a host público (no localhost / IP privada / metadata). */
function isPublicHttpsUrl(raw: string): boolean {
  let u: URL
  try { u = new URL(raw) } catch { return false }
  if (u.protocol !== 'https:') return false
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (/^(127\.|10\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0)/.test(h)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
  return true
}

export async function POST(req: NextRequest) {
  let body: {
    email?: unknown; category?: unknown; threshold?: unknown; direction?: unknown; webhook_url?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category.toLowerCase().trim() : ''
  const threshold = typeof body.threshold === 'number' ? body.threshold : Number(body.threshold)
  const direction = body.direction === 'below' ? 'below' : 'above'

  // Validación compartida.
  if (!isValidCategory(category)) {
    return NextResponse.json({ success: false, error: 'Categoría inválida' }, { status: 400 })
  }
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1_000_000) {
    return NextResponse.json({ success: false, error: 'Umbral inválido' }, { status: 400 })
  }

  const supabase = requireServiceClient()

  // ── Puerta AGENTE/IA: API key hasheada + webhook ────────────────────────────
  if (req.headers.get('authorization')) {
    const auth = await authenticate(req)
    if (!auth.ok) return auth.response

    const webhookUrl = typeof body.webhook_url === 'string' ? body.webhook_url.trim() : ''
    if (!isPublicHttpsUrl(webhookUrl)) {
      return NextResponse.json(
        { success: false, error: 'webhook_url debe ser una URL https pública' },
        { status: 400 },
      )
    }

    let current: number | null = null
    try { current = await getCurrentPrice(supabase, category) } catch (e) {
      console.error('[alertas/precio:api] getCurrentPrice:', e)
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: auth.key.userId,
        webhook_url: webhookUrl,
        category,
        threshold,
        direction,
        last_value: current,
        status: 'active',
        source: 'api',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[alertas/precio:api] insert:', error.message)
      return NextResponse.json({ success: false, error: 'No se pudo crear la alerta' }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      data: { alert_id: data.id, category, threshold, direction, current, delivery: 'webhook' },
    })
  }

  // ── Puerta HUMANA: email-first, rate-limited, confirmación ──────────────────
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'Email inválido' }, { status: 400 })
  }
  for (const [id, limit] of [
    [`ip:${clientIp(req)}`, 15],
    [`email:${email}`, 8],
  ] as const) {
    const rl = await enforceRateLimit({ action: 'alertas_precio', identity: id, limit, windowSeconds: 3600 })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
  }

  let current: number | null = null
  try { current = await getCurrentPrice(supabase, category) } catch (e) {
    console.error('[alertas/precio] getCurrentPrice:', e)
  }

  const { error } = await supabase.from('price_alerts').insert({
    email,
    category,
    threshold,
    direction,
    last_value: current,
    status: 'active',
    source: 'web',
  })
  if (error) {
    console.error('[alertas/precio] insert:', error.message)
    return NextResponse.json(
      { success: false, error: 'No se pudo crear la alerta. Probá de nuevo.' },
      { status: 500 },
    )
  }

  sendPriceAlertConfirm(email, {
    categoryLabel: categoryLabel(category),
    threshold,
    direction,
    current,
  }).catch((e) => console.error('[alertas/precio] confirm mail:', e))

  return NextResponse.json({ success: true, current })
}
