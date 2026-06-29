import { createServiceClient } from '@/lib/supabase'

/**
 * EmailHealthCard — salud del canal email (Resend). Lee email_events (poblado por
 * el webhook /api/webhooks/resend) y calcula, sobre los últimos 30 días, tasa de
 * apertura / click / bounce / quejas. Antes de esto volábamos a ciegas.
 *
 * Las tasas usan email_id ÚNICO por tipo (un mail puede abrirse varias veces):
 *  apertura = abiertos únicos / entregados únicos.
 */
const nf = (n: number) => n.toLocaleString('es-AR')
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 1000) / 10}%` : '—')

interface EvRow { type: string | null; email_id: string | null; created_at: string }

async function load() {
  const supabase = createServiceClient()
  if (!supabase) return null
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data, error } = await supabase
    .from('email_events')
    .select('type, email_id, created_at')
    .gte('created_at', since)
    .limit(20000)
  if (error) {
    // Tabla ausente / sin permisos → tratamos como "sin datos" (no rompemos el panel).
    return { rows: [] as EvRow[], errored: true }
  }
  return { rows: (data as EvRow[]) ?? [], errored: false }
}

export default async function EmailHealthCard() {
  const res = await load()

  const uniq = (rows: EvRow[], t: string) =>
    new Set(rows.filter((r) => r.type === t && r.email_id).map((r) => r.email_id)).size
  const countOf = (rows: EvRow[], t: string) => rows.filter((r) => r.type === t).length

  const rows = res?.rows ?? []
  const delivered = uniq(rows, 'delivered')
  const opened = uniq(rows, 'opened')
  const clicked = uniq(rows, 'clicked')
  const bounced = countOf(rows, 'bounced')
  const complained = countOf(rows, 'complained')
  const sent = uniq(rows, 'sent')
  const hasData = rows.length > 0

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-400 text-xxs tracking-widest">SALUD DE EMAIL · 30D</span>
        <span className="text-xxs text-zinc-500 font-terminal tabular-nums">Resend</span>
      </div>

      {!hasData ? (
        <div className="px-panel py-6 text-center space-y-2">
          <span className="block text-zinc-500 text-data font-terminal">Sin eventos todavía</span>
          <span className="block text-xxs text-zinc-600 font-terminal leading-relaxed">
            Configurá el webhook en Resend → endpoint
            <br />
            <span className="text-zinc-400">/api/webhooks/resend</span>
            <br />
            + activá open/click tracking del dominio.
          </span>
        </div>
      ) : (
        <>
          <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <div className="text-2xl font-terminal tabular-nums text-emerald-400">{pct(opened, delivered)}</div>
              <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Apertura</div>
              <div className="text-xxs text-zinc-600 font-terminal tabular-nums">{nf(opened)} / {nf(delivered)}</div>
            </div>
            <div>
              <div className="text-2xl font-terminal tabular-nums text-sky-400">{pct(clicked, delivered)}</div>
              <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Click</div>
              <div className="text-xxs text-zinc-600 font-terminal tabular-nums">{nf(clicked)} / {nf(delivered)}</div>
            </div>
            <div>
              <div className={`text-2xl font-terminal tabular-nums ${bounced > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                {pct(bounced, delivered + bounced)}
              </div>
              <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Bounce</div>
              <div className="text-xxs text-zinc-600 font-terminal tabular-nums">{nf(bounced)}</div>
            </div>
            <div>
              <div className={`text-2xl font-terminal tabular-nums ${complained > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                {nf(complained)}
              </div>
              <div className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Quejas (spam)</div>
              <div className="text-xxs text-zinc-600 font-terminal tabular-nums">de {nf(delivered)} entregados</div>
            </div>
          </div>
          <div className="terminal-panel-body border-t border-terminal-border flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xxs text-zinc-600 font-terminal uppercase tracking-wider">Volumen 30d</span>
            <span className="text-xxs font-terminal text-zinc-400 tabular-nums">enviados <span className="text-zinc-200">{nf(sent || delivered)}</span></span>
            <span className="text-xxs font-terminal text-zinc-400 tabular-nums">entregados <span className="text-zinc-200">{nf(delivered)}</span></span>
            <span className="text-xxs font-terminal text-zinc-400 tabular-nums">eventos <span className="text-zinc-200">{nf(rows.length)}</span></span>
          </div>
        </>
      )}
    </div>
  )
}
