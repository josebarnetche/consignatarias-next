import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendSellZoneAlertConfirm } from '@/lib/email'
import { computeSellZone, ALERT_CATS, CAT_LABEL, type AlertCat } from '@/lib/market/sell-zone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/alertas/venta
 *
 * Alta a la alerta personalizada de "zona de venta" (FASE 1 del motor de alertas).
 * Email-first, sin login, single opt-in: el productor deja su email + categoría y
 * recibe un mail SOLO cuando esa categoría entra en zona de venta (no por tick).
 *
 * Body: { email: string, categoria: AlertCat, source?: string }
 *
 * Hace dos cosas:
 *  1. upsert en sell_zone_alerts (email+categoria, reactiva si estaba de baja)
 *  2. espeja el contacto en newsletter_subscribers (universo de email) sin pisar
 *     una suscripción previa: solo inserta si no existe.
 * Después manda el mail de confirmación con el percentil de hoy (fire-and-forget).
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; categoria?: unknown; source?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  const categoria = typeof body.categoria === 'string' ? body.categoria.toLowerCase().trim() : ''
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : 'vender-ahora'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'Email inválido' }, { status: 400 })
  }
  if (!ALERT_CATS.includes(categoria as AlertCat)) {
    return NextResponse.json({ success: false, error: 'Categoría inválida' }, { status: 400 })
  }

  const supabase = requireServiceClient()

  // 1) upsert de la alerta (idempotente por email+categoria; reactiva si estaba de baja).
  // Resiliente a que la migración 20260625_sell_zone_alerts aún no esté aplicada en
  // prod: si la tabla no existe, NO fallamos — caemos al espejo en newsletter (abajo)
  // para igual capturar el contacto, y el motor del cron toma la posta cuando exista.
  const { error: upsertErr } = await supabase
    .from('sell_zone_alerts')
    .upsert(
      { email, categoria, status: 'active', source },
      { onConflict: 'email,categoria' },
    )
  const tableMissing = upsertErr?.message?.includes('sell_zone_alerts') ||
    upsertErr?.code === '42P01' // undefined_table
  if (upsertErr && !tableMissing) {
    console.error('[alertas/venta] upsert error:', upsertErr.message)
    return NextResponse.json(
      { success: false, error: 'No se pudo crear la alerta. Probá de nuevo.' },
      { status: 500 },
    )
  }
  if (tableMissing) {
    console.warn('[alertas/venta] sell_zone_alerts no existe aún — fallback a newsletter')
  }

  // 2) espejar el contacto en newsletter_subscribers. Si la tabla de alertas no
  // existe todavía, etiquetamos el source con la categoría para no perder la intención.
  const fallbackSource = tableMissing ? `alerta-venta:${categoria}` : 'alerta-venta'
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!existing) {
    await supabase.from('newsletter_subscribers').insert({
      email,
      source: fallbackSource,
      status: 'active',
      subscribed_at: new Date().toISOString(),
    })
  }

  // Confirmación con el percentil de hoy (fire-and-forget, nunca bloquea la respuesta).
  computeSellZone()
    .then((sig) =>
      sendSellZoneAlertConfirm(email, {
        categoriaLabel: CAT_LABEL[categoria as AlertCat],
        pct365: sig.pct365,
      }),
    )
    .catch((err) => console.error('[alertas/venta] confirm email error:', err))

  return NextResponse.json({ success: true, message: 'Alerta activada' })
}
