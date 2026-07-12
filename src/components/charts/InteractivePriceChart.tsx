'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DataPoint {
  date: string
  value: number
  volume?: number
}

interface ChartPoint {
  x: number
  y: number
  value: number
  date: string
  volume: number
  volumeHeight?: number
}

interface InteractivePriceChartProps {
  data: DataPoint[]
  height?: number
  accentColor?: string
  showVolume?: boolean
  className?: string
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

const RANGE_CONFIG: Record<TimeRange, { label: string; days: number | null }> = {
  '7d': { label: '7D', days: 7 },
  '30d': { label: '30D', days: 30 },
  '90d': { label: '90D', days: 90 },
  '1y': { label: '1A', days: 365 },
  'all': { label: 'Todo', days: null },
}

export function InteractivePriceChart({ 
  data: initialData, 
  height = 320,
  accentColor = '#38bdf8',
  showVolume = true,
  className = '',
}: InteractivePriceChartProps) {
  const [range, setRange] = useState<TimeRange>('30d')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch data when range changes
  useEffect(() => {
    const days = RANGE_CONFIG[range].days
    if (days === 30) {
      setData(initialData)
      return
    }
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/market/history?days=${days || 365}`)
        const json = await res.json()
        setData(json.series || [])
      } catch (e) {
        console.error('Failed to fetch:', e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [range, initialData])

  // Chart dimensions — memoized so it's a stable dependency for the path useMemo below
  const padding = useMemo(
    () => ({ top: 20, right: 16, bottom: showVolume ? 60 : 30, left: 70 }),
    [showVolume]
  )
  const chartHeight = height - padding.top - padding.bottom
  const volumeHeight = showVolume ? 40 : 0

  // Catmull-Rom spline function (defined outside useMemo)
  const catmullRomSpline = (pts: ChartPoint[], tension = 0.3): string => {
    if (pts.length < 2) return ''
    let path = `M ${pts[0].x} ${pts[0].y}`
    
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(pts.length - 1, i + 2)]
      
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    
    return path
  }

  // Calculate chart paths and scales
  const { 
    linePath, 
    areaPath, 
    points, 
    minVal, 
    maxVal, 
    priceScale,
    volumeData,
  } = useMemo((): {
    linePath: string
    areaPath: string
    points: ChartPoint[]
    minVal: number
    maxVal: number
    priceScale: (v: number) => number
    volumeData: ChartPoint[]
  } => {
    if (!data.length) return { 
      linePath: '', 
      areaPath: '', 
      points: [], 
      minVal: 0, 
      maxVal: 0, 
      priceScale: () => 0,
      volumeData: [],
    }

    const values = data.map(d => d.value)
    const min = Math.min(...values) * 0.995
    const max = Math.max(...values) * 1.005
    const rangeVal = max - min || 1

    const volumes = data.map(d => d.volume || 0)
    const maxVol = Math.max(...volumes) || 1

    const scale = (v: number): number => chartHeight - volumeHeight - ((v - min) / rangeVal) * (chartHeight - volumeHeight)

    const pts: ChartPoint[] = data.map((d, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * (typeof window !== 'undefined' ? (containerRef.current?.offsetWidth || 800) - padding.left - padding.right : 800 - padding.left - padding.right),
      y: padding.top + scale(d.value),
      value: d.value,
      date: d.date,
      volume: d.volume || 0,
    }))

    const line = catmullRomSpline(pts)
    const area = pts.length 
      ? `${line} L ${pts[pts.length - 1].x} ${height - padding.bottom} L ${pts[0].x} ${height - padding.bottom} Z`
      : ''

    return { 
      linePath: line, 
      areaPath: area, 
      points: pts, 
      minVal: min, 
      maxVal: max,
      priceScale: scale,
      volumeData: pts.map(p => ({ ...p, volumeHeight: (p.volume / maxVol) * volumeHeight })),
    }
  }, [data, height, chartHeight, volumeHeight, padding])

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !points.length) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Find closest point
    let closestIdx = 0
    let closestDist = Infinity
    
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    })
    
    setHoveredIndex(closestIdx)
  }, [points])

  const handleMouseLeave = () => setHoveredIndex(null)

  // Format helpers
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
  }
  const fmtDateShort = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  // Price change calculations
  const firstVal = data[0]?.value || 0
  const lastVal = data[data.length - 1]?.value || 0
  const change = ((lastVal - firstVal) / firstVal) * 100
  const isUp = change >= 0

  // Hovered point data
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  // Y-axis labels
  const yLabels = useMemo(() => {
    const count = 5
    const labels = []
    for (let i = 0; i <= count; i++) {
      const value = minVal + ((maxVal - minVal) / count) * (count - i)
      const y = padding.top + priceScale(value)
      labels.push({ value, y })
    }
    return labels
  }, [minVal, maxVal, priceScale, padding.top])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Time range selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          {(Object.keys(RANGE_CONFIG) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              disabled={loading}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200
                ${range === r 
                  ? 'bg-sky-500/15 text-accent ring-1 ring-sky-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }
                ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              `}
            >
              {RANGE_CONFIG[r].label}
            </button>
          ))}
        </div>
        
        {/* Period change indicator */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500">{RANGE_CONFIG[range].label}</span>
          <span className={`font-mono font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden">
        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm z-20"
            >
              <div className="flex flex-col items-center gap-3 w-48">
                <div className="terminal-skeleton h-1.5 w-full" />
                <span className="text-xs text-zinc-500 font-terminal uppercase tracking-wider">Cargando serie…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG Chart */}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
            
            {/* Gradient for line */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={label.y}
                x2="100%"
                y2={label.y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="4 6"
              />
              <text
                x={padding.left - 12}
                y={label.y + 4}
                textAnchor="end"
                className="fill-zinc-600 text-xs font-mono"
              >
                ${fmt(label.value)}
              </text>
            </g>
          ))}

          {/* Volume bars */}
          {showVolume && volumeData.map((d, i) => (
            <rect
              key={i}
              x={d.x - 2}
              y={height - padding.bottom - (d.volumeHeight || 0)}
              width={4}
              height={d.volumeHeight || 0}
              fill={hoveredIndex === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}
              rx={1}
              className="transition-colors duration-150"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#areaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Main line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Hover line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={height - padding.bottom}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}

          {/* Hover point */}
          {hoveredPoint && (
            <g>
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={8}
                fill={accentColor}
                fillOpacity={0.2}
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={5}
                fill={accentColor}
                stroke="#18181b"
                strokeWidth={2}
              />
            </g>
          )}

          {/* End point (current price) */}
          {points.length > 0 && hoveredIndex === null && (
            <g>
              {/* halo expansivo (ring-pulse) + núcleo estático — la cadencia "live"
                  del sistema, unificada con los demás indicadores en vivo. */}
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={6}
                fill={accentColor}
                className="animate-ring-pulse"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={5}
                fill={accentColor}
                stroke="#18181b"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl px-4 py-3 shadow-xl z-10"
              style={{ 
                left: Math.min(Math.max(hoveredPoint.x, 100), (containerRef.current?.offsetWidth || 800) - 100) 
              }}
            >
              <div className="text-xs text-zinc-400 mb-1">{fmtDate(hoveredPoint.date)}</div>
              <div className="text-xl font-semibold text-white font-mono">
                ${fmt(hoveredPoint.value)}
                <span className="text-sm text-zinc-400 ml-1">/kg</span>
              </div>
              {hoveredPoint.volume > 0 && (
                <div className="text-xs text-zinc-500 mt-1">
                  Vol: {fmt(hoveredPoint.volume)} cab.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* X-axis date labels */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 pointer-events-none">
          {data.length > 0 && (
            <>
              <span className="text-xs text-zinc-600 font-mono">{fmtDateShort(data[0].date)}</span>
              <span className="text-xs text-zinc-600 font-mono">{fmtDateShort(data[data.length - 1].date)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
