import Stat from '@/components/ui/Stat'
import { createServiceClient } from '@/lib/supabase'
import { getFeaturedSlugs } from '@/lib/featured'

/**
 * <ConversionRevenueCard/> — el embudo de negocio: "¿estamos convirtiendo?".
 *
 * First-party Supabase, soft-fail por sección (si una query falla, esa fila
 * muestra "s/d"; el resto del card sigue vivo). Sin auth (corre dentro de la
 * página /admin/overview, ya gateada por el layout admin).
 *
 * Mide:
 *   - Newsletter activos (total + nuevos 7d) con top sources.
 *   - Firmas PRO activas = getFeaturedSlugs().size, partidas en
 *     featured-manual (consignatarias.featured) vs suscripción activa.
 *   - Outreach de conversión: pitches 'pro_consignataria_upgrade' 7d/30d
 *     + a quién fue el último.
 *   - Señal de pagos: subscriptions activas + webhook events Rebill recientes.
 */

const nf = (n: number) => n.toLocaleString('es-AR')

const SINCE_7D = () => new Date(Date.now() - 7 * 86400000).toISOString()
const SINCE_30D = () => new Date(Date.now() - 30 * 86400000).toISOString()

/* ---- secciones (cada una soft-fails a null) -------------------------- */

interface Newsletter {
  total: number
  new7d: number
  topSources: Array<{ source: string; count: number }>
}

async function getNewsletter(): Promise<Newsletter | null> {
  const supabase = createServiceClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('source, subscribed_at')
    .eq('status', 'active')
    .limit(50000)
  if (error || !data) return null

  const rows = data as { source: string | null; subscribed_at: string | null }[]
  const since = SINCE_7D()
  const bySource = new Map<string, number>()
  let new7d = 0
  for (const r of rows) {
    bySource.set(r.source || 'desconocido', (bySource.get(r.source || 'desconocido') || 0) + 1)
    if (r.subscribed_at && r.subscribed_at >= since) new7d++
  }
  const topSources = Array.from(bySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
  return { total: rows.length, new7d, topSources }
}

interface ProSplit {
  total: number
  manual: number | null
  subscription: number | null
}

async function getProSplit(): Promise<ProSplit | null> {
  // total = la fuente de verdad unificada (soft-fails a Set vacío).
  const featured = await getFeaturedSlugs()
  const total = featured.size

  // Desglose: cuántas vienen por featured-manual vs suscripción activa.
  // Si falla el desglose, dejamos null (muestra "s/d" en el sub) pero el
  // total sigue siendo confiable.
  const supabase = createServiceClient()
  if (!supabase) return { total, manual: null, subscription: null }

  const [manualRes, subRes] = await Promise.all([
    supabase.from('consignatarias').select('canonical_slug').eq('featured', true),
    supabase
      .from('subscriptions')
      .select('entity_slug')
      .eq('entity_type', 'consignataria')
      .eq('status', 'active'),
  ])
  const manual = manualRes.error ? null : (manualRes.data?.length ?? null)
  const subscription = subRes.error ? null : (subRes.data?.length ?? null)
  return { total, manual, subscription }
}

interface ProOutreach {
  sent7d: number
  sent30d: number
  last: { slug: string; email: string; sentAt: string } | null
}

async function getProOutreach(): Promise<ProOutreach | null> {
  const supabase = createServiceClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('outreach_log')
    .select('consignataria_slug, email_sent_to, sent_at')
    .eq('type', 'pro_consignataria_upgrade')
    .order('sent_at', { ascending: false })
    .limit(2000)
  if (error || !data) return null

  const rows = data as { consignataria_slug: string; email_sent_to: string; sent_at: string | null }[]
  const s7 = SINCE_7D()
  const s30 = SINCE_30D()
  let sent7d = 0
  let sent30d = 0
  for (const r of rows) {
    if (r.sent_at && r.sent_at >= s30) sent30d++
    if (r.sent_at && r.sent_at >= s7) sent7d++
  }
  const head = rows[0]
  const last = head
    ? { slug: head.consignataria_slug, email: head.email_sent_to, sentAt: head.sent_at ?? '' }
    : null
  return { sent7d, sent30d, last }
}

interface PaySignal {
  activeSubs: number | null
  webhook7d: number | null
  webhook30d: number | null
}

async function getPaySignal(): Promise<PaySignal> {
  const supabase = createServiceClient()
  if (!supabase) return { activeSubs: null, webhook7d: null, webhook30d: null }

  const [subRes, wh7Res, wh30Res] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('processed_webhook_events')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', SINCE_7D()),
    supabase
      .from('processed_webhook_events')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', SINCE_30D()),
  ])
  return {
    activeSubs: subRes.error ? null : (subRes.count ?? 0),
    webhook7d: wh7Res.error ? null : (wh7Res.count ?? 0),
    webhook30d: wh30Res.error ? null : (wh30Res.count ?? 0),
  }
}

/* ---- helpers de formato --------------------------------------------- */

function fmtAge(iso: string): string {
  if (!iso) return 's/f'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 's/f'
  const h = ms / 3_600_000
  if (h < 1) return `hace ${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `hace ${Math.round(h)}h`
  return `hace ${Math.round(h / 24)}d`
}

/* ---- card ------------------------------------------------------------ */

export default async function ConversionRevenueCard() {
  const [newsletter, pro, outreach, pay] = await Promise.all([
    getNewsletter().catch(() => null),
    getProSplit().catch(() => null),
    getProOutreach().catch(() => null),
    getPaySignal().catch(() => ({ activeSubs: null, webhook7d: null, webhook30d: null }) as PaySignal),
  ])

  // Sub del split PRO: "manual + suscr." si tenemos ambos, si no "s/d".
  let proSub: string | undefined
  if (pro) {
    if (pro.manual !== null && pro.subscription !== null) {
      proSub = `${nf(pro.manual)} manual · ${nf(pro.subscription)} suscr.`
    } else {
      proSub = 'desglose s/d'
    }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-400 text-xxs tracking-widest">CONVERSIÓN &amp; INGRESOS</span>
      </div>

      {/* Stats grid */}
      <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-5">
        <Stat
          label="Newsletter activos"
          value={newsletter ? nf(newsletter.total) : null}
          sub={newsletter ? `+${nf(newsletter.new7d)} en 7 días` : 's/d'}
          tone={newsletter && newsletter.new7d > 0 ? 'positive' : 'emphasis'}
        />
        <Stat
          label="Firmas PRO"
          value={pro ? nf(pro.total) : null}
          sub={proSub ?? 's/d'}
          tone="accent"
        />
        <Stat
          label="Pitches PRO · 7d"
          value={outreach ? nf(outreach.sent7d) : null}
          sub={outreach ? `${nf(outreach.sent30d)} en 30 días` : 's/d'}
          tone={outreach && outreach.sent7d > 0 ? 'positive' : 'neutral'}
        />
        <Stat
          label="Suscr. activas"
          value={pay.activeSubs === null ? null : nf(pay.activeSubs)}
          sub={
            pay.webhook30d === null
              ? 's/d'
              : `${nf(pay.webhook7d ?? 0)} pagos 7d · ${nf(pay.webhook30d)} 30d`
          }
          tone={(pay.activeSubs ?? 0) > 0 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Último pitch PRO */}
      <div className="border-t border-terminal-border px-cell py-2">
        <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
          Último pitch PRO
        </div>
        {outreach?.last ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate" title={outreach.last.email}>
              {outreach.last.slug}
            </span>
            <span className="flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
              {fmtAge(outreach.last.sentAt)}
            </span>
          </div>
        ) : (
          <span className="text-data font-terminal text-zinc-500">
            {outreach ? 'Sin pitches enviados' : 's/d'}
          </span>
        )}
      </div>

      {/* Newsletter por origen */}
      {newsletter && newsletter.topSources.length > 0 && (
        <div className="border-t border-terminal-border px-cell py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xxs text-zinc-600 font-terminal uppercase tracking-wider">Origen</span>
          {newsletter.topSources.map((s) => (
            <span key={s.source} className="text-xxs font-terminal text-zinc-400 tabular-nums">
              {s.source} <span className="text-zinc-200">{nf(s.count)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
