import { fetchInmagSeries, aggregateMonthly, withYearZScores } from '@/lib/charts/data'
import { heatmapSvg } from '@/lib/charts/svg'
import { ProOverlay } from './ProOverlay'

/**
 * Seasonality heatmap: mes × año, color por z-score per year.
 * Server-rendered SVG, PRO gate is purely visual (data is public anyway).
 * SSG-friendly: zero per-request work.
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

  const svg = heatmapSvg(cells, {
    cellSize: 40,
    formatCell: () => '',
  })

  return (
    <div className="terminal-panel relative overflow-hidden">
      <div className="terminal-panel-header">
        Estacionalidad — INMAG mes × año (z-score)
      </div>
      <div className="px-panel py-4 relative">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <ProOverlay
          title="Función PRO Usuario"
          description="Mapa de calor mes × año con el INMAG normalizado por z-score anual. Quita el ruido inflacionario y muestra el ciclo real del mercado."
          cta="Activar PRO — ARS $7.900/mes →"
        />
      </div>
      <div className="px-panel pb-3 text-zinc-500 text-xxs">
        Z-score por año (azul = sobre promedio anual, rosa = bajo). Sin el
        ruido de la inflación, el patrón estacional emerge.
      </div>
    </div>
  )
}
