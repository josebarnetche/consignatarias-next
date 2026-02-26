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

/**
 * Map a value within [min, max] to one of 8 block characters.
 * ▁▂▃▄▅▆▇█
 */
function barChar(value: number, min: number, max: number): string {
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588']
  if (max === min) return blocks[7]
  const idx = Math.round(((value - min) / (max - min)) * 7)
  return blocks[Math.min(Math.max(idx, 0), 7)]
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
          <span>
            MERCADO <span className="text-slate-600 mx-1">&mdash;</span> INDICES Y PRECIOS DE REFERENCIA
          </span>
          <span className="text-slate-500 tabular-nums normal-case tracking-normal">
            Ult: {fmtUpdate(lastUpdate)}
          </span>
        </div>
      </div>

      {/* ── Top row: INMAG hero + Macro references ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px">

        {/* -- INMAG panel (2/3 width) -- */}
        <div className="terminal-panel md:col-span-2">
          <div className="terminal-panel-header">
            INMAG <span className="text-slate-600 mx-1">&mdash;</span> INDICE NOVILLO MAG
          </div>
          <div className="px-panel py-3">
            {/* Hero number */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-2xl font-terminal tabular-nums text-positive glow-positive font-semibold leading-none">
                {fmt(inmag.current, 2)}
              </span>
              <span className="text-xxs text-slate-500 uppercase tracking-wider">
                {inmag.unit}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-data val-positive font-terminal tabular-nums">
                {'\u25B2'} +{fmt(inmag.change, 1)}%
              </span>
              <span className="text-xxs text-slate-600">vs ant.</span>
            </div>

            {/* ASCII bar chart */}
            <div className="font-terminal text-data leading-tight">
              {/* Spark line using block chars */}
              <div className="flex items-end gap-0 mb-1">
                {series.map((pt) => {
                  const char = barChar(pt.value, seriesMin, seriesMax)
                  // Scale height: min bar ~1 line, max bar ~7 lines via repeated chars
                  const level = Math.round(((pt.value - seriesMin) / (seriesMax - seriesMin || 1)) * 6) + 1
                  const column = char.repeat(level)
                  return (
                    <div key={pt.date} className="flex flex-col items-center" style={{ width: '3ch' }}>
                      <span className="text-positive leading-none whitespace-pre" style={{ writingMode: 'vertical-lr', letterSpacing: '-0.15em', fontSize: '0.8rem' }}>
                        {column}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Date labels */}
              <div className="flex gap-0 text-xxs text-slate-600">
                {series.map((pt) => (
                  <div key={pt.date} className="text-center" style={{ width: '3ch' }}>
                    {shortDate(pt.date)}
                  </div>
                ))}
              </div>
              {/* Value labels */}
              <div className="flex gap-0 text-xxs text-slate-700 mt-px">
                {series.map((pt) => (
                  <div key={pt.date} className="text-center tabular-nums" style={{ width: '3ch' }}>
                    {Math.round(pt.value / 100)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* -- Macro references (1/3 width) -- */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">REFERENCIAS MACRO</div>
          <div className="px-panel py-3 space-y-4">

            {/* Corn */}
            <div className="terminal-stat">
              <span className="terminal-stat-label">MAIZ</span>
              <div className="flex items-baseline gap-2">
                <span className="terminal-stat-value tabular-nums">
                  {fmt(corn.current, 2)}
                </span>
                <span className="text-xxs text-slate-500">{corn.unit}</span>
                <span className="text-data val-positive tabular-nums ml-auto">
                  {'\u25B2'}{fmt(corn.change, 1)}%
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
                <span className="text-xxs text-slate-500">{usdBlue.unit}</span>
                <span className="text-data val-positive tabular-nums ml-auto">
                  {'\u25B2'}{fmt(usdBlue.change, 1)}%
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
                <span className="text-xxs text-slate-500">kg/tn</span>
              </div>
              <span className="text-xxs text-slate-600 mt-0.5">(INMAG / MAIZ)</span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Categories table ────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">PRECIOS POR CATEGORIA</div>
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
                  <tr key={cat.name}>
                    <td className="font-semibold text-slate-200">{cat.name}</td>
                    <td className="num tabular-nums text-slate-100">{fmt(cat.current)}</td>
                    <td className="num tabular-nums text-slate-500">{fmt(cat.prev)}</td>
                    <td className={`num tabular-nums ${isPositive ? 'val-positive' : 'val-negative'}`}>
                      {isPositive ? '\u25B2' : '\u25BC'} {isPositive ? '+' : ''}{fmt(cat.change, 1)}%
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <div className="h-2.5 flex-1 bg-slate-800 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-positive/60"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-xxs text-slate-600 tabular-nums w-[3ch] text-right">
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

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="px-panel py-cell">
          <p className="terminal-tag-warning inline-flex text-xxs leading-relaxed">
            DISCLAIMER: Datos de muestra para demostracion. No usar como referencia de mercado. Fuente real: Mercado Agroganadero.
          </p>
        </div>
      </div>

    </div>
  )
}
