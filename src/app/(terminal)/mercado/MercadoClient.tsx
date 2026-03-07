import marketData from '@/lib/data/market-prices.json'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SeriesPoint {
  date: string
  value: number
}

interface CategoryData {
  current: number
  prev: number
  change: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a number with locale thousands separator: 2872 -> "2,872" */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Short date label from ISO string: "2026-01-05" -> "E05" */
function shortDate(iso: string): string {
  const monthMap: Record<string, string> = {
    '01': 'E',
    '02': 'F',
    '03': 'M',
    '04': 'A',
    '05': 'M',
    '06': 'J',
    '07': 'J',
    '08': 'A',
    '09': 'S',
    '10': 'O',
    '11': 'N',
    '12': 'D',
  }
  const parts = iso.split('-')
  return (monthMap[parts[1]] ?? '?') + parts[2]
}

/** Compute CSS bar height (4–120 px) proportional to value within [min, max] */
function barHeight(value: number, min: number, max: number): number {
  if (max === min) return 120
  const ratio = (value - min) / (max - min)
  return Math.round(4 + ratio * 116) // 4px min, 120px max
}

/** Format the lastUpdate timestamp: "2026-02-26T14:00:00-03:00" -> "26 FEB 14h" */
function fmtUpdate(iso: string): string {
  const d = new Date(iso)
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const day = d.getDate().toString().padStart(2, '0')
  const month = months[d.getMonth()]
  const hour = d.getHours().toString().padStart(2, '0')
  return `${day} ${month} ${hour}h`
}

/* ------------------------------------------------------------------ */
/*  Data preparation                                                   */
/* ------------------------------------------------------------------ */

const inmag = marketData.inmag
const series: SeriesPoint[] = inmag.series
const categories = marketData.categories as Record<string, CategoryData>
const corn = marketData.corn
const usdBlue = marketData.usdBlue
const lastUpdate = marketData.lastUpdate

// INMAG / corn ratio (invernada/maiz relationship)
const ratio = inmag.current / corn.current

// Category table sorted by current price descending
const categoryRows = Object.entries(categories)
  .map(([key, data]) => ({ name: key.toUpperCase(), ...data }))
  .sort((a, b) => b.current - a.current)

const maxCategoryPrice = Math.max(...categoryRows.map((c) => c.current))

// Series min/max for the spark chart
const seriesMin = Math.min(...series.map((s) => s.value))
const seriesMax = Math.max(...series.map((s) => s.value))

/* ------------------------------------------------------------------ */
/*  Page component (Server Component)                                  */
/* ------------------------------------------------------------------ */
export default function MercadoPage() {
  return (
    <div className="px-4 py-4 max-w-6xl mx-auto space-y-px">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="section-heading">
            MERCADO <span className="text-zinc-600 mx-1">&mdash;</span> INDICES Y PRECIOS DE REFERENCIA
          </span>
          <span className="text-zinc-500 tabular-nums normal-case tracking-normal">
            Ult: {fmtUpdate(lastUpdate)}
          </span>
        </div>
      </div>

      {/* ── Top row: INMAG hero + Macro references ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px">

        {/* -- INMAG panel (2/3 width) -- */}
        <div className={`terminal-panel md:col-span-2${inmag.change >= 0 ? ' shadow-live-glow' : ''}`}>
          <div className="terminal-panel-header font-heading">
            INMAG <span className="text-zinc-600 mx-1">&mdash;</span> INDICE NOVILLO MAG
          </div>
          <div className="px-panel py-3">
            {/* Hero number */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-terminal tabular-nums text-positive glow-positive font-semibold leading-none stat-countup">
                {fmt(inmag.current, 2)}
              </span>
              <span className="text-xxs text-zinc-500 uppercase tracking-wider">
                {inmag.unit}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-data font-terminal tabular-nums ${inmag.change >= 0 ? 'val-positive' : 'val-negative'}`}>
                {inmag.change >= 0 ? '\u25B2' : '\u25BC'} {inmag.change >= 0 ? '+' : ''}{fmt(inmag.change, 1)}%
              </span>
              <span className="text-xxs text-zinc-600">vs ant.</span>
            </div>

            {/* CSS bar chart */}
            <div className="font-terminal text-data leading-tight">
              {/* Bar columns */}
              <div className="flex items-end gap-px mb-1" style={{ height: '120px' }}>
                {series.map((pt) => {
                  const h = barHeight(pt.value, seriesMin, seriesMax)
                  return (
                    <div
                      key={pt.date}
                      className="group relative flex-1 min-w-0 rounded-t-sm transition-opacity hover:opacity-80"
                      style={{
                        height: `${h}px`,
                        background: 'linear-gradient(to top, #059669, #34d399)',
                      }}
                    >
                      {/* Tooltip on hover */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-900 border border-zinc-700 text-zinc-200 text-xxs tabular-nums px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {fmt(pt.value, 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Date labels */}
              <div className="flex gap-px text-xxs text-zinc-600">
                {series.map((pt) => (
                  <div key={pt.date} className="flex-1 min-w-0 text-center truncate">
                    {shortDate(pt.date)}
                  </div>
                ))}
              </div>
              {/* Value labels */}
              <div className="flex gap-px text-xxs text-zinc-700 mt-px">
                {series.map((pt) => (
                  <div key={pt.date} className="flex-1 min-w-0 text-center tabular-nums truncate">
                    {Math.round(pt.value / 100)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* -- Macro references (1/3 width) -- */}
        <div className="terminal-panel glass-panel">
          <div className="terminal-panel-header font-heading">REFERENCIAS MACRO</div>
          <div className="px-panel py-3 space-y-4">

            {/* Corn */}
            <div className="terminal-stat">
              <span className="terminal-stat-label">MAIZ</span>
              <div className="flex items-baseline gap-2">
                <span className="terminal-stat-value tabular-nums">
                  {fmt(corn.current, 2)}
                </span>
                <span className="text-xxs text-zinc-500">{corn.unit}</span>
                <span className={`text-data tabular-nums ml-auto ${corn.change >= 0 ? 'val-positive' : 'val-negative'}`}>
                  {corn.change >= 0 ? '\u25B2' : '\u25BC'}{corn.change >= 0 ? '+' : ''}{fmt(corn.change, 1)}%
                </span>
              </div>
            </div>

            {/* USD Blue */}
            <div className="terminal-stat">
              <span className="terminal-stat-label">USD BLUE</span>
              <div className="flex items-baseline gap-2">
                <span className="terminal-stat-value tabular-nums">
                  {fmt(usdBlue.current)}
                </span>
                <span className="text-xxs text-zinc-500">{usdBlue.unit}</span>
                <span className={`text-data tabular-nums ml-auto ${usdBlue.change >= 0 ? 'val-positive' : 'val-negative'}`}>
                  {usdBlue.change >= 0 ? '\u25B2' : '\u25BC'}{usdBlue.change >= 0 ? '+' : ''}{fmt(usdBlue.change, 1)}%
                </span>
              </div>
            </div>

            <div className="terminal-divider" />

            {/* Invernada / Maiz ratio */}
            <div className="terminal-stat">
              <span className="terminal-stat-label">
                RELACION INVERNADA/MAIZ
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="terminal-stat-value tabular-nums">
                  {fmt(ratio, 2)}
                </span>
                <span className="text-xxs text-zinc-500">kg/tn</span>
              </div>
              <span className="text-xxs text-zinc-600 mt-0.5">(INMAG / MAIZ)</span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Categories table ────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header font-heading">PRECIOS POR CATEGORIA</div>
        <div className="overflow-x-auto">
          <table className="terminal-table">
            <thead>
              <tr>
                <th className="w-[160px]">CATEGORIA</th>
                <th className="num">ACTUAL</th>
                <th className="num">ANTERIOR</th>
                <th className="num">VAR %</th>
                <th className="w-[200px]">BARRA</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((cat) => {
                const barPct = Math.round((cat.current / maxCategoryPrice) * 100)
                const isPositive = cat.change >= 0
                return (
                  <tr key={cat.name} className={isPositive ? 'bg-positive/[0.03]' : 'bg-negative/[0.03]'}>
                    <td className="font-semibold text-zinc-200">{cat.name}</td>
                    <td className="num tabular-nums text-zinc-100">{fmt(cat.current)}</td>
                    <td className="num tabular-nums text-zinc-500">{fmt(cat.prev)}</td>
                    <td className={`num tabular-nums ${isPositive ? 'val-positive' : 'val-negative'}`}>
                      {isPositive ? '\u25B2' : '\u25BC'} {isPositive ? '+' : ''}{fmt(cat.change, 1)}%
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <div className="gradient-bar flex-1">
                          <div
                            className={`gradient-bar-fill${isPositive ? '-positive' : '-negative'}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-xxs text-zinc-600 tabular-nums w-[3ch] text-right">
                          {barPct}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Source attribution ─────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="px-panel py-cell flex items-center justify-between">
          <span className="text-xxs text-zinc-600">
            FUENTES: Mercado Agroganadero (MAG), MAGYP, dolarapi.com
          </span>
          <span className="text-xxs text-zinc-600 tabular-nums">
            Ult. act.: {lastUpdate}
          </span>
        </div>
      </div>

    </div>
  )
}
