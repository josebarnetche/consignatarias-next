interface MarketIndicator {
  label: string
  value: string
  detail?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
}

interface MarketDashboardProps {
  indicators: MarketIndicator[]
}

const trendColors: Record<string, string> = {
  up: 'text-campo-600',
  down: 'text-red-500',
  neutral: 'text-stone-400',
}

export default function MarketDashboard({ indicators }: MarketDashboardProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {indicators.map((ind) => (
        <div
          key={ind.label}
          className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm group hover:border-campo-200 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider leading-tight">
              {ind.label}
            </p>
            <div className="w-8 h-8 rounded-lg bg-campo-50 flex items-center justify-center text-campo-600 group-hover:bg-campo-100 transition-colors">
              {ind.icon}
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900 tracking-tight">
            {ind.value}
          </p>
          {ind.detail && (
            <p className={`text-xs mt-1 font-medium ${ind.trend ? trendColors[ind.trend] : 'text-stone-400'}`}>
              {ind.trend === 'up' && '\u2191 '}
              {ind.trend === 'down' && '\u2193 '}
              {ind.detail}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
