import Link from 'next/link'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import LiveActivityFeed from '@/components/admin/LiveActivityFeed'
import AutoRefresh from '@/components/admin/AutoRefresh'
import WeeklyTrafficCard from '@/components/admin/WeeklyTrafficCard'
import ConversionRevenueCard from '@/components/admin/ConversionRevenueCard'
import DataHealthCard from '@/components/admin/DataHealthCard'
import ModerationQueueCard from '@/components/admin/ModerationQueueCard'
import OutreachActivityCard from '@/components/admin/OutreachActivityCard'
import SystemHealthCard from '@/components/admin/SystemHealthCard'
import { getLivePayload, getViewsByHour } from '@/lib/admin/live'
import { getFeaturedSlugs } from '@/lib/featured'
import { getCronHealth } from '@/lib/ops'
import { createServiceClient } from '@/lib/supabase'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import frigoSummary from '@/lib/data/frigorificos-summary.json'
import type { Auction } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /admin/overview — el panel "de TODO", con foco en el comportamiento EN VIVO
 * de los usuarios. Admin gate heredado del layout padre.
 *
 * Orden (lo más importante arriba):
 *   1. <LiveActivityFeed/> — vistas de perfil en tiempo real (pollea /api/admin/live)
 *   2. KPIs — vistas 5m/1h/24h, newsletter, PRO, remates, frigos, errores ops, crons
 *   3. Comportamiento 24h — top perfiles, split tipo, sparkline por hora
 *
 * Todo first-party: profile_views, newsletter_subscribers, ops_events, cron_runs.
 * No GA4 server-side.
 */

const nf = (n: number) => n.toLocaleString('es-AR')

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

interface NewsletterAgg {
  total: number
  new7d: number
  bySource: Array<{ source: string; count: number }>
}

async function getNewsletterAgg(): Promise<NewsletterAgg> {
  const empty: NewsletterAgg = { total: 0, new7d: 0, bySource: [] }
  const supabase = createServiceClient()
  if (!supabase) return empty

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('source, subscribed_at')
    .eq('status', 'active')
    .limit(50000)

  if (error || !data) return empty

  const rows = data as { source: string | null; subscribed_at: string | null }[]
  const bySourceMap = new Map<string, number>()
  let new7d = 0
  for (const r of rows) {
    const src = r.source || 'desconocido'
    bySourceMap.set(src, (bySourceMap.get(src) || 0) + 1)
    if (r.subscribed_at && r.subscribed_at >= since7d) new7d++
  }
  const bySource = Array.from(bySourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return { total: rows.length, new7d, bySource }
}

async function getOpsErrors24h(): Promise<number> {
  const supabase = createServiceClient()
  if (!supabase) return 0
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const { count, error } = await supabase
    .from('ops_events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error')
    .gte('created_at', since)
  if (error) return 0
  return count || 0
}

function getUpcomingRemates(): number {
  const today = new Date().toISOString().slice(0, 10)
  return (rematesData as Auction[]).filter((r) => r.date >= today).length
}

/* ------------------------------------------------------------------ */
/*  SPARKLINE (server, inline SVG-free bars)                           */
/* ------------------------------------------------------------------ */

function HourlySparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets)
  return (
    <div className="flex items-end gap-px h-16" aria-hidden>
      {buckets.map((v, i) => {
        const pct = Math.round((v / max) * 100)
        const recent = i >= 22 // últimas ~2h destacadas
        return (
          <div
            key={i}
            className="flex-1 rounded-t-[1px]"
            style={{
              height: `${Math.max(v > 0 ? 6 : 1, pct)}%`,
              backgroundColor: recent ? '#10b981' : '#3f3f46',
            }}
            title={`hace ${23 - i}h: ${v} vista${v === 1 ? '' : 's'}`}
          />
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function AdminOverviewPage() {
  const [live, viewsByHour, newsletter, featured, crons, opsErrors24h] = await Promise.all([
    getLivePayload(30),
    getViewsByHour(),
    getNewsletterAgg(),
    getFeaturedSlugs(),
    getCronHealth(),
    getOpsErrors24h(),
  ])

  const upcomingRemates = getUpcomingRemates()
  const consignatariasCount = getAllProfiles().length
  const frigosCount = (frigoSummary as { total?: number }).total ?? 0

  // Split tipo (24h) desde topProfiles + counts.
  const consigViews = live.topProfiles
    .filter((p) => p.type === 'consignataria')
    .reduce((a, p) => a + p.count, 0)
  const frigoViews = live.topProfiles
    .filter((p) => p.type === 'frigorifico')
    .reduce((a, p) => a + p.count, 0)
  // Estos son los del top-8; el split exacto del total lo aproximamos con esos.
  const splitTotal = consigViews + frigoViews
  const consigPct = splitTotal > 0 ? Math.round((consigViews / splitTotal) * 100) : 0

  // Crons: ordenados por edad ya viene de getCronHealth (never-run y viejos primero).
  // Para "última corrida de cada cron" mostramos los que SÍ corrieron, recientes primero.
  const ranCrons = crons
    .filter((c) => c.last_run_at !== null)
    .sort((a, b) => (a.age_hours ?? 0) - (b.age_hours ?? 0))
    .slice(0, 8)

  const fmtAge = (h: number | null) => {
    if (h === null) return '—'
    if (h < 1) return `${Math.round(h * 60)}m`
    if (h < 48) return `${h.toFixed(1)}h`
    return `${(h / 24).toFixed(1)}d`
  }
  const cronStatusTone = (s: string | null) =>
    s === 'ok' ? 'text-positive' : s === 'error' ? 'text-negative' : s === 'running' ? 'text-accent' : 'text-warning'

  return (
    <div className="space-y-0">
      <AutoRefresh />
      {/* HEADER --------------------------------------------------- */}
      <div className="terminal-panel mb-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 text-label tracking-widest">OVERVIEW</span>
            <span className="text-terminal-border">—</span>
            <span className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">
              todo, en vivo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xxs text-zinc-500 font-terminal uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-positive opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
              </span>
              Actualiza solo cada 45s
            </span>
            <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
              {new Date().toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* 1 ── LIVE FEED (lo más importante) ----------------------- */}
      <LiveActivityFeed initial={live} />

      {/* 2 ── KPIs ------------------------------------------------ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header">
          <span className="text-zinc-400 text-xxs tracking-widest">INDICADORES</span>
        </div>
        <div className="terminal-panel-body grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-5">
          <Stat label="Vistas · 5 min" value={nf(live.counts.v5m)} tone="live" />
          <Stat label="Vistas · 1 h" value={nf(live.counts.v1h)} />
          <Stat label="Vistas · 24 h" value={nf(live.counts.v24h)} />
          <Stat
            label="Newsletter"
            value={nf(newsletter.total)}
            sub={`+${nf(newsletter.new7d)} en 7 días`}
          />
          <Stat label="Firmas PRO" value={nf(featured.size)} sub="destacadas + suscriptas" />
          <Stat label="Remates próximos" value={nf(upcomingRemates)} />
          <Stat label="Frigoríficos" value={nf(frigosCount)} />
          <Stat
            label="Errores ops · 24 h"
            value={nf(opsErrors24h)}
            tone={opsErrors24h > 0 ? 'negative' : 'positive'}
          />
        </div>

        {/* Newsletter por source (si hay) */}
        {newsletter.bySource.length > 0 && (
          <div className="terminal-panel-body border-t border-terminal-border flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xxs text-zinc-600 font-terminal uppercase tracking-wider">Newsletter por origen</span>
            {newsletter.bySource.slice(0, 6).map((s) => (
              <span key={s.source} className="text-xxs font-terminal text-zinc-400 tabular-nums">
                {s.source} <span className="text-zinc-200">{nf(s.count)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3 ── COMPORTAMIENTO 24h ---------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px mt-px">
        {/* Top perfiles */}
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-400 text-xxs tracking-widest">TOP PERFILES · 24H</span>
            <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
              {live.topProfiles.length}
            </span>
          </div>
          {live.topProfiles.length === 0 ? (
            <div className="px-panel py-6 text-center">
              <span className="text-zinc-500 text-data font-terminal">Sin vistas en 24h</span>
            </div>
          ) : (
            live.topProfiles.map((p) => (
              <div key={`${p.type}:${p.slug}`} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2">
                <Badge tone={p.type === 'frigorifico' ? 'warning' : 'accent'}>
                  {p.type === 'frigorifico' ? 'FRIG' : 'CONS'}
                </Badge>
                <Link
                  href={p.href}
                  className="flex-1 min-w-0 text-data font-terminal text-zinc-200 hover:text-accent transition-colors truncate"
                  title={p.name}
                >
                  {p.name}
                </Link>
                <span className="text-data font-terminal tabular-nums text-zinc-300">{nf(p.count)}</span>
              </div>
            ))
          )}
        </div>

        {/* Split + sparkline */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">VISTAS POR HORA · 24H</span>
          </div>
          <div className="terminal-panel-body space-y-4">
            <HourlySparkline buckets={viewsByHour} />
            <div className="flex items-center justify-between text-xxs font-terminal text-zinc-600">
              <span>hace 24h</span>
              <span>ahora</span>
            </div>

            {/* Split consignataria vs frigorífico (top-8) */}
            <div>
              <div className="flex items-center justify-between text-xxs font-terminal mb-1">
                <span className="text-accent">Consignatarias {consigPct}%</span>
                <span className="text-warning">Frigoríficos {100 - consigPct}%</span>
              </div>
              <div className="h-2 w-full rounded-[2px] overflow-hidden bg-zinc-800 flex">
                <div className="h-full bg-accent" style={{ width: `${consigPct}%` }} />
                <div className="h-full bg-warning" style={{ width: `${100 - consigPct}%` }} />
              </div>
              <div className="text-xxs text-zinc-600 font-terminal mt-1 tabular-nums">
                {nf(consigViews)} vs {nf(frigoViews)} vistas (top perfiles) · {nf(consignatariasCount)} consignatarias en catálogo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 ── CRONS ----------------------------------------------- */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">ÚLTIMA CORRIDA DE CRONS</span>
          <Link href="/admin/ops" className="text-xxs font-terminal text-zinc-500 hover:text-accent transition-colors uppercase tracking-wider">
            ver ops →
          </Link>
        </div>
        {ranCrons.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-zinc-500 text-data font-terminal">Sin corridas registradas</span>
          </div>
        ) : (
          ranCrons.map((c) => (
            <div key={c.workflow_name} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2">
              <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate">{c.workflow_name}</span>
              <span className="w-[70px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500 text-right">
                {fmtAge(c.age_hours)}
              </span>
              <span className={`w-[80px] flex-shrink-0 text-xxs font-terminal text-center ${cronStatusTone(c.status)}`}>
                {c.status ? c.status.toUpperCase() : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 5 ── GOD GRID (cards self-contained) --------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-px mt-px">
        <WeeklyTrafficCard />
        <ConversionRevenueCard />
        <DataHealthCard />
        <ModerationQueueCard />
        <OutreachActivityCard />
        <SystemHealthCard />
      </div>
    </div>
  )
}
