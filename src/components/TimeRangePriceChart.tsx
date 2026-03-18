'use client'

import { useState, useEffect, useCallback } from 'react'
import { PriceSparkline, InlineSparkline } from './PriceSparkline'

interface DataPoint {
  date: string
  value: number
}

interface ApiResponse {
  series: DataPoint[]
  meta: {
    min: number
    max: number
    avg: number
    count: number
    from: string
    to: string
  }
}

type TimeRange = '30d' | '90d' | '1y'

interface TimeRangePriceChartProps {
  initialData: DataPoint[]
  height?: number
}

const RANGE_DAYS: Record<TimeRange, number> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

const RANGE_LABELS: Record<TimeRange, string> = {
  '30d': '30 días',
  '90d': '90 días',
  '1y': '1 año',
}

export function TimeRangePriceChart({ initialData, height = 120 }: TimeRangePriceChartProps) {
  const [range, setRange] = useState<TimeRange>('30d')
  const [data, setData] = useState<DataPoint[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ApiResponse['meta'] | null>(null)

  const fetchData = useCallback(async (days: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/market/history?days=${days}`)
      const json: ApiResponse = await res.json()
      setData(json.series)
      setStats(json.meta)
    } catch (e) {
      console.error('Failed to fetch price history:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch for non-default ranges
    if (range !== '30d') {
      fetchData(RANGE_DAYS[range])
    } else {
      setData(initialData)
      setStats(null)
    }
  }, [range, fetchData, initialData])

  const handleRangeChange = (newRange: TimeRange) => {
    if (newRange !== range) {
      setRange(newRange)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      {/* Header with range selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400">Tendencia de Precios</h2>
        
        {/* Range toggle buttons */}
        <div className="flex items-center gap-1 bg-zinc-800/50 rounded-md p-0.5">
          {(['30d', '90d', '1y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              disabled={loading}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                range === r
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              } ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {r === '1y' ? '1 año' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded z-10">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
        <PriceSparkline data={data} height={height} />
      </div>

      {/* Stats row (shows for 90d and 1y) */}
      {stats && range !== '30d' && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800/50 text-xs">
          <div>
            <div className="text-zinc-500">Mínimo</div>
            <div className="text-zinc-300 font-medium">${fmt(stats.min)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Promedio</div>
            <div className="text-zinc-300 font-medium">${fmt(stats.avg)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Máximo</div>
            <div className="text-zinc-300 font-medium">${fmt(stats.max)}</div>
          </div>
        </div>
      )}

      {/* Range label */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-zinc-500">
        <InlineSparkline data={data.slice(-30)} width={48} height={16} />
        <span>Últimos {RANGE_LABELS[range]}</span>
      </div>
    </div>
  )
}
