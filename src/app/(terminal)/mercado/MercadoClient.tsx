import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'
import { PriceLineChart, type PricePoint } from '@/components/charts/PriceLineChart'

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

// Datos para el gráfico de línea interactivo (precio + fecha en hover)
const inmagChartData: PricePoint[] = series.map((s) => ({ date: s.date, value: s.value }))

/* ------------------------------------------------------------------ */
/*  Page component (Server Component)                                  */
/* ------------------------------------------------------------------ */
export default function MercadoPage() {
  return (
    <div className="px-4 py-4 max-w-6xl mx-auto space-y-px">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h1 className="section-heading">
            MERCADO <span className="text-zinc-500 mx-1">&mdash;</span> INDICES Y PRECIOS DE REFERENCIA
          </h1>
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
            INMAG <span className="text-zinc-500 mx-1">&mdash;</span> INDICE NOVILLO MAG
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
              <span className="text-xxs text-zinc-500">vs ant.</span>
            </div>

            {/* Gráfico de línea interactivo: escala completa + tooltip precio/fecha */}
            <PriceLineChart
              data={inmagChartData}
              height={140}
              accentColor="#34d399"
              decimals={0}
              prefix="$"
            />
            {/* Link to detailed INMAG page */}
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <Link href="/mercado/inmag" className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">
                Ver análisis detallado INMAG →
              </Link>
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
              <span className="text-xxs text-zinc-500 mt-0.5">(INMAG / MAIZ)</span>
              <Link href="/mercado/spread" className="text-amber-400 hover:text-amber-300 text-xxs mt-1 block">
                Ver análisis spread →
              </Link>
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
                <th className="w-[110px] sm:w-[160px]">CATEGORIA</th>
                <th className="num">ACTUAL</th>
                <th className="num">ANTERIOR</th>
                <th className="num">VAR %</th>
                <th className="hidden sm:table-cell w-[200px]">BARRA</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((cat) => {
                const barPct = Math.round((cat.current / maxCategoryPrice) * 100)
                const isPositive = cat.change >= 0
                const slug = cat.name.toLowerCase()
                return (
                  <tr key={cat.name} className={`${isPositive ? 'bg-positive/[0.03]' : 'bg-negative/[0.03]'} hover:bg-zinc-800/50 cursor-pointer transition-colors`}>
                    <td className="font-semibold text-zinc-200">
                      <Link href={`/mercado/${slug}`} className="hover:text-amber-400 transition-colors">
                        {cat.name}
                      </Link>
                    </td>
                    <td className="num tabular-nums text-zinc-100">{fmt(cat.current)}</td>
                    <td className="num tabular-nums text-zinc-500">{fmt(cat.prev)}</td>
                    <td className={`num tabular-nums ${isPositive ? 'val-positive' : 'val-negative'}`}>
                      {isPositive ? '\u25B2' : '\u25BC'} {isPositive ? '+' : ''}{fmt(cat.change, 1)}%
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <div className="gradient-bar flex-1">
                          <div
                            className={`gradient-bar-fill${isPositive ? '-positive' : '-negative'}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-xxs text-zinc-500 tabular-nums w-[3ch] text-right">
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

      {/* ── Calculator CTA ──────────────────────────────────────── */}
      <div className="terminal-panel bg-gradient-to-r from-amber-950/20 to-transparent border-amber-800/30">
        <div className="px-panel py-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-zinc-200 font-medium">¿Cuánto vale tu tropa?</span>
            <p className="text-xxs text-zinc-500 mt-0.5">
              Calculá el valor estimado usando los precios INMAG actualizados
            </p>
          </div>
          <Link 
            href="/calculadora" 
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-medium text-sm rounded transition-colors whitespace-nowrap"
          >
            Calcular valor →
          </Link>
        </div>
      </div>

      {/* ── Source attribution ─────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="px-panel py-cell flex items-center justify-between">
          <span className="text-xxs text-zinc-500">
            FUENTES: Mercado Agroganadero (MAG), MAGYP, dolarapi.com
          </span>
          <span className="text-xxs text-zinc-500 tabular-nums">
            Ult. act.: {lastUpdate}
          </span>
        </div>
      </div>

    </div>
  )
}
