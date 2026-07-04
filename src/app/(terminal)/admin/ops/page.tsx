import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { getCronHealth, type CronHealthRow } from '@/lib/ops'
import { computeKarma } from '@/lib/karma'
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
/*  MI GANADO — hacienda cargada por los usuarios (valor que aportan)  */
/* ------------------------------------------------------------------ */

interface GanadoUserRow {
  userId: string
  cabezas: number
  kilos: number
  valueArs: number
  categorias: string[]
  updatedAt: string
  alertsOptIn: boolean
  attended: number
  following: number
  karmaScore: number
  karmaLevel: string
}
interface GanadoTracker {
  users: number
  totalCabezas: number
  totalKilos: number
  totalValueArs: number
  byCategoria: Array<{ categoria: string; cabezas: number }>
  rows: GanadoUserRow[]
}

async function fetchGanadoTracker(): Promise<GanadoTracker> {
  const empty: GanadoTracker = { users: 0, totalCabezas: 0, totalKilos: 0, totalValueArs: 0, byCategoria: [], rows: [] }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_ganado')
    .select('user_id, items, last_seen_value_ars, updated_at, created_at, alerts_opt_in')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[admin/ops] fetchGanadoTracker error:', error.message)
    return empty
  }
  // Marcas por usuario (remate_marks aún no está en los tipos → cliente sin tipar).
  const marksByUser = new Map<string, { attended: number; following: number }>()
  const { data: marks } = await (createAdminClient() as unknown as SupabaseClient)
    .from('remate_marks')
    .select('user_id, mark_type')
  for (const m of (marks ?? []) as Array<{ user_id: string; mark_type: string }>) {
    const cur = marksByUser.get(m.user_id) ?? { attended: 0, following: 0 }
    if (m.mark_type === 'attended') cur.attended++
    else if (m.mark_type === 'following') cur.following++
    marksByUser.set(m.user_id, cur)
  }
  const now = Date.now()
  const catMap = new Map<string, number>()
  const rows: GanadoUserRow[] = (data ?? []).map((r) => {
    const items = (Array.isArray(r.items) ? r.items : []) as Array<{ categoria?: string; cabezas?: number; peso?: number }>
    let cabezas = 0, kilos = 0
    const cats = new Set<string>()
    for (const it of items) {
      const c = Number(it.cabezas) || 0
      cabezas += c
      kilos += c * (Number(it.peso) || 0)
      if (it.categoria) {
        cats.add(it.categoria)
        catMap.set(it.categoria, (catMap.get(it.categoria) ?? 0) + c)
      }
    }
    const marks = marksByUser.get(r.user_id as string) ?? { attended: 0, following: 0 }
    const tenureMonths = r.created_at ? (now - new Date(r.created_at as string).getTime()) / (1000 * 60 * 60 * 24 * 30) : 0
    const karma = computeKarma({ cabezas, attended: marks.attended, following: marks.following, tenureMonths })
    return {
      userId: r.user_id as string,
      cabezas,
      kilos,
      valueArs: Number(r.last_seen_value_ars) || 0,
      categorias: [...cats],
      updatedAt: r.updated_at as string,
      alertsOptIn: !!r.alerts_opt_in,
      attended: marks.attended,
      following: marks.following,
      karmaScore: karma.score,
      karmaLevel: karma.level,
    }
  })
  return {
    users: rows.length,
    totalCabezas: rows.reduce((s, r) => s + r.cabezas, 0),
    totalKilos: rows.reduce((s, r) => s + r.kilos, 0),
    totalValueArs: rows.reduce((s, r) => s + r.valueArs, 0),
    byCategoria: [...catMap.entries()].map(([categoria, cabezas]) => ({ categoria, cabezas })).sort((a, b) => b.cabezas - a.cabezas),
    rows,
  }
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('es-AR')
}
function fmtArsShort(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + Math.round(n)
}

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
  const [crons, recentEvents, recentErrors, ganado] = await Promise.all([
    getCronHealth(),
    fetchRecentEvents(50),
    fetchRecentEvents(20, true),
    fetchGanadoTracker(),
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
      {/*  MI GANADO — hacienda cargada por los usuarios                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">MI GANADO — HACIENDA CARGADA</span>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {ganado.users} usuario{ganado.users !== 1 ? 's' : ''} · {fmtInt(ganado.totalCabezas)} cab
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border">
          <Stat label="Usuarios" value={fmtInt(ganado.users)} />
          <Stat label="Cabezas" value={fmtInt(ganado.totalCabezas)} />
          <Stat label="Kilos" value={fmtInt(ganado.totalKilos)} />
          <Stat label="Valor cargado" value={fmtArsShort(ganado.totalValueArs)} accent />
        </div>

        {ganado.byCategoria.length > 0 && (
          <div className="px-panel py-2 flex flex-wrap gap-1.5 border-b border-terminal-border">
            {ganado.byCategoria.map((c) => (
              <span key={c.categoria} className="text-xxs font-terminal text-zinc-400 border border-terminal-border rounded px-2 py-0.5">
                {c.categoria} · <span className="tabular-nums text-zinc-200">{fmtInt(c.cabezas)}</span>
              </span>
            ))}
          </div>
        )}

        {ganado.rows.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-zinc-500 text-data font-terminal">Nadie cargó hacienda todavía</span>
          </div>
        ) : (
          <>
            <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
              <span className="w-[90px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Usuario</span>
              <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Cabezas</span>
              <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Valor</span>
              <span className="w-[120px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Karma</span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Marcas</span>
              <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Categorías</span>
              <span className="w-[50px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Alert</span>
              <span className="w-[130px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Actualizado</span>
            </div>
            {ganado.rows.map((r) => (
              <div key={r.userId} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-0">
                <span className="w-[90px] flex-shrink-0 text-xxs font-terminal text-zinc-400 tabular-nums">{r.userId.slice(0, 8)}</span>
                <span className="w-[70px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-200 text-right">{fmtInt(r.cabezas)}</span>
                <span className="w-[70px] flex-shrink-0 text-xxs font-terminal tabular-nums text-accent text-right">{fmtArsShort(r.valueArs)}</span>
                <span className="w-[120px] flex-shrink-0 text-xxs font-terminal text-emerald-300">
                  {r.karmaLevel} <span className="text-zinc-500 tabular-nums">· {r.karmaScore}</span>
                </span>
                <span className="w-[80px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-400 text-center">
                  {r.attended}🏷 · {r.following}★
                </span>
                <span className="flex-1 text-xxs font-terminal text-zinc-500 truncate">{r.categorias.join(', ') || '—'}</span>
                <span className="w-[50px] flex-shrink-0 text-center text-xxs font-terminal">
                  {r.alertsOptIn ? <span className="text-positive">on</span> : <span className="text-zinc-600">—</span>}
                </span>
                <span className="w-[130px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">{fmtDate(r.updatedAt)}</span>
              </div>
            ))}
          </>
        )}
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-terminal-panel px-cell py-3">
      <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-lg font-terminal tabular-nums ${accent ? 'text-accent' : 'text-zinc-100'}`}>{value}</div>
    </div>
  )
}
