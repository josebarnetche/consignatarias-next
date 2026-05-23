'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface DashboardData {
  revenue: {
    mrr: number
    mrrFormatted: string
    paidSubscriptions: number
    bonifiedSubscriptions: number
    totalPro: number
    allSubscriptions: number
    proRate: number
    breakdown: {
      b2bMrr: number
      proUserMrr: number
      apiMrr: number
    }
    proUserCount: number
    apiByTier: Record<string, number>
    internalSubs: number
  }
  claims: {
    consignatarias: { pending: number; approved: number; rejected: number; total: number }
    frigorificos: { pending: number; approved: number; rejected: number; total: number }
    recentConsignatarias: RecentClaim[]
    recentFrigorificos: RecentFrigoClaim[]
  }
  profiles: {
    totalConsignatarias: number
    verifiedConsignatarias: number
    adminFeatured: number
    verificationRate: number
  }
  engagement: {
    totalViews: number
    views30d: number
    views7d: number
    topViewed: { entity_slug: string; view_count: number }[]
  }
  users: {
    total: number
    admins: number
    owners: number
  }
  subscriptions: {
    entityType: string
    entitySlug: string
    planName: string
    status: string
    periodEnd: string | null
    createdAt: string
  }[]
}

interface RecentClaim {
  id: string
  consignataria_slug: string
  claimant_email: string
  claimant_name: string | null
  status: string
  created_at: string
  consignatarias: { display_name: string } | null
}

interface RecentFrigoClaim {
  id: string
  frigorifico_name: string
  claimant_email: string
  claimant_name: string | null
  status: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  KPI CARD                                                           */
/* ------------------------------------------------------------------ */

function KPICard({
  label,
  value,
  sub,
  color = 'text-zinc-200',
  trend,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="terminal-panel flex-1 min-w-[140px]">
      <div className="px-3 py-3 space-y-1">
        <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">{label}</div>
        <div className={`text-xl font-terminal tabular-nums font-bold ${color}`}>
          {value}
          {trend === 'up' && <span className="text-positive text-xs ml-1">&#9650;</span>}
          {trend === 'down' && <span className="text-negative text-xs ml-1">&#9660;</span>}
        </div>
        {sub && <div className="text-xxs text-zinc-500 font-terminal">{sub}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MINI BAR (horizontal fill bar)                                     */
/* ------------------------------------------------------------------ */

function MiniBar({ value, max, color = 'bg-accent' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="gradient-bar w-full">
      <div className={`h-full rounded-terminal ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  STATUS DOT                                                         */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: string }) {
  const cls = status === 'pending' ? 'bg-warning' :
    status === 'approved' || status === 'active' ? 'bg-positive' :
    status === 'rejected' || status === 'cancelled' ? 'bg-negative' :
    'bg-zinc-500'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />
}

/* ------------------------------------------------------------------ */
/*  MAIN DASHBOARD                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchDashboard() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/dashboard')
      if (r.status === 401 || r.status === 403) {
        window.location.href = '/login'
        return
      }
      const d = await r.json()
      setData(d)
    } catch {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="terminal-panel">
        <div className="px-panel py-16 flex flex-col items-center justify-center gap-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-10 h-10 border-2 border-terminal-border rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-zinc-500 text-data font-terminal">Cargando dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="terminal-panel">
        <div className="px-panel py-12 flex flex-col items-center justify-center gap-4">
          {/* Error icon */}
          <div className="w-12 h-12 rounded-full border-2 border-negative/30 flex items-center justify-center">
            <span className="text-negative text-xl">⚠</span>
          </div>
          <span className="text-negative text-data font-terminal">{error || 'Error al cargar datos'}</span>
          <p className="text-xxs text-zinc-500 font-terminal text-center max-w-xs">
            Verificá tu conexión o intentá de nuevo
          </p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const pendingTotal = data.claims.consignatarias.pending + data.claims.frigorificos.pending

  return (
    <div className="space-y-0">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 text-label tracking-widest">DASHBOARD</span>
            <span className="text-terminal-border">&mdash;</span>
            <span className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">KPIs &amp; Analytics</span>
          </div>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
            {new Date().toLocaleDateString('es-AR')}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  REVENUE KPIs                                                 */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header">
          <span className="text-zinc-400 text-xxs tracking-widest">REVENUE</span>
        </div>
        <div className="px-3 py-3 flex flex-wrap gap-px">
          <KPICard
            label="MRR"
            value={data.revenue.mrrFormatted}
            sub="ARS / mes"
            color={data.revenue.mrr > 0 ? 'text-positive' : 'text-zinc-500'}
          />
          <KPICard
            label="PRO total"
            value={data.revenue.totalPro}
            sub={`${data.revenue.paidSubscriptions} pagas · ${data.revenue.bonifiedSubscriptions} bonificadas`}
            color={data.revenue.totalPro > 0 ? 'text-amber-400' : 'text-zinc-500'}
          />
          <KPICard
            label="Pagas"
            value={data.revenue.paidSubscriptions}
            sub="con suscripcion Rebill"
            color={data.revenue.paidSubscriptions > 0 ? 'text-positive' : 'text-zinc-500'}
          />
          <KPICard
            label="Bonificadas"
            value={data.revenue.bonifiedSubscriptions}
            sub="PRO sin cobro"
            color="text-accent"
          />
          <KPICard
            label="% PRO"
            value={`${data.revenue.proRate}%`}
            sub={`de ${data.profiles.totalConsignatarias} perfiles`}
            color={data.revenue.proRate > 10 ? 'text-positive' : 'text-zinc-400'}
          />
          <KPICard
            label="PRO Usuario"
            value={data.revenue.proUserCount}
            sub={`$${data.revenue.breakdown.proUserMrr.toLocaleString('es-AR')}/mes`}
            color={data.revenue.proUserCount > 0 ? 'text-positive' : 'text-zinc-500'}
          />
          <KPICard
            label="API Enterprise"
            value={Object.values(data.revenue.apiByTier).reduce((a, b) => a + b, 0)}
            sub={`$${data.revenue.breakdown.apiMrr.toLocaleString('es-AR')}/mes`}
            color={data.revenue.breakdown.apiMrr > 0 ? 'text-positive' : 'text-zinc-500'}
          />
          <KPICard
            label="Internas excl."
            value={data.revenue.internalSubs}
            sub="founder/owner (sin MRR)"
            color="text-zinc-500"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ENGAGEMENT KPIs                                              */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header">
          <span className="text-zinc-400 text-xxs tracking-widest">ENGAGEMENT</span>
        </div>
        <div className="px-3 py-3 flex flex-wrap gap-px">
          <KPICard
            label="Views 7d"
            value={data.engagement.views7d.toLocaleString('es-AR')}
            color="text-accent"
          />
          <KPICard
            label="Views 30d"
            value={data.engagement.views30d.toLocaleString('es-AR')}
            color="text-zinc-200"
          />
          <KPICard
            label="Views total"
            value={data.engagement.totalViews.toLocaleString('es-AR')}
            sub="desde el lanzamiento"
          />
          <KPICard
            label="Usuarios"
            value={data.users.total}
            sub={`${data.users.admins} admin · ${data.users.owners} owners`}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CRM — CLAIMS FUNNEL                                          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Consignataria claims */}
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xxs tracking-widest">CRM — CONSIGNATARIAS</span>
              {data.claims.consignatarias.pending > 0 && (
                <span className="live-badge-amber text-[10px]">
                  {data.claims.consignatarias.pending} PENDIENTE{data.claims.consignatarias.pending !== 1 ? 'S' : ''}
                </span>
              )}
            </div>
            <Link href="/admin/claims" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
              VER &rarr;
            </Link>
          </div>
          <div className="px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xxs text-zinc-500 font-terminal">Total solicitudes</span>
              <span className="text-data tabular-nums font-terminal text-zinc-300">{data.claims.consignatarias.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-warning font-terminal flex items-center gap-1.5"><StatusDot status="pending" /> Pendientes</span>
              <span className="text-data tabular-nums font-terminal text-warning">{data.claims.consignatarias.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-positive font-terminal flex items-center gap-1.5"><StatusDot status="approved" /> Aprobadas</span>
              <span className="text-data tabular-nums font-terminal text-positive">{data.claims.consignatarias.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-negative font-terminal flex items-center gap-1.5"><StatusDot status="rejected" /> Rechazadas</span>
              <span className="text-data tabular-nums font-terminal text-negative">{data.claims.consignatarias.rejected}</span>
            </div>
            {data.claims.consignatarias.total > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 font-terminal">Tasa aprobacion:</span>
                  <span className="text-xxs tabular-nums font-terminal text-zinc-300">
                    {Math.round((data.claims.consignatarias.approved / data.claims.consignatarias.total) * 100)}%
                  </span>
                </div>
                <MiniBar
                  value={data.claims.consignatarias.approved}
                  max={data.claims.consignatarias.total}
                  color="bg-positive"
                />
              </div>
            )}
          </div>
        </div>

        {/* Frigorifico claims */}
        <div className="terminal-panel mt-px md:ml-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xxs tracking-widest">CRM — FRIGORIFICOS</span>
              {data.claims.frigorificos.pending > 0 && (
                <span className="live-badge-amber text-[10px]">
                  {data.claims.frigorificos.pending} PENDIENTE{data.claims.frigorificos.pending !== 1 ? 'S' : ''}
                </span>
              )}
            </div>
            <Link href="/admin/frigorifico-claims" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
              VER &rarr;
            </Link>
          </div>
          <div className="px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xxs text-zinc-500 font-terminal">Total solicitudes</span>
              <span className="text-data tabular-nums font-terminal text-zinc-300">{data.claims.frigorificos.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-warning font-terminal flex items-center gap-1.5"><StatusDot status="pending" /> Pendientes</span>
              <span className="text-data tabular-nums font-terminal text-warning">{data.claims.frigorificos.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-positive font-terminal flex items-center gap-1.5"><StatusDot status="approved" /> Aprobados</span>
              <span className="text-data tabular-nums font-terminal text-positive">{data.claims.frigorificos.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xxs text-negative font-terminal flex items-center gap-1.5"><StatusDot status="rejected" /> Rechazados</span>
              <span className="text-data tabular-nums font-terminal text-negative">{data.claims.frigorificos.rejected}</span>
            </div>
            {data.claims.frigorificos.total > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 font-terminal">Tasa aprobacion:</span>
                  <span className="text-xxs tabular-nums font-terminal text-zinc-300">
                    {Math.round((data.claims.frigorificos.approved / data.claims.frigorificos.total) * 100)}%
                  </span>
                </div>
                <MiniBar
                  value={data.claims.frigorificos.approved}
                  max={data.claims.frigorificos.total}
                  color="bg-positive"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PROFILES OVERVIEW                                            */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">PERFILES</span>
          <Link href="/admin/consignatarias" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
            GESTIONAR &rarr;
          </Link>
        </div>
        <div className="px-3 py-3 flex flex-wrap gap-px">
          <KPICard
            label="Total perfiles"
            value={data.profiles.totalConsignatarias}
            sub="en Supabase"
          />
          <KPICard
            label="Verificados"
            value={data.profiles.verifiedConsignatarias}
            sub={`${data.profiles.verificationRate}% del total`}
            color="text-positive"
          />
          <KPICard
            label="Bonif. admin"
            value={data.profiles.adminFeatured}
            sub="destacados manualmente"
            color="text-amber-400"
          />
        </div>
        {data.profiles.totalConsignatarias > 0 && (
          <div className="px-3 pb-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xxs text-zinc-500 font-terminal">Verificacion</span>
              <span className="text-xxs tabular-nums text-zinc-400 font-terminal">{data.profiles.verificationRate}%</span>
            </div>
            <MiniBar
              value={data.profiles.verifiedConsignatarias}
              max={data.profiles.totalConsignatarias}
              color="bg-positive"
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  SUBSCRIPTIONS TABLE                                          */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-400 text-xxs tracking-widest">SUSCRIPCIONES</span>
          <span className="text-xxs text-zinc-500 font-terminal tabular-nums">{data.subscriptions.length} total</span>
        </div>
        {data.subscriptions.length === 0 ? (
          <div className="px-panel py-6 text-center">
            <span className="text-zinc-500 text-data font-terminal">Sin suscripciones activas</span>
            <p className="text-xxs text-zinc-600 font-terminal mt-1">Las suscripciones apareceran cuando los usuarios contraten un plan PRO</p>
          </div>
        ) : (
          <>
            <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
              <span className="w-[180px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Entidad</span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipo</span>
              <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Plan</span>
              <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Estado</span>
              <span className="w-[90px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Vence</span>
            </div>
            {data.subscriptions.map((sub, i) => (
              <div key={i} className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-0">
                <span className="w-[180px] flex-shrink-0 text-data font-terminal text-zinc-200 truncate">{sub.entitySlug}</span>
                <span className="w-[80px] flex-shrink-0 text-xxs font-terminal text-zinc-500">{sub.entityType === 'consignataria' ? 'CONSIG' : 'FRIGO'}</span>
                <span className="flex-1 text-xxs font-terminal text-zinc-400">{sub.planName}</span>
                <span className="w-[80px] flex-shrink-0 text-center">
                  <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                    sub.status === 'active'
                      ? 'border-positive/30 text-positive'
                      : sub.status === 'past_due'
                      ? 'border-warning/30 text-warning'
                      : 'border-negative/30 text-negative'
                  }`}>
                    {sub.status.toUpperCase()}
                  </span>
                </span>
                <span className="w-[90px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500 text-right">
                  {sub.periodEnd ? new Date(sub.periodEnd).toLocaleDateString('es-AR') : '—'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/*  TOP VIEWED + RECENT CLAIMS (side by side)                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Top viewed entities */}
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">TOP PERFILES (30d)</span>
          </div>
          {data.engagement.topViewed.length === 0 ? (
            <div className="px-panel py-4 text-center">
              <span className="text-zinc-500 text-xxs font-terminal">Sin datos de views</span>
            </div>
          ) : (
            <div className="divide-y divide-terminal-border">
              {data.engagement.topViewed.map((item, i) => (
                <div key={item.entity_slug} className="px-3 py-1.5 flex items-center gap-2">
                  <span className="w-[20px] text-xxs font-terminal tabular-nums text-zinc-500 text-right">{i + 1}.</span>
                  <span className="flex-1 text-data font-terminal text-zinc-300 truncate">{item.entity_slug}</span>
                  <span className="text-data font-terminal tabular-nums text-accent">{item.view_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="terminal-panel mt-px md:ml-px">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">ACTIVIDAD RECIENTE</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {[...data.claims.recentConsignatarias.map(c => ({
              type: 'consig' as const,
              name: c.consignatarias?.display_name || c.consignataria_slug,
              email: c.claimant_email,
              status: c.status,
              date: c.created_at,
            })), ...data.claims.recentFrigorificos.map(c => ({
              type: 'frigo' as const,
              name: c.frigorifico_name,
              email: c.claimant_email,
              status: c.status,
              date: c.created_at,
            }))]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8)
              .map((item, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center gap-2">
                  <StatusDot status={item.status} />
                  <span className="text-xxs font-terminal text-zinc-500">{item.type === 'consig' ? 'CONSIG' : 'FRIGO'}</span>
                  <span className="flex-1 text-data font-terminal text-zinc-300 truncate">{item.name}</span>
                  <span className="text-xxs font-terminal tabular-nums text-zinc-500">
                    {new Date(item.date).toLocaleDateString('es-AR')}
                  </span>
                </div>
              ))}
            {data.claims.recentConsignatarias.length === 0 && data.claims.recentFrigorificos.length === 0 && (
              <div className="px-panel py-4 text-center">
                <span className="text-zinc-500 text-xxs font-terminal">Sin actividad reciente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PENDING ACTIONS ALERT                                        */}
      {/* ============================================================ */}
      {pendingTotal > 0 && (
        <div className="glass-panel mt-px">
          <div className="px-panel py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-xxs text-warning font-terminal uppercase tracking-wider">
                {pendingTotal} solicitud{pendingTotal !== 1 ? 'es' : ''} pendiente{pendingTotal !== 1 ? 's' : ''} de revision
              </span>
            </div>
            <div className="flex items-center gap-3">
              {data.claims.consignatarias.pending > 0 && (
                <Link href="/admin/claims" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
                  Consignatarias ({data.claims.consignatarias.pending})
                </Link>
              )}
              {data.claims.frigorificos.pending > 0 && (
                <Link href="/admin/frigorifico-claims" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
                  Frigorificos ({data.claims.frigorificos.pending})
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
