import Link from 'next/link'
import Stat from '@/components/ui/Stat'
import { createServiceClient } from '@/lib/supabase'
import { getCronHealth } from '@/lib/ops'

const nf = (n: number) => n.toLocaleString('es-AR')

/** Hours since last run, beyond which a cron is "overdue" given its cadence. */
const overdueFactor = 1.5

type RecentError = { route: string | null; status_code: number | null }

/**
 * <SystemHealthCard/> — el card "¿algo está roto?".
 *
 * Tres señales en vivo, todas soft-fail (cada falla → "s/d", nunca rompe):
 *  - Errores ops últimas 24h (ops_events status='error'): count + últimos 3 con route.
 *  - Latencia media de API 24h (avg latency_ms sobre eventos con latencia).
 *  - Salud de TODOS los crons (getCronHealth): rojo si la última corrida falló
 *    o si lleva demasiado sin correr vs. su cadencia esperada.
 *  - Link a /admin/ops para el detalle.
 *
 * Corre dentro del layout admin (ya gateado): no re-chequea auth.
 */
export default async function SystemHealthCard() {
  const supabase = createServiceClient()
  const since24hISO = new Date(Date.now() - 24 * 3_600_000).toISOString()

  // ── Errores ops 24h ───────────────────────────────────────────────
  let errCount: number | null = null
  let recentErrors: RecentError[] = []
  if (supabase) {
    const { count, error } = await supabase
      .from('ops_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('created_at', since24hISO)
    if (!error && count !== null) {
      errCount = count
      if (count > 0) {
        const { data } = await supabase
          .from('ops_events')
          .select('route, status_code')
          .eq('status', 'error')
          .gte('created_at', since24hISO)
          .order('created_at', { ascending: false })
          .limit(3)
        recentErrors = data ?? []
      }
    }
  }

  // ── Latencia media API 24h ────────────────────────────────────────
  let avgLatency: number | null = null
  if (supabase) {
    const { data, error } = await supabase
      .from('ops_events')
      .select('latency_ms')
      .gte('created_at', since24hISO)
      .not('latency_ms', 'is', null)
      .limit(2000)
    if (!error && data && data.length > 0) {
      const sum = data.reduce((acc, r) => acc + (r.latency_ms ?? 0), 0)
      avgLatency = Math.round(sum / data.length)
    }
  }

  // ── Salud de crons ────────────────────────────────────────────────
  let cronHealthLoaded = false
  let cronsRed = 0
  let cronsTotal = 0
  let worstCrons: { name: string; reason: string }[] = []
  try {
    const crons = await getCronHealth()
    cronHealthLoaded = true
    cronsTotal = crons.length
    const red = crons.filter((c) => {
      const failed = c.status === 'error' || c.status === 'timeout'
      const overdue =
        c.age_hours === null ||
        c.age_hours > c.expected_interval_hours * overdueFactor
      return failed || overdue
    })
    cronsRed = red.length
    worstCrons = red.slice(0, 3).map((c) => ({
      name: c.workflow_name,
      reason:
        c.status === 'error' || c.status === 'timeout'
          ? (c.status as string).toUpperCase()
          : c.age_hours === null
            ? 'sin correr'
            : `${Math.round(c.age_hours)}h`,
    }))
  } catch {
    cronHealthLoaded = false
  }

  const errTone = errCount === null ? 'neutral' : errCount > 0 ? 'negative' : 'positive'
  const latTone =
    avgLatency === null ? 'neutral' : avgLatency > 1500 ? 'warning' : 'positive'
  const cronTone = !cronHealthLoaded ? 'neutral' : cronsRed > 0 ? 'negative' : 'positive'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-400 text-xxs tracking-widest">SALUD DEL SISTEMA</span>
        <Link
          href="/admin/ops"
          className="text-xxs font-terminal text-zinc-500 hover:text-accent transition-colors uppercase tracking-wider"
        >
          ver ops →
        </Link>
      </div>

      <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-5">
        <Stat
          label="Errores ops · 24h"
          value={errCount === null ? null : nf(errCount)}
          tone={errTone}
          sub={errCount === 0 ? 'sin errores' : undefined}
        />
        <Stat
          label="Latencia API · 24h"
          value={avgLatency === null ? null : `${nf(avgLatency)} ms`}
          tone={latTone}
          sub="promedio"
        />
        <Stat
          label="Crons en rojo"
          value={!cronHealthLoaded ? null : nf(cronsRed)}
          tone={cronTone}
          sub={cronHealthLoaded ? `de ${nf(cronsTotal)} workflows` : undefined}
        />
        <Stat
          label="Crons OK"
          value={!cronHealthLoaded ? null : nf(cronsTotal - cronsRed)}
          tone={cronHealthLoaded && cronsTotal - cronsRed > 0 ? 'positive' : 'neutral'}
          sub={cronHealthLoaded ? undefined : 's/d'}
        />
      </div>

      {recentErrors.length > 0 && (
        <div className="border-t border-terminal-border">
          <div className="px-cell py-1 text-xxs font-terminal uppercase tracking-wider text-zinc-600">
            últimos errores
          </div>
          {recentErrors.map((e, i) => (
            <div
              key={i}
              className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2"
            >
              <span className="flex-1 min-w-0 text-data font-terminal text-zinc-300 truncate">
                {e.route ?? '—'}
              </span>
              <span className="w-[44px] flex-shrink-0 text-xxs font-terminal tabular-nums text-negative text-right">
                {e.status_code ?? 'ERR'}
              </span>
            </div>
          ))}
        </div>
      )}

      {worstCrons.length > 0 && (
        <div className="border-t border-terminal-border">
          <div className="px-cell py-1 text-xxs font-terminal uppercase tracking-wider text-zinc-600">
            crons a revisar
          </div>
          {worstCrons.map((c) => (
            <div
              key={c.name}
              className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2"
            >
              <span className="flex-1 min-w-0 text-data font-terminal text-zinc-300 truncate">
                {c.name}
              </span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-terminal text-negative text-right">
                {c.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
