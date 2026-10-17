import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { getCronHealth, type CronHealthRow } from '@/lib/ops'
import { cronEnRojo, CRON_OVERDUE_FACTOR, getAdminPendientes } from '@/lib/admin/pendientes'
import { computeKarma } from '@/lib/karma'
import { AdminPageHeader, AdminSection, KpiRow, KpiCell, AdminEmpty } from '@/components/admin/kit'
import Stat from '@/components/ui/Stat'
import Badge, { type BadgeTone } from '@/components/ui/Badge'
import { OpsRefreshButton } from './OpsRefreshButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'Ops · Admin' }

/**
 * /admin/ops — salud del sistema.
 *
 * El gate de admin lo hace el layout padre (src/app/(terminal)/admin/layout.tsx).
 * `force-dynamic`: los datos se leen en cada request.
 *
 * Orden = lo que el admin necesita saber primero:
 *   1. KPIs de salud (crons en rojo / al día, errores 24 h, latencia)
 *   2. Crons, los rojos arriba, con edad contra el intervalo esperado
 *   3. Errores recientes (#errores — lo enlaza la portada /admin)
 *      (status='probe' queda afuera a propósito: crawlers y requests sin clave)
 *   4. Eventos recientes
 *   5. Visitantes (capa first-party)
 *   6. Uso de Mi Ganado, plegado al final
 */

const TZ = 'America/Argentina/Buenos_Aires'
const D = 86_400_000

interface OpsEventRow {
  id: number
  created_at: string
  event_type: string
  status: string
  route: string | null
  latency_ms: number | null
  status_code: number | null
  request_id: string | null
  metadata: unknown
}

async function fetchRecentEvents(limit: number, errorsOnly = false): Promise<OpsEventRow[]> {
  const admin = createAdminClient()
  let query = admin
    .from('ops_events')
    .select('id, created_at, event_type, status, route, latency_ms, status_code, request_id, metadata')
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

/** Latencias de las últimas 24 h (sin probes): base de p50/p95. `null` = la query falló. */
async function fetchLatencias24h(): Promise<number[] | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ops_events')
    .select('latency_ms')
    .gte('created_at', new Date(Date.now() - D).toISOString())
    .neq('status', 'probe')
    .not('latency_ms', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) {
    console.error('[admin/ops] fetchLatencias24h error:', error.message)
    return null
  }
  return (data ?? []).map((r) => Number(r.latency_ms)).filter((n) => Number.isFinite(n))
}

function percentil(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[i]
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
/*  VISITANTES                                                         */
/* ------------------------------------------------------------------ */

interface VisitorBucket {
  k: string
  n: number
}
interface VisitorRecent {
  ft_landing: string | null
  ft_utm_source: string | null
  ft_ai_engine: string | null
  ft_device: string | null
  visits: number
  pageviews: number
  registered: boolean
  last_seen_at: string
}
interface VisitorStats {
  total: number
  stitched: number
  new_7d: number
  returning: number
  by_engine: VisitorBucket[]
  by_source: VisitorBucket[]
  by_device: VisitorBucket[]
  recent: VisitorRecent[]
}

async function fetchVisitorStats(): Promise<VisitorStats | null> {
  const db = createAdminClient() as unknown as SupabaseClient
  const { data, error } = await db.rpc('visitor_stats')
  if (error || !data) return null
  return data as unknown as VisitorStats
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

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium', timeZone: TZ })
}

function fmtAge(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toFixed(1).replace('.', ',')} h`
  return `${(hours / 24).toFixed(1).replace('.', ',')} d`
}

function fmtInterval(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toLocaleString('es-AR')} h`
  return `${(hours / 24).toLocaleString('es-AR', { maximumFractionDigits: 1 })} d`
}

function shortId(req: string | null): string {
  if (!req) return '—'
  return req.slice(0, 8)
}

/** Edad / intervalo esperado. 1 = justo en su cadencia; > 1,5 = en rojo. Sin corridas = ∞. */
function cronRatio(c: CronHealthRow): number {
  if (c.age_hours === null) return Number.POSITIVE_INFINITY
  return c.expected_interval_hours > 0 ? c.age_hours / c.expected_interval_hours : 0
}

function cronEstado(c: CronHealthRow): { label: string; tone: BadgeTone } {
  if (c.status === 'error') return { label: 'Falló', tone: 'negative' }
  if (c.status === 'timeout') return { label: 'Timeout', tone: 'negative' }
  if (c.age_hours === null) return { label: 'Sin corridas', tone: 'negative' }
  if (cronEnRojo(c)) return { label: 'Atrasado', tone: 'negative' }
  if (c.status === 'running') return { label: 'Corriendo', tone: 'accent' }
  if (cronRatio(c) > 1) return { label: 'Por correr', tone: 'warning' }
  return { label: 'Al día', tone: 'positive' }
}

function eventTone(status: string): BadgeTone {
  if (status === 'ok') return 'positive'
  if (status === 'error') return 'negative'
  if (status === 'timeout') return 'warning'
  if (status === 'running') return 'accent'
  return 'neutral'
}

/** Texto del error: lo que el endpoint dejó en `metadata` (motivo/detalle/message/error). */
function errorMessage(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const m = meta as Record<string, unknown>
  const partes: string[] = []
  for (const k of ['message', 'error', 'motivo', 'reason', 'detalle', 'detail']) {
    const v = m[k]
    if (typeof v === 'string' && v.trim() && !partes.includes(v.trim())) partes.push(v.trim())
  }
  if (partes.length > 0) return partes.join(' · ')
  const keys = Object.keys(m)
  if (keys.length === 0) return null
  const raw = JSON.stringify(m)
  return raw.length > 160 ? raw.slice(0, 157) + '…' : raw
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function AdminOpsPage() {
  const [crons, recentEvents, recentErrors, latencias, pendientes, visitors, ganado] = await Promise.all([
    getCronHealth(),
    fetchRecentEvents(50),
    fetchRecentEvents(20, true),
    fetchLatencias24h(),
    getAdminPendientes(),
    fetchVisitorStats(),
    fetchGanadoTracker(),
  ])

  // Rojos arriba; dentro de cada grupo, el más atrasado contra su cadencia primero.
  const cronsOrdenados = [...crons].sort((a, b) => {
    const ra = cronEnRojo(a) ? 1 : 0
    const rb = cronEnRojo(b) ? 1 : 0
    if (ra !== rb) return rb - ra
    return cronRatio(b) - cronRatio(a)
  })
  const cronsRojo = crons.filter(cronEnRojo).length
  const cronsOk = crons.length - cronsRojo

  const latSorted = latencias ? [...latencias].sort((a, b) => a - b) : null
  const p50 = latSorted ? percentil(latSorted, 50) : null
  const p95 = latSorted ? percentil(latSorted, 95) : null
  const errores24h = pendientes.opsErrores24h

  const ahora = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ })

  return (
    <>
      <AdminPageHeader
        title="Ops"
        meta={ahora}
        description="Salud del sistema: crons, errores y latencia. Lo rojo va primero."
        actions={<OpsRefreshButton />}
      />

      {/* ── KPIs de salud ── */}
      <KpiRow cols={4}>
        <KpiCell>
          <Stat
            label="Crons en rojo"
            value={fmtInt(cronsRojo)}
            tone={cronsRojo > 0 ? 'negative' : 'positive'}
            sub={
              cronsRojo > 0
                ? `fallaron o pasaron ${String(CRON_OVERDUE_FACTOR).replace('.', ',')}× su intervalo`
                : 'todos corrieron en su intervalo'
            }
          />
        </KpiCell>
        <KpiCell>
          <Stat label="Crons al día" value={fmtInt(cronsOk)} sub={`de ${fmtInt(crons.length)} workflows`} />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Errores · 24 h"
            value={errores24h != null ? fmtInt(errores24h) : null}
            tone={errores24h ? 'negative' : 'emphasis'}
            sub={
              <a href="#errores" className="text-accent">
                ver los últimos →
              </a>
            }
          />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Latencia p50 · 24 h"
            value={p50 != null ? `${fmtInt(p50)} ms` : null}
            sub={
              latSorted == null
                ? 'no se pudo leer'
                : p95 != null
                  ? `p95 ${fmtInt(p95)} ms · ${fmtInt(latSorted.length)} requests`
                  : 'sin requests medidos'
            }
          />
        </KpiCell>
      </KpiRow>

      {/* ── Crons ── */}
      <AdminSection
        title="Crons"
        action={
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {crons.length} workflow{crons.length !== 1 ? 's' : ''}
          </span>
        }
        flush
      >
        {crons.length === 0 ? (
          <AdminEmpty>No hay corridas registradas. Los workflows reportan vía POST /api/internal/cron-hook.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Estado</th>
                  <th className="num">Edad / esperado</th>
                  <th className="hidden sm:table-cell w-28">Atraso</th>
                  <th className="hidden md:table-cell">Última corrida</th>
                </tr>
              </thead>
              <tbody>
                {cronsOrdenados.map((row) => {
                  const est = cronEstado(row)
                  const ratio = cronRatio(row)
                  const rojo = cronEnRojo(row)
                  const pct = Number.isFinite(ratio) ? Math.min(100, (ratio / (CRON_OVERDUE_FACTOR * 1.5)) * 100) : 100
                  const umbral = (CRON_OVERDUE_FACTOR / (CRON_OVERDUE_FACTOR * 1.5)) * 100
                  return (
                    <tr key={row.workflow_name}>
                      <td className={`max-w-[16rem] truncate ${rojo ? 'text-ink' : 'text-zinc-300'}`} title={row.workflow_name}>
                        {row.workflow_name}
                      </td>
                      <td>
                        <Badge tone={est.tone}>{est.label}</Badge>
                      </td>
                      <td className="num">
                        <span className={rojo ? 'text-negative' : 'text-zinc-300'}>{fmtAge(row.age_hours)}</span>
                        <span className="text-zinc-500"> / {fmtInterval(row.expected_interval_hours)}</span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div
                          className="relative h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden"
                          title={Number.isFinite(ratio) ? `${ratio.toFixed(2).replace('.', ',')}× su intervalo` : 'sin corridas'}
                        >
                          <div
                            className={`h-full ${rojo ? 'bg-negative' : ratio > 1 ? 'bg-warning' : 'bg-positive'}`}
                            style={{ width: `${pct}%` }}
                          />
                          <div className="absolute inset-y-0 w-px bg-zinc-500" style={{ left: `${umbral}%` }} aria-hidden />
                        </div>
                      </td>
                      <td className="hidden md:table-cell text-xxs text-zinc-500 tabular-nums">{fmtDate(row.last_run_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-panel py-2 text-xxs text-zinc-500 font-terminal border-t border-terminal-border">
          En rojo = falló, nunca corrió o pasó {String(CRON_OVERDUE_FACTOR).replace('.', ',')}× su intervalo esperado (la
          línea en la barra).
        </div>
      </AdminSection>

      {/* ── Errores ── */}
      <AdminSection
        id="errores"
        className="scroll-mt-4"
        title="Errores recientes"
        action={
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {errores24h != null ? `${fmtInt(errores24h)} en 24 h · ` : ''}últimos {recentErrors.length}
          </span>
        }
        flush
      >
        {recentErrors.length === 0 ? (
          <AdminEmpty>
            <span className="text-positive">Sin errores recientes.</span> Los probes (crawlers, requests sin clave) no cuentan.
          </AdminEmpty>
        ) : (
          <ul>
            {recentErrors.map((ev) => {
              const msg = errorMessage(ev.metadata)
              return (
                <li key={ev.id} className="px-panel py-2 border-b border-terminal-border last:border-b-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-terminal">
                    <span className="text-data text-negative tabular-nums">{ev.status_code ?? '—'}</span>
                    <span className="text-data text-ink break-all min-w-0 flex-1">{ev.route ?? '—'}</span>
                    <span className="text-xxs text-zinc-500 tabular-nums whitespace-nowrap">{fmtDate(ev.created_at)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-xxs font-terminal text-zinc-500">
                    <span>{ev.event_type}</span>
                    {ev.latency_ms !== null && <span className="tabular-nums">{fmtInt(ev.latency_ms)} ms</span>}
                    <span className="tabular-nums">req {shortId(ev.request_id)}</span>
                  </div>
                  {msg && <p className="mt-1 text-xxs font-terminal text-zinc-400 break-words">{msg}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>

      {/* ── Eventos recientes ── */}
      <AdminSection
        title="Eventos recientes"
        action={<span className="text-xxs text-zinc-500 font-terminal tabular-nums">últimos {recentEvents.length}</span>}
        flush
      >
        {recentEvents.length === 0 ? (
          <AdminEmpty>
            Sin eventos registrados. Aparecen apenas algún endpoint instrumentado recibe tráfico.
          </AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th className="hidden sm:table-cell">Tipo</th>
                  <th>Estado</th>
                  <th>Ruta</th>
                  <th className="num">Latencia</th>
                  <th className="num hidden sm:table-cell">Código</th>
                  <th className="hidden md:table-cell">Req</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="text-xxs text-zinc-500 tabular-nums">{fmtDate(ev.created_at)}</td>
                    <td className="hidden sm:table-cell text-xxs text-zinc-400">{ev.event_type}</td>
                    <td>
                      <Badge tone={eventTone(ev.status)}>{ev.status}</Badge>
                    </td>
                    <td className="max-w-[18rem] truncate text-zinc-300" title={ev.route ?? undefined}>
                      {ev.route ?? '—'}
                    </td>
                    <td className="num text-zinc-400">{ev.latency_ms !== null ? `${ev.latency_ms} ms` : '—'}</td>
                    <td className="num hidden sm:table-cell text-zinc-400">{ev.status_code ?? '—'}</td>
                    <td className="hidden md:table-cell text-xxs text-zinc-500 tabular-nums">{shortId(ev.request_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* ── Visitantes ── */}
      <AdminSection
        title="Visitantes · capa first-party"
        action={
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {visitors ? `${fmtInt(visitors.total)} visitante${visitors.total !== 1 ? 's' : ''}` : 'sin datos'}
          </span>
        }
        flush
      >
        {!visitors || visitors.total === 0 ? (
          <AdminEmpty>Todavía no hay visitantes registrados.</AdminEmpty>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border border-b border-terminal-border">
              {[
                { l: 'Total', v: visitors.total },
                { l: 'Registrados', v: visitors.stitched },
                { l: 'Nuevos · 7 d', v: visitors.new_7d },
                { l: 'Recurrentes', v: visitors.returning },
              ].map((s) => (
                <div key={s.l} className="bg-terminal-panel px-panel py-3">
                  <Stat label={s.l} value={fmtInt(s.v)} size="text-lg" />
                </div>
              ))}
            </div>

            <div className="px-panel py-2.5 border-b border-terminal-border space-y-1.5">
              {(
                [
                  ['Motor de IA', visitors.by_engine],
                  ['Fuente', visitors.by_source],
                  ['Dispositivo', visitors.by_device],
                ] as [string, VisitorBucket[]][]
              ).map(([title, buckets]) => (
                <div key={title} className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xxs text-zinc-500 font-terminal w-[84px] flex-shrink-0">{title}</span>
                  {buckets.length === 0 ? (
                    <span className="text-xxs text-zinc-500 font-terminal">—</span>
                  ) : (
                    buckets.map((b) => (
                      <Badge key={b.k} className="max-w-[220px] truncate normal-case tracking-normal">
                        {b.k} · <span className="tabular-nums text-ink">{b.n}</span>
                      </Badge>
                    ))
                  )}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Landing</th>
                    <th>Origen</th>
                    <th className="hidden sm:table-cell">Dispositivo</th>
                    <th className="num">Visitas / PV</th>
                    <th className="hidden sm:table-cell text-center">Cuenta</th>
                    <th className="hidden md:table-cell">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.recent.map((v, i) => (
                    <tr key={i}>
                      <td className="max-w-[16rem] truncate text-zinc-300" title={v.ft_landing ?? undefined}>
                        {v.ft_landing || '—'}
                      </td>
                      <td className="max-w-[10rem] truncate text-zinc-400">{v.ft_ai_engine || v.ft_utm_source || 'directo'}</td>
                      <td className="hidden sm:table-cell text-zinc-500">{v.ft_device || '?'}</td>
                      <td className="num text-zinc-400">
                        {v.visits}/{v.pageviews}
                      </td>
                      <td className="hidden sm:table-cell text-center">
                        {v.registered ? (
                          <span className="text-accent" title="Registrado">●</span>
                        ) : (
                          <span className="text-zinc-500" title="Anónimo">○</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-xxs text-zinc-500 tabular-nums">{fmtDate(v.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminSection>

      {/* ── Mi Ganado (plegado) ── */}
      <details className="terminal-panel group">
        <summary className="terminal-panel-header flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
            Uso de Mi Ganado
          </span>
          <span className="normal-case tracking-normal text-xxs text-zinc-500 font-terminal tabular-nums">
            {ganado.users} usuario{ganado.users !== 1 ? 's' : ''} · {fmtInt(ganado.totalCabezas)} cab ·{' '}
            {fmtArsShort(ganado.totalValueArs)}
          </span>
        </summary>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border border-b border-terminal-border">
          {[
            { l: 'Usuarios', v: fmtInt(ganado.users) },
            { l: 'Cabezas', v: fmtInt(ganado.totalCabezas) },
            { l: 'Kilos', v: fmtInt(ganado.totalKilos) },
            { l: 'Valor cargado', v: fmtArsShort(ganado.totalValueArs) },
          ].map((s) => (
            <div key={s.l} className="bg-terminal-panel px-panel py-3">
              <Stat label={s.l} value={s.v} size="text-lg" />
            </div>
          ))}
        </div>

        {ganado.byCategoria.length > 0 && (
          <div className="px-panel py-2 flex flex-wrap gap-1.5 border-b border-terminal-border">
            {ganado.byCategoria.map((c) => (
              <Badge key={c.categoria} className="normal-case tracking-normal">
                {c.categoria} · <span className="tabular-nums text-ink">{fmtInt(c.cabezas)}</span>
              </Badge>
            ))}
          </div>
        )}

        {ganado.rows.length === 0 ? (
          <AdminEmpty>Nadie cargó hacienda todavía.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th className="num">Cabezas</th>
                  <th className="num">Valor</th>
                  <th className="hidden sm:table-cell">Karma</th>
                  <th className="hidden md:table-cell num" title="Remates a los que fue · remates que sigue">
                    Fue / sigue
                  </th>
                  <th className="hidden lg:table-cell">Categorías</th>
                  <th className="hidden md:table-cell text-center">Alertas</th>
                  <th className="hidden md:table-cell">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {ganado.rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="text-xxs text-zinc-400 tabular-nums">{r.userId.slice(0, 8)}</td>
                    <td className="num text-zinc-300">{fmtInt(r.cabezas)}</td>
                    <td className="num text-zinc-300">{fmtArsShort(r.valueArs)}</td>
                    <td className="hidden sm:table-cell text-xxs">
                      <span className="text-positive">{r.karmaLevel}</span>
                      <span className="text-zinc-500 tabular-nums"> · {r.karmaScore}</span>
                    </td>
                    <td className="hidden md:table-cell num text-xxs text-zinc-400">
                      {r.attended} / {r.following}
                    </td>
                    <td className="hidden lg:table-cell max-w-[14rem] truncate text-xxs text-zinc-500">
                      {r.categorias.join(', ') || '—'}
                    </td>
                    <td className="hidden md:table-cell text-center text-xxs">
                      {r.alertsOptIn ? <span className="text-positive">sí</span> : <span className="text-zinc-500">—</span>}
                    </td>
                    <td className="hidden md:table-cell text-xxs text-zinc-500 tabular-nums">{fmtDate(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </>
  )
}
