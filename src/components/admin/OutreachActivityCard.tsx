import fs from 'node:fs'
import path from 'node:path'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import { AdminSection } from '@/components/admin/kit'
import { createServiceClient } from '@/lib/supabase'

const nf = (n: number) => n.toLocaleString('es-AR')

/** "hace 3 h" / "hace 2 d" / "recién" desde un ISO. */
function hace(iso: string | null): string {
  if (!iso) return 'sin fecha'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'sin fecha'
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

/**
 * Lee el filesystem para saber si un workflow está activo o en disabled/.
 *
 * Devuelve null cuando no hay forma de saberlo. Antes devolvía 's/d' y el badge
 * mostraba "s/d" siempre en producción: `.github/` no viaja al Lambda de Vercel
 * (el file tracing de Next no lo incluye porque el path es dinámico), así que
 * ningún yml existía para `fs.existsSync`. Ahora next.config.js lo incluye para
 * /admin/dashboard, y si igual falta, el badge cae al último envío real.
 */
function engineState(yml: string): 'ACTIVO' | 'disabled' | null {
  try {
    const base = path.join(process.cwd(), '.github', 'workflows')
    if (fs.existsSync(path.join(base, yml))) return 'ACTIVO'
    if (fs.existsSync(path.join(base, 'disabled', yml))) return 'disabled'
    return null
  } catch {
    return null
  }
}

/**
 * Badge de un motor. Con el estado del workflow: activo / pausado. Sin él, el
 * último envío de esa familia en outreach_log (dice si el motor anda, que es lo
 * que importa). Sin ninguno de los dos: "sin dato", con el motivo en el title.
 */
function EngineBadge({ state, lastSent }: { state: 'ACTIVO' | 'disabled' | null; lastSent: string | null }) {
  if (state === 'ACTIVO') return <Badge tone="positive">activo</Badge>
  if (state === 'disabled') return <Badge tone="neutral">pausado</Badge>
  if (lastSent) {
    return (
      <Badge tone="neutral" title="No se pudo leer el workflow en el servidor; se muestra el último envío registrado.">
        último {hace(lastSent)}
      </Badge>
    )
  }
  return (
    <Badge
      tone="neutral"
      title="No se pudo leer el workflow en el servidor y no hay envíos de este motor en outreach_log."
    >
      sin dato
    </Badge>
  )
}

export default async function OutreachActivityCard() {
  const supabase = createServiceClient()

  // Estado de los motores (filesystem, no depende de DB) --------------------
  const warmState = engineState('pro-consignataria-outreach.yml')
  const reminderState = engineState('remate-reminders.yml')

  let recent: { type: string; consignataria_slug: string | null; email_sent_to: string | null; sent_at: string }[] = []
  const resumen = { warm: 0, recordatorio: 0, postRemate: 0, otro: 0 }
  let dbOk = false
  // Último envío por motor: solo se consulta si el filesystem no supo decir el estado.
  let warmLast: string | null = null
  let reminderLast: string | null = null

  if (supabase) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [recentRes, weekRes] = await Promise.all([
      supabase
        .from('outreach_log')
        .select('type, consignataria_slug, email_sent_to, sent_at')
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('outreach_log')
        .select('type, sent_at')
        .gte('sent_at', sevenDaysAgo)
        .limit(10000),
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

    const lastOf = async (filter: 'eq' | 'like', value: string): Promise<string | null> => {
      const q = supabase.from('outreach_log').select('sent_at').order('sent_at', { ascending: false }).limit(1)
      const { data, error } = await (filter === 'eq' ? q.eq('type', value) : q.like('type', value))
      if (error || !data || data.length === 0) return null
      return (data[0] as { sent_at: string }).sent_at
    }
    ;[warmLast, reminderLast] = await Promise.all([
      warmState ? null : lastOf('eq', 'pro_consignataria_upgrade'),
      reminderState ? null : lastOf('like', 'remate_reminder%'),
    ])
  }

  const enviados7d = resumen.warm + resumen.recordatorio + resumen.postRemate + resumen.otro

  return (
    <AdminSection
      title="Outreach · últimos 7 días"
      action={
        <span className="flex flex-wrap items-center gap-2 text-xxs">
          <span className="text-zinc-500">Warm PRO</span>
          <EngineBadge state={warmState} lastSent={warmLast} />
          <span className="text-zinc-500">Recordatorios</span>
          <EngineBadge state={reminderState} lastSent={reminderLast} />
        </span>
      }
      flush
    >
      <div className="grid gap-px lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-4 content-start">
          <Stat label="Enviados" value={dbOk ? nf(enviados7d) : null} size="text-xl" />
          <Stat label="Warm PRO" value={dbOk ? nf(resumen.warm) : null} size="text-xl" sub="pitch de upgrade" />
          <Stat label="Recordatorios" value={dbOk ? nf(resumen.recordatorio) : null} size="text-xl" sub="de remate" />
          <Stat label="Post-remate" value={dbOk ? nf(resumen.postRemate) : null} size="text-xl" sub="resultados" />
        </div>
        <div className="lg:border-l border-t lg:border-t-0 border-terminal-border">
          <div className="px-panel pt-2 pb-1 text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Últimos envíos</div>
          {recent.length === 0 ? (
            <div className="px-panel py-6 text-center text-data text-zinc-500 font-terminal">
              {dbOk ? 'Todavía no salió ningún mail de outreach.' : 'Sin dato: no se pudo leer outreach_log.'}
            </div>
          ) : (
            <ul>
              {recent.map((row, i) => (
                <li
                  key={`${row.sent_at}-${i}`}
                  className="border-t border-terminal-border px-panel py-1.5 flex items-center gap-2 text-data"
                >
                  <span className="w-24 shrink-0 text-xxs uppercase tracking-wider text-zinc-400 font-terminal">
                    {labelType(row.type)}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-zinc-300 font-terminal">
                    {row.consignataria_slug || row.email_sent_to || '—'}
                  </span>
                  <span className="shrink-0 text-xxs tabular-nums text-zinc-500 font-terminal">{hace(row.sent_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminSection>
  )
}
