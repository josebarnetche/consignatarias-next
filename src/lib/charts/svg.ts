/**
 * Server-rendered SVG chart primitives. Zero client JS, fully SSG-friendly,
 * indexable as inline content by Google. Style matches the terminal aesthetic.
 */

export interface SeriesPoint {
  date: string // ISO YYYY-MM-DD
  value: number
}

export interface Series {
  label: string
  color: string
  points: SeriesPoint[]
}

export interface LineChartProps {
  series: Series[]
  width?: number
  height?: number
  padding?: { top: number; right: number; bottom: number; left: number }
  yLabel?: string
  // When true, force the Y axis to start at 0
  yZero?: boolean
  // Number formatter for Y axis ticks
  formatY?: (v: number) => string
}

const DEFAULT_PADDING = { top: 16, right: 16, bottom: 32, left: 56 }
const fmtThousands = (v: number) => v.toLocaleString('es-AR', { maximumFractionDigits: 0 })

/**
 * Build SVG markup for a multi-series line chart.
 * Returns a string ready to be `dangerouslySetInnerHTML`'d.
 */
export function lineChartSvg(props: LineChartProps): string {
  const W = props.width ?? 800
  const H = props.height ?? 320
  const P = props.padding ?? DEFAULT_PADDING
  const innerW = W - P.left - P.right
  const innerH = H - P.top - P.bottom
  const fmt = props.formatY ?? fmtThousands

  const allPoints = props.series.flatMap((s) => s.points)
  if (allPoints.length === 0) return emptyChart(W, H, 'Sin datos')

  const xs = allPoints.map((p) => new Date(p.date).getTime())
  const ys = allPoints.map((p) => p.value)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = props.yZero ? 0 : Math.min(...ys)
  const yMaxRaw = Math.max(...ys)
  // Pad y axis 5% above max
  const yMax = yMaxRaw + (yMaxRaw - yMin) * 0.05
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || 1

  const x = (date: string) =>
    P.left + ((new Date(date).getTime() - xMin) / xSpan) * innerW
  const y = (v: number) => P.top + innerH - ((v - yMin) / ySpan) * innerH

  // Gridlines and Y ticks (5 ticks)
  const yTicks = 5
  const gridLines: string[] = []
  const yLabels: string[] = []
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + ((yMax - yMin) * i) / yTicks
    const py = y(v)
    gridLines.push(
      `<line x1="${P.left}" x2="${W - P.right}" y1="${py}" y2="${py}" stroke="#27272a" stroke-width="0.5" />`,
    )
    yLabels.push(
      `<text x="${P.left - 6}" y="${py + 3}" font-size="10" fill="#71717a" text-anchor="end" font-family="ui-monospace,Menlo,monospace">${fmt(v)}</text>`,
    )
  }

  // X axis: pick 5 ticks at evenly-spaced timestamps
  const xTicks = 5
  const xLabels: string[] = []
  for (let i = 0; i <= xTicks; i++) {
    const t = xMin + (xSpan * i) / xTicks
    const d = new Date(t)
    const px = P.left + (innerW * i) / xTicks
    const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    xLabels.push(
      `<text x="${px}" y="${H - P.bottom + 14}" font-size="10" fill="#71717a" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">${label}</text>`,
    )
  }

  // Series paths
  const paths = props.series
    .map((s) => {
      if (s.points.length === 0) return ''
      const d = s.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`)
        .join(' ')
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="1.5" />`
    })
    .join('\n')

  // Legend (top-right inside chart)
  const legendItems = props.series
    .map(
      (s, i) =>
        `<g transform="translate(${W - P.right - 120}, ${P.top + 4 + i * 16})">
          <rect width="10" height="10" fill="${s.color}" />
          <text x="14" y="9" font-size="10" fill="#a1a1aa" font-family="ui-monospace,Menlo,monospace">${escapeXml(s.label)}</text>
        </g>`,
    )
    .join('\n')

  const yLabelText = props.yLabel
    ? `<text x="${P.left}" y="${P.top - 4}" font-size="10" fill="#71717a" font-family="ui-monospace,Menlo,monospace">${escapeXml(props.yLabel)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${escapeXml(props.series.map((s) => s.label).join(', '))}">
    ${gridLines.join('\n')}
    ${yLabels.join('\n')}
    ${xLabels.join('\n')}
    ${paths}
    ${legendItems}
    ${yLabelText}
  </svg>`
}

/** Sparkline — tiny inline line chart. */
export function sparklineSvg(
  values: number[],
  options: { width?: number; height?: number; color?: string; baseline?: 'min' | 'zero' } = {},
): string {
  const W = options.width ?? 120
  const H = options.height ?? 32
  const color = options.color ?? '#38bdf8'
  if (values.length < 2) return emptyChart(W, H, '—')

  const minVal = options.baseline === 'zero' ? 0 : Math.min(...values)
  const maxVal = Math.max(...values)
  const span = maxVal - minVal || 1

  const x = (i: number) => (i / (values.length - 1)) * W
  const y = (v: number) => H - ((v - minVal) / span) * H

  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" />
  </svg>`
}

/** Heatmap — month×year grid with cell color derived from z-score. */
export interface HeatmapCell {
  year: number
  month: number // 1-12
  value: number
  zScore?: number
}

export function heatmapSvg(
  cells: HeatmapCell[],
  options: {
    width?: number
    cellSize?: number
    colorScale?: (z: number) => string
    monthLabels?: string[]
    formatCell?: (c: HeatmapCell) => string
  } = {},
): string {
  if (cells.length === 0) return emptyChart(options.width ?? 600, 200, 'Sin datos')

  const cellSize = options.cellSize ?? 32
  const monthLabels = options.monthLabels ?? [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]
  const years = Array.from(new Set(cells.map((c) => c.year))).sort()
  const yLabelW = 40
  const xLabelH = 18
  const W = yLabelW + 12 * cellSize + 8
  const H = xLabelH + years.length * cellSize + 8

  const scale =
    options.colorScale ??
    ((z: number) => {
      // Red (high) → zinc (mid) → blue (low). z in approx -2..+2 range.
      const clamped = Math.max(-2, Math.min(2, z))
      if (clamped >= 0) {
        // 0 → zinc-700, +2 → sky-400
        const t = clamped / 2
        return `rgba(56, 189, 248, ${0.15 + t * 0.7})`
      } else {
        const t = -clamped / 2
        return `rgba(244, 114, 182, ${0.15 + t * 0.7})`
      }
    })

  const fmtCell = options.formatCell ?? ((c) => c.value.toFixed(0))

  // Cell map for O(1) lookup
  const cellMap = new Map<string, HeatmapCell>()
  for (const c of cells) cellMap.set(`${c.year}-${c.month}`, c)

  const monthHeaders = monthLabels
    .map(
      (m, i) =>
        `<text x="${yLabelW + i * cellSize + cellSize / 2}" y="${xLabelH - 4}" font-size="10" fill="#71717a" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">${m}</text>`,
    )
    .join('\n')

  const rows = years
    .map((year, yi) => {
      const rowY = xLabelH + yi * cellSize
      const yearLabel = `<text x="${yLabelW - 6}" y="${rowY + cellSize / 2 + 3}" font-size="10" fill="#a1a1aa" text-anchor="end" font-family="ui-monospace,Menlo,monospace">${year}</text>`
      const yearCells = monthLabels
        .map((_, mi) => {
          const month = mi + 1
          const c = cellMap.get(`${year}-${month}`)
          if (!c) {
            return `<rect x="${yLabelW + mi * cellSize}" y="${rowY}" width="${cellSize - 1}" height="${cellSize - 1}" fill="#0a0a0f" stroke="#27272a" stroke-width="0.5" />`
          }
          const fill = scale(c.zScore ?? 0)
          const txt = fmtCell(c)
          return `<rect x="${yLabelW + mi * cellSize}" y="${rowY}" width="${cellSize - 1}" height="${cellSize - 1}" fill="${fill}" stroke="#27272a" stroke-width="0.5">
            <title>${year}-${String(month).padStart(2, '0')}: ${escapeXml(txt)} (z=${(c.zScore ?? 0).toFixed(2)})</title>
          </rect>
          <text x="${yLabelW + mi * cellSize + cellSize / 2}" y="${rowY + cellSize / 2 + 3}" font-size="9" fill="#e4e4e7" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" pointer-events="none">${escapeXml(txt)}</text>`
        })
        .join('\n')
      return `${yearLabel}\n${yearCells}`
    })
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Heatmap mes por año">
    ${monthHeaders}
    ${rows}
  </svg>`
}

function emptyChart(w: number, h: number, text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <text x="${w / 2}" y="${h / 2}" font-size="11" fill="#52525b" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">${escapeXml(text)}</text>
  </svg>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
