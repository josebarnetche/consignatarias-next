'use client'

import { useMemo } from 'react'
import marketData from '@/lib/data/market-prices.json'

interface CategoryPriceChartProps {
  category: string
}

export function CategoryPriceChart({ category }: CategoryPriceChartProps) {
  // For now, use INMAG series as proxy (category-specific series can be added later)
  const series = marketData.inmag.series as Array<{ date: string; value: number }>
  
  const { minVal, maxVal, chartData } = useMemo(() => {
    const last30 = series.slice(-30)
    const values = last30.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    
    return {
      minVal: min,
      maxVal: max,
      chartData: last30.map((d, i) => ({
        date: d.date,
        value: d.value,
        x: (i / (last30.length - 1)) * 100,
        y: 100 - ((d.value - min) / range) * 80 - 10,
      })),
    }
  }, [series])

  if (chartData.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <p className="text-zinc-500 text-sm">Datos históricos no disponibles</p>
      </div>
    )
  }

  const pathD = chartData
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const firstDate = chartData[0]?.date ?? ''
  const lastDate = chartData[chartData.length - 1]?.date ?? ''

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-300">Evolución últimos 30 días</h3>
        <span className="text-xs text-zinc-500">Referencia INMAG</span>
      </div>
      
      <div className="relative h-40">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="#3f3f46" strokeWidth="0.3" strokeDasharray="2,2" />
          
          {/* Area fill */}
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill="url(#areaGradient)"
            opacity="0.3"
          />
          
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 text-xs text-zinc-500">
          ${maxVal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-zinc-500">
          ${minVal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-zinc-500">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  )
}
