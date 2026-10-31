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
    return { rows: [] as EvRow[], errored: true, lastHook: await lastWebhookHit(supabase) }
  }
  const rows = (data as EvRow[]) ?? []
  return { rows, errored: false, lastHook: rows.length > 0 ? null : await lastWebhookHit(supabase) }
}

interface WebhookHit { created_at: string; motivo: string | null }

/**
 * Último intento de Resend contra /api/webhooks/resend, según ops_events (la ruta
 * registra cada llamada, también las rechazadas). Sirve para decir POR QUÉ
 * email_events está vacía: nunca llamó, llamó sin secreto, o la firma no coincide.
 */
async function lastWebhookHit(supabase: NonNullable<ReturnType<typeof createServiceClient>>): Promise<WebhookHit | null> {
  try {
    const { data, error } = await supabase
      .from('ops_events')
      .select('created_at, metadata')
      .eq('event_type', 'webhook_received')
      .eq('route', '/api/webhooks/resend')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    const row = data[0] as { created_at: string; metadata: unknown }
    const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {}
    return { created_at: row.created_at, motivo: typeof meta.motivo === 'string' ? meta.motivo : null }
  } catch {
    return null
  }
}

const WEBHOOK_URL = 'https://www.consignatarias.com.ar/api/webhooks/resend'

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })

/** Diagnóstico en una frase a partir del último intento registrado. */
function diagnostico(hit: WebhookHit | null): string {
  if (!hit) return 'Resend nunca llamó al webhook: no está registrado en Resend.'
  const cuando = fecha(hit.created_at)
  switch (hit.motivo) {
    case 'secret_sin_configurar':
      return `La última llamada de Resend fue el ${cuando} y se rechazó porque RESEND_WEBHOOK_SECRET no está configurado en Vercel. Desde entonces no llegó ninguna: el webhook no está registrado en Resend.`
    case 'firma_invalida':
      return `La última llamada de Resend fue el ${cuando} y se rechazó por firma inválida: RESEND_WEBHOOK_SECRET no coincide con el Signing Secret del webhook.`
    case 'firma_valida':
      return `La última llamada válida de Resend fue el ${cuando}, pero no quedaron eventos en los últimos 30 días.`
    default:
      return `La última llamada de Resend fue el ${cuando} y no dejó eventos.`
  }
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
        // Sin eventos no hay tasa que mostrar: un "0%" diría que nadie abre los
        // mails, cuando en realidad no estamos midiendo nada.
        <div className="space-y-2 text-xxs text-zinc-400 font-terminal">
          <p className="text-zinc-300">
            {res?.errored
              ? 'No se pudo leer email_events: no hay medición de apertura ni de rebotes.'
              : 'Sin medición: email_events no tiene ningún evento. Los mails salen, pero Resend no nos avisa qué pasa con ellos.'}
          </p>
          <p>{diagnostico(res?.lastHook ?? null)}</p>
          <p className="text-zinc-500 uppercase tracking-wider">Para activarlo</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              Resend → Webhooks → Add Endpoint: <code className="break-all">{WEBHOOK_URL}</code>, con los eventos
              email.sent, delivered, opened, clicked, bounced y complained.
            </li>
            <li>
              Copiar el Signing Secret del webhook (empieza con <code>whsec_</code>) y cargarlo en Vercel como{' '}
              <code>RESEND_WEBHOOK_SECRET</code> (Production). Después, redeploy.
            </li>
            <li>Resend → Domains: activar Open tracking y Click tracking.</li>
          </ol>
        </div>
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
