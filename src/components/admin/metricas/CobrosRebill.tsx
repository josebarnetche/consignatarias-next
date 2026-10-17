import { createServiceClient } from '@/lib/supabase'

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

export default async function CobrosRebill() {
  const D = 86_400_000
  const [d7, d30] = await Promise.all([contar(7 * D), contar(30 * D)])
  return (
    <p className="terminal-panel px-panel py-2 text-xxs text-zinc-500 font-terminal tabular-nums">
      {d30 == null
        ? 'Eventos de Rebill: s/d (no se pudo leer processed_webhook_events).'
        : d30 === 0
          ? 'Rebill no envió ningún evento en 30 días: no hubo cobros, altas ni bajas.'
          : `Eventos de Rebill procesados: ${d7 == null ? 's/d' : nf(d7)} en 7 días · ${nf(d30)} en 30 días.`}
    </p>
  )
}
