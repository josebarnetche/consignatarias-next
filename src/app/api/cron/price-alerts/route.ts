import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import { sendPriceThresholdAlert } from '@/lib/email'
import { getCurrentPrice, categoryLabel, crossed } from '@/lib/price-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/cron/price-alerts
 *
 * Motor de disparo de las alertas de precio por umbral. Corre después del scrape de
 * precios. Para cada alerta activa: calcula el precio de referencia de su categoría,
 * detecta el CRUCE (precio pasó al lado del umbral desde `last_value`) y dispara UNA
 * vez (email o webhook), marcando la alerta como `fired`. Si no cruzó, actualiza
 * `last_value` para poder detectar el cruce en la próxima corrida.
 *
 * `?dryRun=1` → calcula y reporta qué dispararía, SIN mandar mails ni tocar la DB.
 * Auth: authorizeCron (CRON_SECRET).
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  const service = requireServiceClient()

  const { data: alerts, error } = await service
    .from('price_alerts')
    .select('id, email, webhook_url, category, threshold, direction, last_value')
    .eq('status', 'active')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ message: 'Sin alertas activas', checked: 0, fired: 0, dryRun })
  }

  // Precio actual por categoría (una lectura por categoría distinta).
  const priceByCat = new Map<string, number | null>()
  for (const cat of new Set(alerts.map((a) => a.category))) {
    try {
      priceByCat.set(cat, await getCurrentPrice(service, cat))
    } catch (e) {
      console.error('[cron/price-alerts] precio', cat, e)
      priceByCat.set(cat, null)
    }
  }

  const fired: Array<{ id: number; category: string; threshold: number; current: number; to: string }> = []
  const updatedLastValue: number[] = []

  for (const a of alerts) {
    const current = priceByCat.get(a.category) ?? null
    if (current == null) continue

    const dir = a.direction === 'below' ? 'below' : 'above'
    if (crossed(dir, current, a.last_value ?? null, a.threshold)) {
      const to = a.email || a.webhook_url || ''
      fired.push({ id: a.id, category: a.category, threshold: a.threshold, current, to })
      if (dryRun) continue

      if (a.email) {
        await sendPriceThresholdAlert(a.email, {
          categoryLabel: categoryLabel(a.category),
          threshold: a.threshold,
          direction: dir,
          current,
        }).catch((e) => console.error('[cron/price-alerts] mail', a.id, e))
      }
      if (a.webhook_url) {
        await fetch(a.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'price.threshold_crossed',
            data: { category: a.category, threshold: a.threshold, current, direction: dir },
            timestamp: new Date().toISOString(),
          }),
        }).catch((e) => console.error('[cron/price-alerts] webhook', a.id, e))
      }
      await service
        .from('price_alerts')
        .update({ status: 'fired', last_fired_at: new Date().toISOString(), last_value: current })
        .eq('id', a.id)
    } else if (!dryRun && a.last_value !== current) {
      // No cruzó: actualizamos last_value para detectar el cruce la próxima.
      await service.from('price_alerts').update({ last_value: current }).eq('id', a.id)
      updatedLastValue.push(a.id)
    }
  }

  return NextResponse.json({
    checked: alerts.length,
    fired: fired.length,
    fired_detail: fired,
    last_value_updated: updatedLastValue.length,
    dryRun,
  })
}
