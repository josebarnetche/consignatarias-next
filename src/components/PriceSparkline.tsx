'use client'

import { useMemo } from 'react'

interface DataPoint {
  date: string
  value: number
}

interface PriceSparklineProps {
  data: DataPoint[]
  width?: number
  height?: number
  lineColor?: string
  areaColor?: string
  showLabels?: boolean
}

export function PriceSparkline({
  data,
  width = 400,
  height = 100,
  lineColor = '#fbbf24',
  areaColor = 'rgba(251, 191, 36, 0.15)',
  showLabels = true,
}: PriceSparklineProps) {
  const { path, areaPath, minVal, maxVal, first, last, change } = useMemo(() => {
    if (!data.length) return { path: '', areaPath: '', minVal: 0, maxVal: 0, first: 0, last: 0, change: 0 }
    
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const padding = 10
    
    const points = data.map((d, i) => {
      const x = padding + ((width - padding * 2) / (data.length - 1)) * i
      const y = padding + (height - padding * 2) * (1 - (d.value - min) / range)
      return { x, y, value: d.value }
    })
    
    // SVG path for line
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    
    // SVG path for area (closed polygon)
    const area = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`
    
    const firstVal = data[0].value
    const lastVal = data[data.length - 1].value
    const pctChange = ((lastVal - firstVal) / firstVal) * 100
    
    return {
      path: linePath,
      areaPath: area,
      minVal: min,
      maxVal: max,
      first: firstVal,
      last: lastVal,
      change: pctChange,
    }
  }, [data, width, height])
  
  const changeColor = change >= 0 ? 'text-emerald-400' : 'text-red-400'
  const changeSign = change >= 0 ? '+' : ''
  
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  
  if (!data.length) return null
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full h-auto">
        {/* Area fill */}
        <path d={areaPath} fill={areaColor} />
        {/* Line */}
        <path d={path} stroke={lineColor} strokeWidth={2} fill="none" />
        {/* Start point */}
        <circle cx={10} cy={10 + (height - 20) * (1 - (first - minVal) / (maxVal - minVal || 1))} r={3} fill={lineColor} />
        {/* End point */}
        <circle 
          cx={width - 10} 
          cy={10 + (height - 20) * (1 - (last - minVal) / (maxVal - minVal || 1))} 
          r={4} 
          fill={lineColor} 
          stroke="#18181b"
          strokeWidth={2}
        />
      </svg>
      
      {showLabels && (
        <div className="flex justify-between text-xs mt-2">
          <div className="text-zinc-500">
            {data[0]?.date ? new Date(data[0].date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}
            <span className="ml-2 text-zinc-400">${fmt(first)}</span>
          </div>
          <div className="text-zinc-500">
            {data[data.length - 1]?.date ? new Date(data[data.length - 1].date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}
            <span className="ml-2 text-zinc-300 font-medium">${fmt(last)}</span>
            <span className={`ml-2 font-medium ${changeColor}`}>
              {changeSign}{change.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact inline version
export function InlineSparkline({ 
  data, 
  width = 80, 
  height = 24 
}: { 
  data: DataPoint[]
  width?: number 
  height?: number 
}) {
  const path = useMemo(() => {
    if (data.length < 2) return ''
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    
    return data.map((d, i) => {
      const x = (width / (data.length - 1)) * i
      const y = height * (1 - (d.value - min) / range)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [data, width, height])
  
  const isUp = data.length >= 2 && data[data.length - 1].value >= data[0].value
  
  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <path 
        d={path} 
        stroke={isUp ? '#4ade80' : '#f87171'} 
        strokeWidth={1.5} 
        fill="none" 
      />
    </svg>
  )
}
