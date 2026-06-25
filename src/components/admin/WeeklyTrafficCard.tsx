import Stat from '@/components/ui/Stat'
import Delta from '@/components/ui/Delta'
import { createServiceClient } from '@/lib/supabase'
import { getGa4Weekly, type Ga4Weekly } from '@/lib/admin/ga4'
import { SEMANTIC_HEX } from '@/lib/ui/tokens'

const nf = (n: number) => n.toLocaleString('es-AR')

/** Segundos → "m:ss" para duración media de sesión. */
function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Sparkline de barras CSS puro (server component, sin JS). */
function BarSparkline({
  values,
  labels,
  color = SEMANTIC_HEX.accent,
}: {
  values: number[]
  labels?: string[]
  color?: string
}) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end" title={labels?.[i]}>
          <div
            className="w-full rounded-sm"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              backgroundColor: color,
              opacity: 0.35 + 0.65 * (v / max),
            }}
          />
        </div>
      ))}
    </div>
  )
}

/** Vista GA4 conectado: tabla esta-semana-vs-previa + sparkline + canales. */
function Ga4View({ d }: { d: Ga4Weekly }) {
  const dailyLabels = d.daily.map((p) =>
    // "YYYYMMDD" → "dd/mm"
    p.date.length === 8 ? `${p.date.slice(6, 8)}/${p.date.slice(4, 6)}` : p.date,
  )
  const rows = [
    { label: 'Sesiones', m: d.sessions, fmt: nf },
    { label: 'Usuarios', m: d.users, fmt: nf },
    { label: 'Vistas', m: d.pageViews, fmt: nf },
    { label: 'Duración', m: d.avgSessionDuration, fmt: fmtDuration },
  ]
  return (
    <div className="py-cell flex flex-col gap-4">
      <div className="flex items-center gap-2 px-cell">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: SEMANTIC_HEX.live }}
        />
        <span className="text-zinc-400 text-xxs tracking-wider">GA4 · esta semana vs previa</span>
      </div>

      {/* Tabla métricas */}
      <table className="w-full text-data font-terminal tabular-nums">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-terminal-border">
              <td className="px-cell py-1.5 text-zinc-400 text-xxs uppercase tracking-wider">
                {r.label}
              </td>
              <td className="px-cell py-1.5 text-right text-zinc-100">{r.fmt(r.m.current)}</td>
              <td className="px-cell py-1.5 text-right text-zinc-600">{r.fmt(r.m.previous)}</td>
              <td className="px-cell py-1.5 text-right">
                <Delta change={r.m.changePct} className="text-data" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sparkline diario */}
      {d.daily.length > 0 && (
        <div className="px-cell">
          <div className="text-zinc-500 text-xxs uppercase tracking-wider mb-1.5">
            Sesiones · últimos {d.daily.length} días
          </div>
          <BarSparkline
            values={d.daily.map((p) => p.sessions)}
            labels={dailyLabels}
            color={SEMANTIC_HEX.accent}
          />
        </div>
      )}

      {/* Top canales */}
      {d.topChannels.length > 0 && (
        <div>
          <div className="px-cell text-zinc-500 text-xxs uppercase tracking-wider mb-1">
            Canales · 7d
          </div>
          {d.topChannels.map((c) => (
            <div
              key={c.channel}
              className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2"
            >
              <span className="text-zinc-300 text-data flex-1 truncate">{c.channel}</span>
              <span className="text-zinc-400 text-data font-terminal tabular-nums">
                {nf(c.sessions)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Fallback HONESTO cuando GA4 no está conectado en el server: aviso discreto +
 * proxy first-party EN VIVO (vistas de perfil 7d vs 7d previos + por día).
 */
async function FallbackView() {
  const supabase = createServiceClient()

  // Datos por defecto "sin dato" si Supabase no está disponible (soft-fail).
  let cur: number | null = null
  let prev: number | null = null
  let daily: { date: string; views: number }[] = []

  if (supabase) {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const since14 = new Date(now - 14 * day).toISOString()

    const { data, error } = await supabase
      .from('profile_views')
      .select('viewed_at')
      .gte('viewed_at', since14)

    if (!error && data) {
      const cutoff7 = now - 7 * day
      let c = 0
      let p = 0
      // Buckets por día (últimos 7d) para el sparkline.
      const buckets = new Map<string, number>()
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(now - i * day)
        const key = dt.toISOString().slice(0, 10) // YYYY-MM-DD
        buckets.set(key, 0)
      }
      for (const row of data) {
        const t = new Date(row.viewed_at as string).getTime()
        if (Number.isNaN(t)) continue
        if (t >= cutoff7) {
          c++
          const key = new Date(t).toISOString().slice(0, 10)
          if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
        } else {
          p++
        }
      }
      cur = c
      prev = p
      daily = Array.from(buckets.entries()).map(([date, views]) => ({ date, views }))
    }
  }

  const changePct = cur != null && prev != null && prev > 0 ? ((cur - prev) / prev) * 100 : null

  const dailyLabels = daily.map((d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`)

  return (
    <div className="py-cell flex flex-col gap-4">
      {/* Aviso honesto */}
      <div className="mx-cell rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <span className="text-amber-300/90 text-xxs leading-relaxed">
          GA4 no conectado en el server. Agregá{' '}
          <span className="font-terminal text-amber-200">GA4_SA_KEY</span> +{' '}
          <span className="font-terminal text-amber-200">GA4_PROPERTY_ID</span> en Vercel para
          tráfico real.
        </span>
      </div>

      {/* Proxy first-party */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-cell">
        <Stat
          label="Vistas de perfil · 7d"
          value={cur != null ? nf(cur) : null}
          delta={changePct}
          tone="accent"
          sub="dato propio (profile_views)"
        />
        <Stat
          label="7d previos"
          value={prev != null ? nf(prev) : null}
          tone="neutral"
          sub="base de comparación"
        />
      </div>

      {/* Sparkline diario de vistas */}
      {daily.length > 0 && (
        <div className="px-cell">
          <div className="text-zinc-500 text-xxs uppercase tracking-wider mb-1.5">
            Vistas de perfil · por día (7d)
          </div>
          <BarSparkline
            values={daily.map((d) => d.views)}
            labels={dailyLabels}
            color={SEMANTIC_HEX.accent}
          />
        </div>
      )}
    </div>
  )
}

export default async function WeeklyTrafficCard() {
  // GA4 soft-fails internamente a null; nunca lanza.
  const ga4 = await getGa4Weekly().catch(() => null)

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-400 text-xxs tracking-widest">TRÁFICO · 7 DÍAS</span>
        <span className="text-zinc-600 text-xxs tracking-wider">
          {ga4 ? 'GA4' : 'dato propio'}
        </span>
      </div>
      {ga4 ? <Ga4View d={ga4} /> : <FallbackView />}
    </div>
  )
}
