import { createServiceClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'

/**
 * Línea chica bajo los ingresos de /admin/dashboard: cuántos eventos de Rebill
 * (webhooks de cobro/alta/baja) se procesaron. Es la señal de que el circuito
 * de pagos está vivo; viene de la tabla de idempotencia processed_webhook_events.
 * Antes vivía en ConversionRevenueCard (que ya no se renderiza).
 */

const nf = (n: number) => n.toLocaleString('es-AR')

async function contar(sinceMs: number): Promise<number | null> {
  const db = createServiceClient()
  if (!db) return null
  try {
    const { count, error } = await db
      .from('processed_webhook_events')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', new Date(Date.now() - sinceMs).toISOString())
    return error || count == null ? null : count
  } catch {
    return null
  }
}

/**
 * Webhooks de Rebill rechazados (401 firma_invalida y demás). Sin esto la línea decía
 * "no hubo cobros" mientras Rebill sí mandaba eventos y los rechazábamos: en oct-2026
 * hubo 5 rechazos y una compra que entró solo por /api/cron/rebill-reconciliar.
 */
async function rechazados(sinceMs: number): Promise<number | null> {
  const db = createServiceClient()
  if (!db) return null
  try {
    const { count, error } = await db
      .from('ops_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'webhook_received')
      .eq('route', '/api/webhooks/rebill')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - sinceMs).toISOString())
    return error || count == null ? null : count
  } catch {
    return null
  }
}

export default async function CobrosRebill() {
  const D = 86_400_000
  const [d7, d30, r30] = await Promise.all([contar(7 * D), contar(30 * D), rechazados(30 * D)])
  const procesados =
    d30 == null
      ? 'Eventos de Rebill: s/d (no se pudo leer processed_webhook_events).'
      : d30 === 0
        ? 'Rebill: ningún evento procesado en 30 días.'
        : `Eventos de Rebill procesados: ${d7 == null ? 's/d' : nf(d7)} en 7 días · ${nf(d30)} en 30 días.`
  return (
    <p className="terminal-panel px-panel py-2 text-xxs text-zinc-500 font-terminal tabular-nums">
      {procesados}
      {r30 != null && r30 > 0 && (
        <>
          {' '}
          <Badge tone="negative">
            {nf(r30)} webhook{r30 === 1 ? '' : 's'} rechazado{r30 === 1 ? '' : 's'} · 30 d
          </Badge>{' '}
          los cobros dependen de la reconciliación (ver /admin/ops).
        </>
      )}
    </p>
  )
}
