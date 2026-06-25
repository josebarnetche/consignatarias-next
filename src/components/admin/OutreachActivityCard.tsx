import fs from 'node:fs'
import path from 'node:path'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import { createServiceClient } from '@/lib/supabase'

const nf = (n: number) => n.toLocaleString('es-AR')

/** "hace 3 h" / "hace 2 d" / "recién" desde un ISO. */
function hace(iso: string | null): string {
  if (!iso) return 's/d'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 's/d'
  if (ms < 60_000) return 'recién'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

/** Etiqueta humana corta para un type de outreach_log (que puede venir como 'remate_reminder:...'). */
function labelType(type: string): string {
  if (type.startsWith('remate_reminder')) return 'recordatorio'
  switch (type) {
    case 'pro_consignataria_upgrade':
      return 'warm PRO'
    case 'post_remate_results':
      return 'post-remate'
    case 'remate_confirm':
      return 'confirm remate'
    case 'verification_reminder':
      return 'verificación'
    default:
      return type.replace(/_/g, ' ')
  }
}

/** Familia para el resumen 7d. */
function familia(type: string): 'warm' | 'recordatorio' | 'postRemate' | 'otro' {
  if (type.startsWith('remate_reminder')) return 'recordatorio'
  if (type === 'pro_consignataria_upgrade') return 'warm'
  if (type === 'post_remate_results') return 'postRemate'
  return 'otro'
}

/** Lee el filesystem para saber si un workflow está activo o en disabled/. */
function engineState(yml: string): 'ACTIVO' | 'disabled' | 's/d' {
  try {
    const base = path.join(process.cwd(), '.github', 'workflows')
    if (fs.existsSync(path.join(base, yml))) return 'ACTIVO'
    if (fs.existsSync(path.join(base, 'disabled', yml))) return 'disabled'
    return 's/d'
  } catch {
    return 's/d'
  }
}

export default async function OutreachActivityCard() {
  const supabase = createServiceClient()

  // Estado de los motores (filesystem, no depende de DB) --------------------
  const warmState = engineState('pro-consignataria-outreach.yml')
  const reminderState = engineState('remate-reminders.yml')

  let recent: { type: string; consignataria_slug: string | null; email_sent_to: string | null; sent_at: string }[] = []
  const resumen = { warm: 0, recordatorio: 0, postRemate: 0, otro: 0 }
  let bajas7d: number | null = null
  let dbOk = false

  if (supabase) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [recentRes, weekRes, bajasRes] = await Promise.all([
      supabase
        .from('outreach_log')
        .select('type, consignataria_slug, email_sent_to, sent_at')
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('outreach_log')
        .select('type, sent_at')
        .gte('sent_at', sevenDaysAgo),
      supabase
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'unsubscribed')
        .gte('unsubscribed_at', sevenDaysAgo),
    ])

    if (!recentRes.error && recentRes.data) {
      recent = recentRes.data as typeof recent
      dbOk = true
    }
    if (!weekRes.error && weekRes.data) {
      for (const row of weekRes.data as { type: string }[]) {
        resumen[familia(row.type)]++
      }
      dbOk = true
    }
    if (!bajasRes.error) {
      bajas7d = bajasRes.count ?? 0
      dbOk = true
    }
  }

  const enviados7d = resumen.warm + resumen.recordatorio + resumen.postRemate + resumen.otro

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-400 text-xxs tracking-widest">OUTREACH · EMAILS</span>
      </div>

      {/* Estado de los motores — siempre se muestra (lee filesystem) */}
      <div className="px-cell py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-terminal-border">
        <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">Motores</span>
        <span className="flex items-center gap-1.5">
          <span className="text-zinc-400 text-xxs">Warm PRO</span>
          <Badge tone={warmState === 'ACTIVO' ? 'positive' : 'neutral'}>{warmState}</Badge>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-zinc-400 text-xxs">Recordatorios</span>
          <Badge tone={reminderState === 'ACTIVO' ? 'positive' : 'neutral'}>{reminderState}</Badge>
        </span>
      </div>

      {/* Resumen 7d */}
      <div className="terminal-panel-body grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 py-3">
        <Stat
          label="Enviados · 7d"
          value={dbOk ? nf(enviados7d) : null}
          tone="emphasis"
          size="text-xl"
        />
        <Stat
          label="Warm PRO · 7d"
          value={dbOk ? nf(resumen.warm) : null}
          tone="accent"
          size="text-xl"
        />
        <Stat
          label="Recordat. · 7d"
          value={dbOk ? nf(resumen.recordatorio) : null}
          tone="accent"
          size="text-xl"
        />
        <Stat
          label="Post-remate · 7d"
          value={dbOk ? nf(resumen.postRemate) : null}
          tone="accent"
          size="text-xl"
        />
        <Stat
          label="Bajas newsletter · 7d"
          value={bajas7d == null ? null : nf(bajas7d)}
          tone={bajas7d && bajas7d > 0 ? 'negative' : 'neutral'}
          size="text-xl"
          sub="status=unsubscribed"
        />
      </div>

      {/* Actividad reciente */}
      <div className="px-cell pt-2 pb-1">
        <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">Últimos envíos</span>
      </div>
      {recent.length === 0 ? (
        <div className="px-panel py-6 text-center">
          <span className="text-zinc-500 text-data font-terminal">{dbOk ? 'Sin datos' : 's/d'}</span>
        </div>
      ) : (
        <div>
          {recent.map((row, i) => (
            <div
              key={`${row.sent_at}-${i}`}
              className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2 text-data"
            >
              <span className="text-zinc-300 font-terminal text-xxs uppercase tracking-wider w-24 shrink-0">
                {labelType(row.type)}
              </span>
              <span className="text-zinc-400 font-terminal truncate flex-1">
                {row.consignataria_slug || row.email_sent_to || '—'}
              </span>
              <span className="text-zinc-500 font-terminal tabular-nums text-xxs shrink-0">
                {hace(row.sent_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
