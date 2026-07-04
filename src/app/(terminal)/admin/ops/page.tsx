import { createAdminClient } from '@/lib/supabase-server'
import { getCronHealth, type CronHealthRow } from '@/lib/ops'
import { OpsRefreshButton } from './OpsRefreshButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /admin/ops — v1.14 observability dashboard.
 *
 * Admin gate is enforced by the parent layout
 * (src/app/(terminal)/admin/layout.tsx), so this page can assume the viewer
 * is admin. We still server-render with `force-dynamic` so the data is fresh
 * on every request.
 *
 * Sections:
 *   - Crons: per-workflow last_run_at, age, status (from getCronHealth())
 *   - Recent events: last 50 ops_events rows
 *   - Recent errors: last 20 ops_events rows where status='error'
 *
 * No charts, no alerting (v1.15). Just flat tables.
 */

interface OpsEventRow {
  id: number
  created_at: string
  event_type: string
  status: string
  route: string | null
  latency_ms: number | null
  status_code: number | null
  request_id: string | null
}

async function fetchRecentEvents(limit: number, errorsOnly = false): Promise<OpsEventRow[]> {
  const admin = createAdminClient()
  let query = admin
    .from('ops_events')
    .select('id, created_at, event_type, status, route, latency_ms, status_code, request_id')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (errorsOnly) query = query.eq('status', 'error')
  const { data, error } = await query
  if (error) {
    console.error('[admin/ops] fetchRecentEvents error:', error.message)
    return []
  }
  return (data ?? []) as OpsEventRow[]
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function ageColor(row: CronHealthRow): string {
  if (row.age_hours === null) return 'text-zinc-500'
  // Red if more than ~1 expected interval overdue (interval + 25%).
  // Yellow if more than half the expected interval.
  const overdue = row.expected_interval_hours * 1.25
  const stale = row.expected_interval_hours * 0.5
  if (row.age_hours > overdue) return 'text-negative'
  if (row.age_hours > stale) return 'text-warning'
  return 'text-positive'
}

function statusColor(status: string | null): string {
  if (status === 'ok') return 'text-positive'
  if (status === 'error') return 'text-negative'
  if (status === 'timeout') return 'text-warning'
  if (status === 'running') return 'text-accent'
  return 'text-zinc-500'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' })
}

function fmtAge(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

function shortId(req: string | null): string {
  if (!req) return '—'
  return req.slice(0, 8)
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function AdminOpsPage() {
  const [crons, recentEvents, recentErrors] = await Promise.all([
    getCronHealth(),
    fetchRecentEvents(50),
    fetchRecentEvents(20, true),
  ])

  return (
    <div className="space-y-0">
      {/* HEADER */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 text-label tracking-widest">OPS</span>
            <span className="text-terminal-border">—</span>
            <span className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">
              Observabilidad v1.14
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
              {new Date().toLocaleString('es-AR')}
            </span>
            <OpsRefreshButton />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CRONS                                                        */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">CRONS</span>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {crons.length} workflow{crons.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Workflow</span>
          <span className="w-[180px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Last run</span>
          <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Edad</span>
          <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Esperado</span>
          <span className="w-[90px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Estado</span>
        </div>

        {crons.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-zinc-500 text-data font-terminal">No hay registros de crons aún</span>
          </div>
        ) : (
          crons.map((row) => (
            <div key={row.workflow_name} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-0">
              <span className="flex-1 text-data font-terminal text-zinc-200 truncate">{row.workflow_name}</span>
              <span className="w-[180px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                {fmtDate(row.last_run_at)}
              </span>
              <span className={`w-[80px] flex-shrink-0 text-xxs font-terminal tabular-nums text-right ${ageColor(row)}`}>
                {fmtAge(row.age_hours)}
              </span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500 text-right">
                {row.expected_interval_hours}h
              </span>
              <span className={`w-[90px] flex-shrink-0 text-center text-xxs font-terminal ${statusColor(row.status)}`}>
                {row.status ? row.status.toUpperCase() : '—'}
              </span>
            </div>
          ))
        )}

        <div className="px-panel py-2 text-xxs text-zinc-600 font-terminal">
          Crons se reportan vía POST /api/internal/cron-hook (no cableado a workflows aún — v1.15).
        </div>
      </div>

      {/* ============================================================ */}
      {/*  RECENT EVENTS                                                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">RECENT EVENTS</span>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            últimos {recentEvents.length}
          </span>
        </div>

        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[160px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Timestamp</span>
          <span className="w-[110px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipo</span>
          <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Estado</span>
          <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Route</span>
          <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Latency</span>
          <span className="w-[50px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Code</span>
          <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Req</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-zinc-500 text-data font-terminal">Sin eventos registrados aún</span>
            <p className="text-xxs text-zinc-600 font-terminal mt-1">
              Los eventos aparecen acá apenas algún endpoint instrumentado reciba tráfico.
            </p>
          </div>
        ) : (
          recentEvents.map((ev) => (
            <div key={ev.id} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-0">
              <span className="w-[160px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                {fmtDate(ev.created_at)}
              </span>
              <span className="w-[110px] flex-shrink-0 text-xxs font-terminal text-zinc-400">{ev.event_type}</span>
              <span className={`w-[70px] flex-shrink-0 text-xxs font-terminal ${statusColor(ev.status)}`}>
                {ev.status}
              </span>
              <span className="flex-1 text-xxs font-terminal text-zinc-300 truncate">{ev.route ?? '—'}</span>
              <span className="w-[70px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-400 text-right">
                {ev.latency_ms !== null ? `${ev.latency_ms}ms` : '—'}
              </span>
              <span className="w-[50px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-400 text-right">
                {ev.status_code ?? '—'}
              </span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                {shortId(ev.request_id)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ============================================================ */}
      {/*  RECENT ERRORS                                                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">RECENT ERRORS</span>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            últimos {recentErrors.length}
          </span>
        </div>

        {recentErrors.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-positive text-data font-terminal">Sin errores recientes</span>
          </div>
        ) : (
          <>
            <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
              <span className="w-[160px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Timestamp</span>
              <span className="w-[110px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipo</span>
              <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Route</span>
              <span className="w-[50px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Code</span>
              <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Latency</span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Req</span>
            </div>
            {recentErrors.map((ev) => (
              <div key={ev.id} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-0">
                <span className="w-[160px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                  {fmtDate(ev.created_at)}
                </span>
                <span className="w-[110px] flex-shrink-0 text-xxs font-terminal text-zinc-400">{ev.event_type}</span>
                <span className="flex-1 text-xxs font-terminal text-negative truncate">{ev.route ?? '—'}</span>
                <span className="w-[50px] flex-shrink-0 text-xxs font-terminal tabular-nums text-negative text-right">
                  {ev.status_code ?? '—'}
                </span>
                <span className="w-[70px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-400 text-right">
                  {ev.latency_ms !== null ? `${ev.latency_ms}ms` : '—'}
                </span>
                <span className="w-[80px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                  {shortId(ev.request_id)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
