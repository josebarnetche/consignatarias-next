import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendPriceAlertConfirm } from '@/lib/email'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { isValidCategory, categoryLabel, getCurrentPrice } from '@/lib/price-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/alertas/precio
 *
 * Alta a una alerta de precio por UMBRAL, email-first, sin login. El productor deja
 * su email + categoría + umbral + dirección y recibe UN mail cuando el precio de
 * referencia de esa categoría cruza el umbral (el cron price-alerts detecta el cruce).
 *
 * Body: { email, category, threshold, direction? ('above'|'below') }
 *
 * `last_value` se setea al precio actual: así solo dispara ante un CRUCE futuro, no
 * si el precio ya está del lado del umbral al momento del alta.
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; category?: unknown; threshold?: unknown; direction?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  const category = typeof body.category === 'string' ? body.category.toLowerCase().trim() : ''
  const threshold = typeof body.threshold === 'number' ? body.threshold : Number(body.threshold)
  const direction = body.direction === 'below' ? 'below' : 'above'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'Email inválido' }, { status: 400 })
  }
  if (!isValidCategory(category)) {
    return NextResponse.json({ success: false, error: 'Categoría inválida' }, { status: 400 })
  }
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1_000_000) {
    return NextResponse.json({ success: false, error: 'Umbral inválido' }, { status: 400 })
  }

  // Durable rate limit — la creación manda un mail de confirmación.
  for (const [id, limit] of [
    [`ip:${clientIp(req)}`, 15],
    [`email:${email}`, 8],
  ] as const) {
    const rl = await enforceRateLimit({ action: 'alertas_precio', identity: id, limit, windowSeconds: 3600 })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
  }

  const supabase = requireServiceClient()

  // Precio actual → last_value, para disparar solo en un cruce futuro.
  let current: number | null = null
  try {
    current = await getCurrentPrice(supabase, category)
  } catch (err) {
    console.error('[alertas/precio] getCurrentPrice:', err)
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
    console.error('[alertas/precio] insert error:', error.message)
    return NextResponse.json(
      { success: false, error: 'No se pudo crear la alerta. Probá de nuevo.' },
      { status: 500 },
    )
  }

  // Confirmación fire-and-forget (no bloquea la respuesta).
  sendPriceAlertConfirm(email, {
    categoryLabel: categoryLabel(category),
    threshold,
    direction,
    current,
  }).catch((e) => console.error('[alertas/precio] confirm mail:', e))

  return NextResponse.json({ success: true, current })
}
