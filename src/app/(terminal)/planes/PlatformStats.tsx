'use client'

import { useState, useEffect } from 'react'

interface PlatformStats {
  consignatarias: number
  remates: number
  frigorificos: number
  provincias: number
}

/**
 * Dynamic social proof component that fetches real platform stats
 * Falls back to static values if fetch fails
 */
export default function PlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  
  useEffect(() => {
    fetch('/api/stats/platform')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setStats(d.data)
        }
      })
      .catch(() => {
        // Fallback: use static values if API fails
        setStats({
          consignatarias: 70,
          remates: 345,
          frigorificos: 364,
          provincias: 15
        })
      })
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
        <span className="text-amber-400 font-terminal tabular-nums">{stats.frigorificos}</span>
        <span className="text-zinc-500">frigoríficos registrados</span>
      </div>
    </div>
  )
}
