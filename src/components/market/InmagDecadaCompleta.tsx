import { fetchInmagSeries, aggregateMonthly, withYearZScores } from '@/lib/charts/data'
import { heatmapSvg } from '@/lib/charts/svg'
import { HeroNumber, StatPill } from '@/components/pro'
import InmagSeasonalityGate from './InmagSeasonalityGate'
import InmagHistoryExport from './InmagHistoryExport'

const RECENT_YEARS = 3 // free window — enough to read the seasonal shape
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface MonthSignal {
  month: number // 1-12
  avgZ: number // average within-year z-score across all years
  samples: number // years with data for this month
}

/**
 * "La década completa" — el producto PRO histórico+estacionalidad del INMAG.
 *
 * Una sola consulta a mag_inmag_history alimenta los dos sub-productos:
 *   1. Estacionalidad mes×año como DECISIÓN (gancho gratis + ranking PRO).
 *   2. Descarga CSV del histórico completo (gated <ProReveal>, count real).
 *
 * Server component async (igual que SeasonalityHeatmap en /mercado). Todos los
 * números salen de la serie real; nada se fabrica.
 */
export async function InmagDecadaCompleta() {
  const today = new Date().toISOString().slice(0, 10)
  const rows = await fetchInmagSeries('2015-01-01', today)
  const cleanRows = rows.filter((r) => r.inmag !== null)

  if (cleanRows.length === 0) {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header">La década completa — histórico + estacionalidad</div>
        <div className="px-panel py-6 text-zinc-500 text-data">
          Todavía no hay serie suficiente para leer el patrón estacional.
        </div>
      </div>
    )
  }

  const monthly = aggregateMonthly(rows, (r) => r.inmag)
  const withZ = withYearZScores(monthly)

  const cells = withZ.map((m) => ({ year: m.year, month: m.month, value: m.value, zScore: m.zScore }))
  const allYears = Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => a - b)
  const fromYear = allYears[0]
  const toYear = allYears[allYears.length - 1]
  const recentYears = allYears.slice(-RECENT_YEARS)
  const recentCells = cells.filter((c) => recentYears.includes(c.year))

  // DECISIÓN: promedio del z-score de cada mes a lo largo de toda la década.
  // z>0 → el mes suele estar caro respecto de su propio año (mejor para vender);
  // z<0 → suele estar barato (peor mes para vender / mejor para comprar).
  const byMonth = new Map<number, number[]>()
  for (const c of withZ) {
    if (!byMonth.has(c.month)) byMonth.set(c.month, [])
    byMonth.get(c.month)!.push(c.zScore)
  }
  const signals: MonthSignal[] = []
  for (let m = 1; m <= 12; m++) {
    const zs = byMonth.get(m) ?? []
    if (zs.length === 0) continue
    signals.push({ month: m, avgZ: zs.reduce((s, v) => s + v, 0) / zs.length, samples: zs.length })
  }

  // Si por algún motivo no hubo meses con muestra suficiente, degradá honesto.
  if (signals.length === 0) {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header">La década completa — histórico + estacionalidad</div>
        <div className="px-panel py-6 text-zinc-500 text-data">
          Serie cargada pero sin meses con datos suficientes para el ranking estacional.
        </div>
        <div className="px-panel pb-5">
          <InmagHistoryExport rowCount={cleanRows.length} fromYear={fromYear} />
        </div>
      </div>
    )
  }

  signals.sort((a, b) => b.avgZ - a.avgZ)
  const best = signals[0]
  const worst = signals[signals.length - 1]
  const currentMonth = new Date().getMonth() + 1
  const current = signals.find((s) => s.month === currentMonth)
  const currentRank = signals.findIndex((s) => s.month === currentMonth) // -1 si sin datos

  const maxAbsZ = Math.max(0.0001, ...signals.map((s) => Math.abs(s.avgZ)))
  const zToPct = (z: number) => Math.round(50 + (z / maxAbsZ) * 50)

  const opts = { cellSize: 40, formatCell: () => '' }
  const recentSvg = heatmapSvg(recentCells, opts)

  const currentReading = current
    ? current.avgZ >= 0.15
      ? `${MONTHS[currentMonth - 1]} está, en promedio, por ENCIMA de su propio año (z ${current.avgZ.toFixed(2)}): históricamente uno de los meses más firmes para vender.`
      : current.avgZ <= -0.15
        ? `${MONTHS[currentMonth - 1]} está, en promedio, por DEBAJO de su propio año (z ${current.avgZ.toFixed(2)}): históricamente un mes flojo — el patrón premia esperar.`
        : `${MONTHS[currentMonth - 1]} es un mes neutro (z ${current.avgZ.toFixed(2)}): el patrón estacional no inclina la balanza ni a vender ni a retener.`
    : 'Sin datos suficientes del mes en curso.'

  const fullPanel = (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {signals.map((s) => (
          <StatPill
            key={s.month}
            label={`${MONTHS[s.month - 1]} · ${s.samples} año${s.samples === 1 ? '' : 's'}`}
            value={zToPct(s.avgZ)}
            tone={s.avgZ >= 0.15 ? 'positive' : s.avgZ <= -0.15 ? 'negative' : 'neutral'}
            suffix=""
          />
        ))}
      </div>
      <div className="border-t border-terminal-border pt-4 grid sm:grid-cols-2 gap-4">
        <HeroNumber
          label="Mejor mes para vender (histórico)"
          value={MONTHS[best.month - 1]}
          sub={`z promedio +${best.avgZ.toFixed(2)} · ${best.samples} años`}
          tone="positive"
        />
        <HeroNumber
          label="Peor mes para vender (histórico)"
          value={MONTHS[worst.month - 1]}
          sub={`z promedio ${worst.avgZ.toFixed(2)} · ${worst.samples} años`}
          tone="negative"
        />
      </div>
      <p className="text-zinc-500 text-xxs">
        La barra mide la firmeza estacional de cada mes (50 = neutro; verde = suele
        estar caro vs. su año, rojo = suele estar barato). Decisión: si tu ventana
        de venta es flexible, corré la hacienda hacia los meses verdes.
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Sub-producto 1 — estacionalidad como decisión */}
      <div className="terminal-panel relative overflow-hidden">
        <div className="terminal-panel-header">Estacionalidad — INMAG mes × año (z-score)</div>
        <InmagSeasonalityGate
          recentSvg={recentSvg}
          recentYears={RECENT_YEARS}
          fullFromYear={fromYear}
          toYear={toYear}
          bestMonth={MONTHS[best.month - 1]}
          worstMonth={MONTHS[worst.month - 1]}
          currentMonth={MONTHS[currentMonth - 1]}
          currentReading={currentReading}
          currentRank={currentRank}
          totalMonths={signals.length}
          fullPanel={fullPanel}
        />
        <div className="px-panel pb-3 text-zinc-500 text-xxs">
          Z-score por año (azul = sobre el promedio de ese año, rosa = por debajo).
          Al medir cada mes contra su propio año, la inflación se cancela y el patrón
          estacional queda limpio. Fuente: Mercado Agroganadero ({fromYear}–{toYear}).
          El patrón histórico no garantiza el resultado de este año.
        </div>
      </div>

      {/* Sub-producto 2 — descarga del histórico completo */}
      <InmagHistoryExport rowCount={cleanRows.length} fromYear={fromYear} />
    </div>
  )
}
