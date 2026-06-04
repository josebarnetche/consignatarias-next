'use client'

import { useState, useEffect } from 'react'

interface PlatformStats {
  consignatarias: number
  remates: number
  frigorificos: number
  provincias: number
  subscribers: number
}

/**
 * Dynamic social proof component that fetches real platform stats
 * Falls back to static values if fetch fails
 */
export default function PlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  
  // DISABLED: Cost optimization — use static values directly
  useEffect(() => {
    // Skip API call, use static values (canonical count = getAllProfiles().length)
    setStats({
      consignatarias: 104,
      remates: 392,
      frigorificos: 364,
      provincias: 14,
      subscribers: 500
    })
    // fetch('/api/stats/platform')
    //   .then(r => r.json())
    //   .then(d => {
    //     if (d.success && d.data) {
    //       setStats(d.data)
    //     }
    //   })
    //   .catch(() => {})
  }, [])

  // Show loading skeleton while fetching
  if (!stats) {
    return (
      <div className="mt-4 flex flex-wrap gap-4 text-data animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded"></div>
        <div className="h-8 w-48 bg-zinc-800 rounded"></div>
        <div className="h-8 w-48 bg-zinc-800 rounded"></div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap gap-4 text-data">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
        <span className="text-positive font-terminal tabular-nums">{stats.consignatarias}+</span>
        <span className="text-zinc-500">consignatarias en el directorio</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
        <span className="text-sky-400 font-terminal tabular-nums">{stats.remates}+</span>
        <span className="text-zinc-500">remates programados</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded">
        <span className="text-amber-400 font-terminal tabular-nums">{stats.subscribers}+</span>
        <span className="text-zinc-400">productores reciben los emails</span>
      </div>
    </div>
  )
}
