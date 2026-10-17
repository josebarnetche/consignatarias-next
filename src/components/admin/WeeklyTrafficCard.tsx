import Delta from '@/components/ui/Delta'
import { AdminSection } from '@/components/admin/kit'
import { createServiceClient } from '@/lib/supabase'
import { getGa4Weekly, type Ga4Weekly } from '@/lib/admin/ga4'

/**
 * Tráfico de los últimos 7 días, en /admin/overview ("En vivo").
 *
 * - Con GA4 conectado: sesiones/usuarios/vistas/duración contra la semana
 *   previa, sesiones por día y canales.
 * - Sin GA4: una nota chica y las vistas de perfil propias POR DÍA. El total
 *   7 d con su variación NO se repite acá: vive en /admin (Hoy).
 *
 * Soft-fail: GA4 devuelve null y cada conteo propio que falla queda en null.
 */

const nf = (n: number) => n.toLocaleString('es-AR')
const DAY = 86_400_000
/** Argentina no tiene horario de verano: UTC−3 fijo. */
const ART_OFFSET = 3 * 3_600_000

function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Barras por día con su rótulo debajo. `null` = sin dato (barra vacía). */
function DailyBars({ values, labels, unit }: { values: Array<number | null>; labels: string[]; unit: string }) {
  const max = Math.max(1, ...values.map((v) => v ?? 0))
  return (
    <div>
      <div className="flex items-end gap-1 h-14" role="img" aria-label={`${unit} por día, últimos ${values.length} días`}>
        {values.map((v, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end" title={`${labels[i]}: ${v == null ? 's/d' : nf(v)} ${unit}`}>
            <div
              className={`w-full rounded-sm ${i === values.length - 1 ? 'bg-accent' : 'bg-accent/50'}`}
              style={{ height: `${v == null ? 0 : Math.max(4, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center text-xxs text-zinc-500 font-terminal tabular-nums">
            {l}
          </span>
        ))}
      </div>
      <div className="mt-0.5 flex gap-1">
        {values.map((v, i) => (
          <span key={i} className="flex-1 text-center text-xxs text-zinc-400 font-terminal tabular-nums">
            {v == null ? '—' : nf(v)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Ga4View({ d }: { d: Ga4Weekly }) {
  const rows = [
    { label: 'Sesiones', m: d.sessions, fmt: nf },
    { label: 'Usuarios', m: d.users, fmt: nf },
    { label: 'Páginas vistas', m: d.pageViews, fmt: nf },
    { label: 'Duración media', m: d.avgSessionDuration, fmt: fmtDuration },
  ]
  return (
    <div className="grid gap-px lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <table className="terminal-table">
        <thead>
          <tr>
            <th />
            <th className="text-right">Esta semana</th>
            <th className="text-right hidden sm:table-cell">Previa</th>
            <th className="text-right">Cambio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="text-zinc-400">{r.label}</td>
              <td className="text-right tabular-nums text-ink">{r.fmt(r.m.current)}</td>
              <td className="text-right tabular-nums text-zinc-500 hidden sm:table-cell">{r.fmt(r.m.previous)}</td>
              <td className="text-right">
                <Delta change={r.m.changePct} className="text-data" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="terminal-panel-body space-y-4">
        {d.daily.length > 0 && (
          <div>
            <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider mb-1.5">Sesiones por día</div>
            <DailyBars
              values={d.daily.map((p) => p.sessions)}
              labels={d.daily.map((p) => (p.date.length === 8 ? `${p.date.slice(6, 8)}/${p.date.slice(4, 6)}` : p.date))}
              unit="sesiones"
            />
          </div>
        )}
        {d.topChannels.length > 0 && (
          <div>
            <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider mb-1">Canales</div>
            <ul>
              {d.topChannels.map((c) => (
                <li key={c.channel} className="flex items-center justify-between py-1 border-b border-terminal-border last:border-b-0">
                  <span className="text-data text-zinc-300 truncate">{c.channel}</span>
                  <span className="text-data text-zinc-400 font-terminal tabular-nums">{nf(c.sessions)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/** Vistas de perfil por día calendario de Argentina (hoy incluido), con conteos exactos. */
async function getViewsPerDay(): Promise<{ values: Array<number | null>; labels: string[] }> {
  const now = Date.now()
  const startToday = Math.floor((now - ART_OFFSET) / DAY) * DAY + ART_OFFSET
  const days = Array.from({ length: 7 }, (_, i) => startToday - (6 - i) * DAY)
  const labels = days.map((ms) => {
    const d = new Date(ms - ART_OFFSET)
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
  const db = createServiceClient()
  if (!db) return { values: days.map(() => null), labels }
  // Conteos exactos (head) en vez de traer filas: no depende del tope de filas de PostgREST.
  const values = await Promise.all(
    days.map(async (from) => {
      try {
        const { count, error } = await db
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .gte('viewed_at', new Date(from).toISOString())
          .lt('viewed_at', new Date(from + DAY).toISOString())
        return error || count == null ? null : count
      } catch {
        return null
      }
    }),
  )
  return { values, labels }
}

async function FallbackView() {
  const { values, labels } = await getViewsPerDay()
  return (
    <div className="terminal-panel-body space-y-3">
      <div>
        <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider mb-1.5">Vistas de perfil por día</div>
        <DailyBars values={values} labels={labels} unit="vistas" />
      </div>
      <p className="text-xxs text-zinc-500 font-terminal">
        GA4 no está conectado en el servidor (faltan <code>GA4_SA_KEY</code> y <code>GA4_PROPERTY_ID</code> en Vercel):
        se muestran las vistas de perfil propias. El total de 7 días está en Hoy.
      </p>
    </div>
  )
}

export default async function WeeklyTrafficCard() {
  const ga4 = await getGa4Weekly().catch(() => null)
  return (
    <AdminSection
      title="Tráfico · 7 días"
      action={<span className="text-xxs text-zinc-500 font-terminal">{ga4 ? 'GA4' : 'dato propio'}</span>}
      flush
    >
      {ga4 ? <Ga4View d={ga4} /> : <FallbackView />}
    </AdminSection>
  )
}
