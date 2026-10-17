import Stat from '@/components/ui/Stat'
import { AdminSection } from '@/components/admin/kit'
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
    <AdminSection
      title="Salud de email · 30 d"
      action={<span className="text-xxs text-zinc-500 font-terminal">Resend</span>}
    >
      {!hasData ? (
        <p className="text-xxs text-zinc-500 font-terminal">
          {res?.errored ? 'No se pudo leer email_events. ' : 'Sin eventos de email todavía. '}
          Para medir apertura y rebotes, configurá el webhook de Resend apuntando a <code>/api/webhooks/resend</code> y
          activá el seguimiento de aperturas y clics del dominio.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Stat label="Apertura" value={pct(opened, delivered)} sub={`${nf(opened)} de ${nf(delivered)} entregados`} />
            <Stat label="Clics" value={pct(clicked, delivered)} sub={`${nf(clicked)} de ${nf(delivered)} entregados`} />
            <Stat
              label="Rebotes"
              value={pct(bounced, delivered + bounced)}
              tone={bounced > 0 ? 'warning' : 'emphasis'}
              sub={`${nf(bounced)} mails`}
            />
            <Stat
              label="Quejas (spam)"
              value={nf(complained)}
              tone={complained > 0 ? 'negative' : 'emphasis'}
              sub={`de ${nf(delivered)} entregados`}
            />
          </div>
          <p className="text-xxs text-zinc-500 font-terminal tabular-nums">
            Volumen: {nf(sent || delivered)} enviados · {nf(delivered)} entregados · {nf(rows.length)} eventos
          </p>
        </div>
      )}
    </AdminSection>
  )
}
