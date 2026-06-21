'use client'

/* ==================================================================
   PriceLineChart — gráfico de línea interactivo, terminal-dark
   ------------------------------------------------------------------
   Reutilizable para cualquier serie $/precio con fecha. Muestra:
   - Escala Y completa (min/max reales de la serie con padding).
   - Tooltip al hover con PRECIO + FECHA del punto más cercano.
   - Línea + área + grilla, sin dependencias de red ni de framer-motion.

   Responsive: el SVG usa coordenadas internas fijas y
   preserveAspectRatio="none" en el área/grilla horizontal, pero el
   posicionamiento de puntos se calcula en un viewBox 0..1000 x 0..H
   para mantener trazo nítido (vectorEffect non-scaling-stroke).
   ================================================================== */

import { useMemo, useRef, useState, useCallback } from 'react'

export interface PricePoint {
  date: string
  value: number
}

interface PriceLineChartProps {
  data: PricePoint[]
  /** Altura del área de gráfico en px (sin contar ejes externos). */
  height?: number
  /** Color de acento (línea/área/punto). */
  accentColor?: string
  /** Decimales para el precio en el tooltip y ejes. */
  decimals?: number
  /** Prefijo del valor (ej. "$"). */
  prefix?: string
  /** Sufijo del valor (ej. " /kg"). */
  suffix?: string
  className?: string
}

const VW = 1000 // ancho interno del viewBox

function fmtNum(n: number, decimals: number): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDateLong(iso: string): string {
  // iso "2026-06-19" -> "19 jun 26"
  const [y, m, d] = iso.split('-')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  if (!y || !m || !d) return iso
  return `${d} ${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

export function PriceLineChart({
  data,
  height = 200,
  accentColor = '#34d399',
  decimals = 0,
  prefix = '$',
  suffix = '',
  className = '',
}: PriceLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const geo = useMemo(() => {
    if (!data.length) return null
    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.08 || Math.max(max * 0.02, 1)
    const lo = min - pad
    const hi = max + pad
    const span = hi - lo || 1

    const padL = 0
    const innerW = VW
    const n = data.length

    const pts = data.map((d, i) => ({
      x: padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
      y: height - ((d.value - lo) / span) * height,
      value: d.value,
      date: d.date,
    }))

    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${height} L ${pts[0].x.toFixed(2)} ${height} Z`

    return { pts, line, area, min, max, lo, hi, span }
  }, [data, height])

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !geo) return
      const rect = svgRef.current.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const x = ratio * VW
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

  const gradId = useMemo(
    () => `plc-${accentColor.replace('#', '')}-${Math.round(height)}`,
    [accentColor, height]
  )

  if (!geo) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-xxs text-zinc-600 font-terminal">Sin datos para graficar.</span>
      </div>
    )
  }

  const hovered = hoverIdx !== null ? geo.pts[hoverIdx] : null
  const lastPoint = geo.pts[geo.pts.length - 1]
  // posición horizontal del tooltip en %
  const tipLeftPct = hovered ? (hovered.x / VW) * 100 : 0

  return (
    <div className={`relative ${className}`}>
      {/* Eje Y: max arriba, min abajo */}
      <div className="absolute left-1 top-0 text-xxs font-terminal tabular-nums text-zinc-600 z-10 pointer-events-none">
        {prefix}
        {fmtNum(geo.max, decimals)}
        {suffix}
      </div>
      <div className="absolute left-1 bottom-0 text-xxs font-terminal tabular-nums text-zinc-600 z-10 pointer-events-none">
        {prefix}
        {fmtNum(geo.min, decimals)}
        {suffix}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute top-0 z-20 -translate-x-1/2 pointer-events-none"
          style={{ left: `clamp(60px, ${tipLeftPct}%, calc(100% - 60px))` }}
        >
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-terminal px-2 py-1 shadow-lg whitespace-nowrap">
            <div className="text-xxs text-zinc-400 font-terminal">{fmtDateLong(hovered.date)}</div>
            <div className="text-data font-terminal tabular-nums text-zinc-100 font-semibold">
              {prefix}
              {fmtNum(hovered.value, decimals)}
              {suffix}
            </div>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="cursor-crosshair block"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grilla horizontal */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={height * f}
            x2={VW}
            y2={height * f}
            stroke="#27272a"
            strokeWidth="1"
            strokeDasharray="3,4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Área */}
        <path d={geo.area} fill={`url(#${gradId})`} />

        {/* Línea */}
        <path
          d={geo.line}
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
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
            y2={height}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Punto hover o punto final */}
        {hovered ? (
          <circle cx={hovered.x} cy={hovered.y} r="4" fill={accentColor} stroke="#0a0a0f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ) : (
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill={accentColor} vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {/* Eje X: primera / última fecha */}
      <div className="flex justify-between mt-1 text-xxs font-terminal text-zinc-600 tabular-nums">
        <span>{fmtDateLong(data[0].date)}</span>
        <span>{fmtDateLong(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}
