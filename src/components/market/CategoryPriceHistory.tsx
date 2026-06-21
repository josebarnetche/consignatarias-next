'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import marketData from '@/lib/data/market-prices.json'

/* ==================================================================
   CategoryPriceHistory — evolución del precio $/kg vivo por categoría
   ------------------------------------------------------------------
   FUENTE DE DATOS (honestidad ante todo):
   `market-prices.json` solo guarda `.current/.prev/.change` por categoría
   — NO hay una serie histórica por categoría en el archivo estático. La
   única serie diaria disponible server-side es `inmag.series` (INMAG,
   2024→hoy). Para mostrar la evolución de ESTA categoría reescalamos la
   forma del INMAG por el spread vigente de la categoría:

       factor = categoria.current / inmag.current
       valor_categoria(t) ≈ inmag(t) * factor

   Así la línea queda al NIVEL de precio real de la categoría (ej. vacas
   ~2.572, no ~4.283 del INMAG) y el último punto es el precio observado
   real de la categoría. La forma/tendencia es la del INMAG — la UI lo
   declara explícitamente al pie. No inventamos precios diarios por
   categoría que no existen en la fuente.
   ================================================================== */

interface SeriesPoint {
  date: string
  value: number
}

type RangeKey = '3m' | '6m' | '12m' | 'all'

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '12m', label: '12M', days: 365 },
  { key: 'all', label: 'Todo', days: null },
]

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

function fmtDate(iso: string): string {
  const [y, m] = iso.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

/** Fecha completa para el tooltip: "2026-06-19" -> "19 Jun 26". */
function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  if (!y || !m || !d) return iso
  return `${d} ${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

interface CategoryPriceHistoryProps {
  category: string
  /** Precio actual observado de la categoría ($/kg vivo). */
  currentPrice: number
}

export function CategoryPriceHistory({ category, currentPrice }: CategoryPriceHistoryProps) {
  const [range, setRange] = useState<RangeKey>('12m')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const inmagSeries = marketData.inmag.series as SeriesPoint[]
  const inmagCurrent = marketData.inmag.current

  // Reescalar la serie INMAG al nivel de precio de la categoría.
  const scaledSeries = useMemo<SeriesPoint[]>(() => {
    if (!inmagSeries.length || !inmagCurrent || !currentPrice) return []
    const factor = currentPrice / inmagCurrent
    const scaled = inmagSeries.map((p) => ({ date: p.date, value: p.value * factor }))
    // Anclar el último punto al precio observado real de la categoría.
    if (scaled.length) scaled[scaled.length - 1] = { date: scaled[scaled.length - 1].date, value: currentPrice }
    return scaled
  }, [inmagSeries, inmagCurrent, currentPrice])

  // Recorte por rango (puramente client-side sobre la serie estática).
  const series = useMemo<SeriesPoint[]>(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? null
    if (days === null || !scaledSeries.length) return scaledSeries
    const last = scaledSeries[scaledSeries.length - 1].date
    const cutoff = new Date(last)
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    const sliced = scaledSeries.filter((p) => p.date >= cutoffIso)
    return sliced.length >= 2 ? sliced : scaledSeries
  }, [scaledSeries, range])

  const stats = useMemo(() => {
    if (series.length < 2) return null
    const values = series.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const first = series[0].value
    const last = series[series.length - 1].value
    const change = first > 0 ? ((last - first) / first) * 100 : 0
    return { min, max, first, last, change }
  }, [series])

  // Geometría del SVG (viewBox 0..100 en X, 0..100 en Y, sin distorsión vertical).
  const geo = useMemo(() => {
    if (!stats || series.length < 2) return null
    const { min, max } = stats
    const pad = (max - min) * 0.08 || 1
    const lo = min - pad
    const hi = max + pad
    const span = hi - lo || 1
    const pts = series.map((p, i) => ({
      x: (i / (series.length - 1)) * 100,
      y: 100 - ((p.value - lo) / span) * 100,
      ...p,
    }))
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    const area = `${line} L 100 100 L 0 100 Z`
    return { pts, line, area, lo, hi }
  }, [series, stats])

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !geo || geo.pts.length === 0) return
      const rect = svgRef.current.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const x = ratio * 100
      let closest = 0
      let dist = Infinity
      geo.pts.forEach((p, i) => {
        const dd = Math.abs(p.x - x)
        if (dd < dist) {
          dist = dd
          closest = i
        }
      })
      setHoverIdx(closest)
    },
    [geo]
  )
  const handleLeave = useCallback(() => setHoverIdx(null), [])

  if (!stats || !geo) {
    return (
      <div className="terminal-panel p-4">
        <p className="text-data text-zinc-500 font-terminal">Historial de precios no disponible para esta categoría.</p>
      </div>
    )
  }

  const isUp = stats.change >= 0
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? ''
  const lastPoint = geo.pts[geo.pts.length - 1]
  const hovered =
    hoverIdx !== null && hoverIdx < geo.pts.length ? geo.pts[hoverIdx] : null
  const tipLeftPct = hovered ? hovered.x : 0

  return (
    <div className="terminal-panel">
      {/* Header + selector de rango */}
      <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading">Historial de precio · {category}</span>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`px-2 py-1 text-xxs font-terminal rounded-terminal border transition-colors ${
                range === r.key
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-panel py-4">
        {/* Último valor + variación del rango */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Último ($/kg vivo)</div>
            <div className="text-2xl font-terminal tabular-nums text-zinc-100 leading-none">
              ${fmt(stats.last)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Var. {rangeLabel}</div>
            <div className={`text-xl font-terminal tabular-nums leading-none ${isUp ? 'val-positive' : 'val-negative'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(stats.change).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="relative" style={{ height: '180px' }}>
          {/* Eje Y (máx / mín) */}
          <div className="absolute left-0 top-0 text-xxs font-terminal tabular-nums text-zinc-600 z-10">
            ${fmt(stats.max)}
          </div>
          <div className="absolute left-0 bottom-0 text-xxs font-terminal tabular-nums text-zinc-600 z-10">
            ${fmt(stats.min)}
          </div>

          {/* Tooltip al hover: precio + fecha */}
          {hovered && (
            <div
              className="absolute top-0 z-20 -translate-x-1/2 pointer-events-none"
              style={{ left: `clamp(54px, ${tipLeftPct}%, calc(100% - 54px))` }}
            >
              <div className="bg-zinc-900/95 border border-zinc-700 rounded-terminal px-2 py-1 shadow-lg whitespace-nowrap">
                <div className="text-xxs text-zinc-400 font-terminal">{fmtDateFull(hovered.date)}</div>
                <div className="text-data font-terminal tabular-nums text-zinc-100 font-semibold">
                  ${fmt(hovered.value)}
                </div>
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full cursor-crosshair"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <defs>
              <linearGradient id={`catArea-${category}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Líneas guía horizontales */}
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#27272a" strokeWidth="0.4" strokeDasharray="2,2" />
            ))}

            {/* Área */}
            <path d={geo.area} fill={`url(#catArea-${category})`} />

            {/* Línea */}
            <path
              d={geo.line}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Línea vertical de hover */}
            {hovered && (
              <line
                x1={hovered.x}
                y1={0}
                x2={hovered.x}
                y2={100}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
                strokeDasharray="2,3"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Punto: hover o final */}
            {hovered ? (
              <circle cx={hovered.x} cy={hovered.y} r="2.6" fill="#34d399" stroke="#0a0a0f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ) : (
              <circle cx={lastPoint.x} cy={lastPoint.y} r="2.2" fill="#34d399" vectorEffect="non-scaling-stroke" />
            )}
          </svg>
        </div>

        {/* Eje X (primera / última fecha) */}
        <div className="flex justify-between mt-2 text-xxs font-terminal text-zinc-600 tabular-nums">
          <span>{fmtDate(series[0].date)}</span>
          <span>{fmtDate(series[series.length - 1].date)}</span>
        </div>

        {/* Nota de fuente (honestidad sobre el dato) */}
        <p className="mt-4 pt-3 border-t border-terminal-border text-xxs text-zinc-500 leading-relaxed">
          Último valor: precio observado de {category.toLowerCase()} en el Mercado Agroganadero. La curva sigue la
          tendencia del índice INMAG (serie diaria) reescalada al spread vigente de la categoría — referencia de forma,
          no cotización diaria por categoría.
        </p>
      </div>
    </div>
  )
}
