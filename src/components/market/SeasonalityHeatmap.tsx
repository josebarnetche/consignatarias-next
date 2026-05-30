import { fetchInmagSeries, aggregateMonthly, withYearZScores } from '@/lib/charts/data'
import { heatmapSvg } from '@/lib/charts/svg'
import SeasonalityView from './SeasonalityView'

const RECENT_YEARS = 3 // free window — enough to read the seasonal pattern

/**
 * Seasonality heatmap: mes × año, color por z-score per year.
 * Server-rendered SVG, SSG-friendly. Free users see the recent years; PRO
 * unlocks the full decade (gate handled client-side in SeasonalityView).
 */
export async function SeasonalityHeatmap() {
  const today = new Date().toISOString().slice(0, 10)
  const fromIso = '2015-01-01'

  const rows = await fetchInmagSeries(fromIso, today)
  if (rows.length === 0) return null

  const monthly = aggregateMonthly(rows, (r) => r.inmag)
  const withZ = withYearZScores(monthly)
  const cells = withZ.map((m) => ({
    year: m.year,
    month: m.month,
    value: m.value,
    zScore: m.zScore,
  }))

  const allYears = Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => a - b)
  const recentYears = allYears.slice(-RECENT_YEARS)
  const recentCells = cells.filter((c) => recentYears.includes(c.year))

  const opts = { cellSize: 40, formatCell: () => '' }
  const fullSvg = heatmapSvg(cells, opts)
  const recentSvg = heatmapSvg(recentCells, opts)

  return (
    <div className="terminal-panel relative overflow-hidden">
      <div className="terminal-panel-header">
        Estacionalidad — INMAG mes × año (z-score)
      </div>
      <SeasonalityView
        recentSvg={recentSvg}
        fullSvg={fullSvg}
        recentYears={RECENT_YEARS}
        fullFromYear={allYears[0]}
      />
      <div className="px-panel pb-3 text-zinc-500 text-xxs">
        Z-score por año (azul = sobre promedio anual, rosa = bajo). Sin el
        ruido de la inflación, el patrón estacional emerge.
      </div>
    </div>
  )
}
