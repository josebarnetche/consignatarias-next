'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface SpotsData {
  remaining: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * FounderUrgency - Maintains conversion urgency on login page
 * 
 * Shows founder spot scarcity when:
 * - User came from /planes (redirect param)
 * - Spots are in critical/high urgency
 * 
 * CLOSER Funnel Optimization — 2026-03-20
 */
export default function FounderUrgency() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<SpotsData | null>(null)
  const [visible, setVisible] = useState(false)

  // DISABLED: Cost optimization — skip API call pre-revenue
  useEffect(() => {
    // const redirect = searchParams.get('redirect')
    // const fromPlanes = redirect?.includes('planes')
    // 
    // fetch('/api/stats/pro-spots')
    //   .then(r => r.json())
    //   .then(d => {
    //     if (d.success && d.data) {
    //       setData(d.data)
    //       // Show if coming from planes OR if urgency is critical/high
    //       if (fromPlanes || d.data.urgency === 'critical' || d.data.urgency === 'high') {
    //         setVisible(true)
    //       }
    //     }
    //   })
    //   .catch(() => {})
  }, [searchParams])

  if (!visible || !data || data.remaining <= 0) return null

  const urgencyConfig = {
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/40',
      text: 'text-red-400',
      icon: '🔥',
      message: `¡Solo quedan ${data.remaining} lugares a precio fundador!`
    },
    high: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      icon: '⚡',
      message: `Quedan ${data.remaining} de 50 lugares a $45.000/mes`
    },
    medium: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: '🔒',
      message: `Asegurá tu lugar a precio fundador`
    },
    low: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: '🔒',
      message: `Precio fundador disponible por tiempo limitado`
    }
  }

  const config = urgencyConfig[data.urgency]

  return (
    <div className={`mb-6 px-4 py-3 ${config.bg} border ${config.border} rounded-lg text-center`}>
      <p className={`${config.text} text-sm font-medium`}>
        {config.icon} {config.message}
      </p>
      <p className="text-zinc-500 text-xxs mt-1">
        Ingresá con tu email para continuar al checkout
      </p>
    </div>
  )
}
