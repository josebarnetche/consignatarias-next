import Link from 'next/link'
import { fetchInmagUsdJoined, aggregateMonthly } from '@/lib/charts/data'
import { lineChartSvg } from '@/lib/charts/svg'

/**
 * Year-over-year overlay: same calendar months across multiple years.
 * Server component, SSG-friendly, no client JS.
 *
 * Medido en USD (INMAG ÷ dólar blue), no en pesos: la inflación neutraliza
 * cualquier comparación interanual en ARS — las líneas sólo "explotan" hacia
 * arriba y no se compara nada. En dólares se superponen y recién ahí se lee la
 * estacionalidad y el cambio real año contra año.
 */
export async function YearOverYearBlock() {
  const today = new Date()
  const sixYearsAgo = new Date()
  sixYearsAgo.setUTCFullYear(today.getUTCFullYear() - 5)
  const fromIso = `${sixYearsAgo.getUTCFullYear()}-01-01`
  const toIso = today.toISOString().slice(0, 10)

  const rows = await fetchInmagUsdJoined(fromIso, toIso)
  if (rows.length === 0) return null

  const monthly = aggregateMonthly(rows, (r) => r.inmag_usd)
  if (monthly.length === 0) return null

  // Build one series per year, x-axis = month, y-axis = INMAG en USD/kg
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
    yLabel: 'INMAG USD/kg (promedio mensual)',
    formatY: (v) => `US$${v.toFixed(2)}`,
  })

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">Comparable mes a mes — últimos años (USD)</div>
      <div className="px-panel py-4" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="px-panel pb-3 text-zinc-500 text-xxs">
        Cada línea es un año, en dólares (INMAG ÷ dólar blue). Medido en USD la
        inflación no distorsiona: los años se superponen y recién ahí se lee la
        estacionalidad y el cambio real interanual.{' '}
        <Link
          href="/mercado/inmag-dolares"
          className="text-sky-400 hover:underline underline-offset-2"
        >
          Ver INMAG en dólares (serie completa)
        </Link>
        .
      </div>
    </div>
  )
}
