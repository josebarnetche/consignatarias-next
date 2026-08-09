'use client'

import { useEffect, useState } from 'react'
import { Mail, Calendar, Tag, Users, TrendingUp, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/components/ui'

interface Subscriber {
  id: string
  email: string
  source: string
  status: string
  subscribed_at: string
  created_at: string
}

interface Stats {
  total: number
  active: number
  sources: Record<string, number>
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSourceBadgeColor(source: string): string {
  const colors: Record<string, string> = {
    'homepage': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'remates': 'bg-green-500/20 text-green-400 border-green-500/30',
    'reporte-semanal': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'frigorificos': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'el-corredor': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'arrendamiento-liquidacion': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'cierre-mensual': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  }
  return colors[source] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
}

export default function SuscriptoresPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/suscriptores')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar')
      }
      const data = await res.json()
      setSubscribers(data.subscribers)
      setStats(data.stats)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="terminal-panel p-8 text-center">
        <div className="animate-pulse text-zinc-500">Cargando suscriptores...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="terminal-panel p-8 text-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  // Filter out test emails for display
  const realSubscribers = subscribers.filter(s => 
    !s.email.includes('test') && 
    !s.email.includes('healthcheck') &&
    !s.email.includes('jarvis')
  )
  const testSubscribers = subscribers.filter(s =>
    s.email.includes('test') ||
    s.email.includes('healthcheck') ||
    s.email.includes('jarvis')
  )

  // ── Momentum: mide el efecto de los nuevos CTAs (modal + strips). Todo se
  // calcula sobre suscriptores REALES para no contaminar con tests/healthchecks.
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const ts = (s: Subscriber) => new Date(s.created_at).getTime()
  const inWindow = (from: number, to: number) =>
    realSubscribers.filter(s => { const t = ts(s); return t >= now - from * DAY && t < now - to * DAY }).length
  const last7 = inWindow(7, 0)
  const prev7 = inWindow(14, 7)
  const last30 = inWindow(30, 0)
  const prev30 = inWindow(60, 30)
  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? null : 0) : Math.round(((cur - prev) / prev) * 100)
  const wow = pct(last7, prev7) // week-over-week
  const mom = pct(last30, prev30) // month-over-month

  // Sparkline: nuevos suscriptores reales por día, últimos 30 días.
  const daily: number[] = Array.from({ length: 30 }, (_, i) => {
    const dayEnd = now - (29 - i) * DAY
    const dayStart = dayEnd - DAY
    return realSubscribers.filter(s => { const t = ts(s); return t >= dayStart && t < dayEnd }).length
  })
  const dailyMax = Math.max(1, ...daily)

  function TrendBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-xxs text-sky-400">nuevo</span>
    const up = value >= 0
    return (
      <span className={`text-xxs tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? '▲' : '▼'} {Math.abs(value)}%
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="terminal-panel p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xxs uppercase tracking-wider mb-2">
            <Users className="w-3 h-3" />
            Total
          </div>
          <div className="text-2xl font-terminal text-zinc-100">{stats?.total || 0}</div>
        </div>
        <div className="terminal-panel p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xxs uppercase tracking-wider mb-2">
            <TrendingUp className="w-3 h-3" />
            Activos
          </div>
          <div className="text-2xl font-terminal text-emerald-400">{stats?.active || 0}</div>
        </div>
        <div className="terminal-panel p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xxs uppercase tracking-wider mb-2">
            <Mail className="w-3 h-3" />
            Reales
          </div>
          <div className="text-2xl font-terminal text-accent">{realSubscribers.length}</div>
        </div>
        <div className="terminal-panel p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xxs uppercase tracking-wider mb-2">
            <Tag className="w-3 h-3" />
            Tests
          </div>
          <div className="text-2xl font-terminal text-zinc-500">{testSubscribers.length}</div>
        </div>
      </div>

      {/* Momentum — mide el efecto de los nuevos CTAs de captura */}
      <div className="terminal-panel p-4">
        <div className="flex items-center gap-2 text-xxs text-zinc-500 uppercase tracking-wider mb-3">
          <TrendingUp className="w-3 h-3" />
          Momentum de captación
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div>
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Últimos 7 días</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-terminal text-zinc-100 tabular-nums">{last7}</span>
              <TrendBadge value={wow} />
            </div>
            <div className="text-xxs text-zinc-600 mt-0.5">vs. {prev7} la semana previa</div>
          </div>
          <div>
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Últimos 30 días</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-terminal text-zinc-100 tabular-nums">{last30}</span>
              <TrendBadge value={mom} />
            </div>
            <div className="text-xxs text-zinc-600 mt-0.5">vs. {prev30} el mes previo</div>
          </div>
          {/* Sparkline 30d */}
          <div className="col-span-2">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Nuevos por día · 30d</div>
            <div className="flex items-end gap-[2px] h-12">
              {daily.map((v, i) => (
                <div
                  key={i}
                  title={`${v} nuevo${v === 1 ? '' : 's'}`}
                  className={`flex-1 rounded-sm ${v > 0 ? 'bg-sky-400/70' : 'bg-zinc-800'}`}
                  style={{ height: `${Math.max(6, (v / dailyMax) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      {stats?.sources && Object.keys(stats.sources).length > 0 && (
        <div className="terminal-panel p-4">
          <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-3">Por Fuente</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.sources).map(([source, count]) => (
              <span 
                key={source}
                className={`px-2 py-1 text-xxs font-terminal rounded border ${getSourceBadgeColor(source)}`}
              >
                {source}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Real Subscribers Table */}
      <div className="terminal-panel">
        <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <span className="text-sm font-terminal text-zinc-200">
              Suscriptores Reales ({realSubscribers.length})
            </span>
          </div>
          <button 
            onClick={fetchData}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        
        {realSubscribers.length === 0 ? (
          <EmptyState icon="campana" compact title="No hay suscriptores reales aún" />
        ) : (
          <div className="divide-y divide-terminal-border">
            {realSubscribers.map((sub) => (
              <div key={sub.id} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <div className="font-terminal text-zinc-200 truncate">{sub.email}</div>
                  <div className="text-xxs text-zinc-500 flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(sub.created_at)}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xxs font-terminal rounded border ${getSourceBadgeColor(sub.source)}`}>
                  {sub.source}
                </span>
                <span className={`px-2 py-0.5 text-xxs font-terminal rounded ${
                  sub.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Subscribers (collapsed) */}
      {testSubscribers.length > 0 && (
        <details className="terminal-panel">
          <summary className="px-4 py-3 cursor-pointer text-sm font-terminal text-zinc-500 hover:text-zinc-300">
            Tests & QA ({testSubscribers.length})
          </summary>
          <div className="divide-y divide-terminal-border border-t border-terminal-border">
            {testSubscribers.map((sub) => (
              <div key={sub.id} className="px-4 py-2 flex items-center gap-4 text-zinc-500">
                <div className="flex-1 min-w-0 truncate text-sm">{sub.email}</div>
                <span className="text-xxs">{sub.source}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
