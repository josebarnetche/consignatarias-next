import Link from 'next/link'
import { fetchInmagSeries, aggregateMonthly } from '@/lib/charts/data'
import { lineChartSvg } from '@/lib/charts/svg'

/**
 * Year-over-year overlay: same calendar months across multiple years.
 * Server component, SSG-friendly, no client JS.
 */
export async function YearOverYearBlock() {
  const today = new Date()
  const sixYearsAgo = new Date()
  sixYearsAgo.setUTCFullYear(today.getUTCFullYear() - 5)
  const fromIso = `${sixYearsAgo.getUTCFullYear()}-01-01`
  const toIso = today.toISOString().slice(0, 10)

  const rows = await fetchInmagSeries(fromIso, toIso)
  if (rows.length === 0) return null

  const monthly = aggregateMonthly(rows, (r) => r.inmag)
  if (monthly.length === 0) return null

  // Build one series per year, x-axis = month, y-axis = INMAG
  const years = Array.from(new Set(monthly.map((m) => m.year))).sort()
  const palette = ['#52525b', '#71717a', '#a1a1aa', '#38bdf8', '#fbbf24', '#34d399']
  const COLORS = palette.slice(-Math.min(years.length, palette.length))

  const series = years.slice(-6).map((y, idx) => {
    const points = monthly
      .filter((m) => m.year === y)
      .map((m) => ({
        // Use a synthetic 2000 base year so the X axis aligns months across years
        date: `2000-${String(m.month).padStart(2, '0')}-15`,
        value: m.value,
      }))
    return {
      label: String(y),
      color: COLORS[idx % COLORS.length],
      points,
    }
  })

  const svg = lineChartSvg({
    series,
    height: 260,
    yLabel: 'INMAG ARS/kg (promedio mensual)',
    formatY: (v) => `$${(v / 1000).toFixed(1)}k`,
  })

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">Comparable mes a mes — últimos años</div>
      <div className="px-panel py-4" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="px-panel pb-3 text-zinc-500 text-xxs">
        Cada línea es un año. Misma escala vertical: la inflación hace que los
        años recientes parezcan &ldquo;explotar&rdquo;. Para ver la realidad
        sin devaluación,{' '}
        <Link
          href="/mercado/inmag-dolares"
          className="text-sky-400 hover:underline underline-offset-2"
        >
          mirá la versión en dólares
        </Link>
        .
      </div>
    </div>
  )
}
