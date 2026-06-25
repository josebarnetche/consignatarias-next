import Stat from '@/components/ui/Stat'
import { createServiceClient } from '@/lib/supabase'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import frigoSummary from '@/lib/data/frigorificos-summary.json'

/**
 * <DataHealthCard/> — ¿el dato del sitio está fresco o hay algo viejo/roto?
 *
 * Mira las fuentes que alimentan el frente público:
 *   - market-prices.json (lastUpdate) → "hace Xh", rojo si > 36h
 *   - INMAG último valor + fecha (de la serie en market-prices)
 *   - remates.json: próximos / HOY / en-vivo (youtubeUrl) / total
 *   - frigoríficos: total + nº de provincias (frigorificos-summary.json)
 *   - última corrida del scraper (cron_runs workflow_name='scrape-auctions')
 *
 * Server component, admin-gated por el layout padre (no re-chequea auth).
 * Soft-fail: cualquier fuente que falle muestra "—"/"s/d", nunca rompe.
 */

const nf = (n: number) => n.toLocaleString('es-AR')

const DAY_MS = 86_400_000

/** "hace 3h" · "hace 2d" · "hoy" — desde un timestamp en ms. */
function ago(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return 's/d'
  const diff = Date.now() - ms
  if (diff < 0) return 'recién'
  const h = diff / 3_600_000
  if (h < 1) return `hace ${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `hace ${Math.round(h)}h`
  return `hace ${Math.round(h / 24)}d`
}

/** Parsea "YYYY-MM-DD" o "DD/MM/YYYY" a ms (mediodía local, evita TZ off-by-one). */
function parseDateLoose(s: string | null | undefined): number | null {
  if (!s || typeof s !== 'string') return null
  let y: number, mo: number, d: number
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    ;[y, mo, d] = s.slice(0, 10).split('-').map(Number)
  } else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [dd, mm, yy] = s.slice(0, 10).split('/').map(Number)
    y = yy
    mo = mm
    d = dd
  } else {
    return null
  }
  const t = new Date(y, mo - 1, d, 12, 0, 0).getTime()
  return Number.isFinite(t) ? t : null
}

type Remate = {
  date?: string
  youtubeUrl?: string | null
}

/** Última corrida del scraper de datos diarios. Soft-fails a null. */
async function getScraperLastRun(): Promise<{ ms: number | null; status: string | null }> {
  try {
    const supabase = createServiceClient()
    if (!supabase) return { ms: null, status: null }
    const { data, error } = await supabase
      .from('cron_runs')
      .select('started_at, status')
      .eq('workflow_name', 'scrape-auctions')
      .order('started_at', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return { ms: null, status: null }
    const row = data[0] as { started_at: string | null; status: string | null }
    const ms = row.started_at ? Date.parse(row.started_at) : null
    return { ms: Number.isFinite(ms as number) ? (ms as number) : null, status: row.status ?? null }
  } catch {
    return { ms: null, status: null }
  }
}

export default async function DataHealthCard() {
  const todayMs = parseDateLoose(new Date().toISOString().slice(0, 10))!

  /* ── market-prices.json freshness ──────────────────────────────── */
  let pricesAgo: string | null = null
  let pricesStale = false
  try {
    const lastUpdate = (marketPrices as { lastUpdate?: string }).lastUpdate
    const ms = parseDateLoose(lastUpdate)
    if (ms !== null) {
      pricesAgo = ago(ms)
      pricesStale = Date.now() - ms > 36 * 3_600_000
    }
  } catch {
    /* soft-fail */
  }

  /* ── INMAG último valor + fecha ────────────────────────────────── */
  let inmagValue: string | null = null
  let inmagSub: string | null = null
  try {
    const inmag = (marketPrices as {
      inmag?: { current?: number; series?: Array<{ date: string; value: number }> }
    }).inmag
    if (inmag?.current != null) {
      inmagValue = `$${nf(Math.round(inmag.current))}`
    }
    const series = inmag?.series
    if (Array.isArray(series) && series.length > 0) {
      const last = series[series.length - 1]
      inmagSub = `$/kg vivo · ${last?.date ?? 's/f'}`
    }
  } catch {
    /* soft-fail */
  }

  /* ── remates.json: próximos / HOY / en-vivo / total ────────────── */
  let rematesTotal: number | null = null
  let proximos: number | null = null
  let hoy = 0
  let enVivo = 0
  try {
    const remates = rematesData as Remate[]
    rematesTotal = remates.length
    let prox = 0
    for (const r of remates) {
      const ms = parseDateLoose(r.date)
      if (ms === null) continue
      if (ms >= todayMs) prox++
      if (ms === todayMs) {
        hoy++
        if (r.youtubeUrl) enVivo++
      }
    }
    proximos = prox
  } catch {
    /* soft-fail */
  }

  /* ── frigoríficos: total + provincias ──────────────────────────── */
  let frigosTotal: number | null = null
  let frigosProvincias: number | null = null
  try {
    const fs = frigoSummary as { total?: number; byProvince?: Record<string, number> }
    frigosTotal = fs.total ?? null
    frigosProvincias = fs.byProvince ? Object.keys(fs.byProvince).length : null
  } catch {
    /* soft-fail */
  }

  /* ── última corrida del scraper ────────────────────────────────── */
  const scraper = await getScraperLastRun()
  const scraperOk = scraper.status === 'ok'
  const scraperStale = scraper.ms !== null && Date.now() - scraper.ms > 36 * 3_600_000

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-400 text-xxs tracking-widest">FRESCURA DE DATOS</span>
      </div>

      <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-5">
        <Stat
          label="Precios · actualizado"
          value={pricesAgo}
          tone={pricesAgo === null ? 'neutral' : pricesStale ? 'negative' : 'positive'}
          sub={pricesStale ? 'viejo (>36h)' : 'market-prices.json'}
        />
        <Stat label="INMAG último" value={inmagValue} sub={inmagSub ?? undefined} />
        <Stat
          label="Remates próximos"
          value={proximos === null ? null : nf(proximos)}
          sub={rematesTotal === null ? undefined : `${nf(rematesTotal)} en catálogo`}
        />
        <Stat
          label="Hoy / en vivo"
          value={proximos === null ? null : `${nf(hoy)} / ${nf(enVivo)}`}
          tone={enVivo > 0 ? 'live' : 'emphasis'}
          sub={enVivo > 0 ? 'transmitiendo' : 'remates hoy'}
        />
        <Stat
          label="Frigoríficos"
          value={frigosTotal === null ? null : nf(frigosTotal)}
          sub={frigosProvincias === null ? undefined : `${nf(frigosProvincias)} provincias`}
        />
        <Stat
          label="Scraper · última"
          value={scraper.ms === null ? null : ago(scraper.ms)}
          tone={scraper.ms === null ? 'neutral' : scraperStale ? 'negative' : scraperOk ? 'positive' : 'warning'}
          sub={
            scraper.ms === null
              ? 'sin corridas'
              : scraperStale
                ? 'datos sin refrescar'
                : scraper.status
                  ? scraper.status.toUpperCase()
                  : undefined
          }
        />
      </div>
    </div>
  )
}
