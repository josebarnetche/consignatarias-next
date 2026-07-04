'use client'

import Link from 'next/link'
import { useSessionTier } from '@/lib/use-session-tier'
import { trackProPromptClick, trackProPromptView } from '@/lib/analytics'
import { useEffect, useRef } from 'react'

/**
 * PRO-gated CSV download for the full INMAG history (2015 →).
 * - PRO  → real download link (/api/market/inmag-export)
 * - free/anon → upsell link to /planes with the price anchor
 * The recent on-page table stays free; this is the complete-dataset export.
 */
export default function HistoryDownloadPro() {
  const { tier, loading } = useSessionTier()
  const tracked = useRef(false)

  useEffect(() => {
    if (!loading && tier !== 'pro' && !tracked.current) {
      tracked.current = true
      trackProPromptView('inmag-csv', 'inline')
    }
  }, [loading, tier])

  if (loading) {
    return <span className="text-xs text-zinc-700">Histórico completo…</span>
  }

  if (tier === 'pro') {
    return (
      <a
        href="/api/market/inmag-export"
        className="text-xs text-accent hover:text-accent-bright transition-colors flex items-center gap-1"
      >
        Descargar histórico completo (CSV, 2015→)
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    )
  }

  return (
    <Link
      href="/planes?from=inmag-csv"
      onClick={() => trackProPromptClick('inmag-csv', 'inline')}
      className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
      title="Descargá la serie completa del INMAG desde 2015 en CSV con PRO"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      Histórico completo 2015→ en CSV
      <span className="text-[10px] font-terminal font-bold tracking-wider border border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-sm px-1 py-0.5">PRO</span>
    </Link>
  )
}
