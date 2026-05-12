'use client'

import { useState, useEffect } from 'react'

interface SpotsData {
  total: number
  taken: number
  remaining: number
  percentageTaken: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * FounderSpotsRemaining - Dynamic scarcity indicator
 * 
 * Shows remaining founder spots with visual urgency.
 * Critical social proof element for PRO conversions.
 * 
 * Shipped via CLOSER Conversion Audit — 2026-03-19
 */
export default function FounderSpotsRemaining() {
  const [data, setData] = useState<SpotsData | null>(null)

  // DISABLED: Cost optimization — use static values
  useEffect(() => {
    // Skip API call, use static values
    setData({
      total: 50,
      taken: 0,
      remaining: 50,
      percentageTaken: 0,
      urgency: 'low'
    })
    // fetch('/api/stats/pro-spots')
    //   .then(r => r.json())
    //   .then(d => {
    //     if (d.success && d.data) {
    //       setData(d.data)
    //     }
    //   })
    //   .catch(() => {})
  }, [])

  // Don't render if no data yet
  if (!data) {
    return null
  }

  // Don't show if all spots taken
  if (data.remaining <= 0) {
    return null
  }

  // Color and messaging based on urgency
  const urgencyConfig = {
    critical: {
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/50',
      textColor: 'text-red-400',
      subColor: 'text-red-500/80',
      icon: '🔥',
      message: `¡Solo quedan ${data.remaining} lugares!`
    },
    high: {
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/40',
      textColor: 'text-amber-400',
      subColor: 'text-amber-500/80',
      icon: '⚡',
      message: `Quedan ${data.remaining} de 50 lugares`
    },
    medium: {
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      subColor: 'text-emerald-500/70',
      icon: '🔒',
      message: `${data.remaining} lugares disponibles`
    },
    low: {
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      subColor: 'text-emerald-500/70',
      icon: '🔒',
      message: `${data.remaining} lugares a precio fundador`
    }
  }

  const config = urgencyConfig[data.urgency]

  return (
    <div className={`mb-4 px-2 py-1.5 ${config.bgColor} border ${config.borderColor} rounded text-center`}>
      <span className={`${config.textColor} text-xxs font-terminal uppercase tracking-wider`}>
        {config.icon} {config.message}
      </span>
      <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            data.urgency === 'critical' ? 'bg-red-500' :
            data.urgency === 'high' ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${data.percentageTaken}%` }}
        />
      </div>
      <span className={`block ${config.subColor} text-[10px] font-terminal mt-1`}>
        {data.taken} de 50 cupos tomados
      </span>
    </div>
  )
}
