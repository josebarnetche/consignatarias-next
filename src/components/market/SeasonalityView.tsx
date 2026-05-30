'use client'

import Link from 'next/link'
import { useSessionTier } from '@/lib/use-session-tier'
import { trackProPromptClick, trackProPromptView } from '@/lib/analytics'
import { useEffect, useRef } from 'react'

interface Props {
  recentSvg: string // last ~3 years — free, "taste the value"
  fullSvg: string // full decade 2015→ — PRO
  recentYears: number
  fullFromYear: number
}

/**
 * Client gate for the seasonality heatmap. Instead of blurring everything
 * (free users saw nothing → no desire), free users get the recent years fully
 * visible and an upsell to unlock the full decade. PRO users get the decade.
 */
export default function SeasonalityView({ recentSvg, fullSvg, recentYears, fullFromYear }: Props) {
  const { tier, loading } = useSessionTier()
  const tracked = useRef(false)

  useEffect(() => {
    if (!loading && tier !== 'pro' && !tracked.current) {
      tracked.current = true
      trackProPromptView('seasonality', 'inline')
    }
  }, [loading, tier])

  const isPro = tier === 'pro'

  return (
    <>
      <div
        className="px-panel py-4"
        dangerouslySetInnerHTML={{ __html: isPro ? fullSvg : recentSvg }}
      />
      {!loading && !isPro && (
        <div className="px-panel pb-4">
          <Link
            href="/planes?from=seasonality"
            onClick={() => trackProPromptClick('seasonality', 'inline')}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-amber-500/30 bg-amber-500/[0.04] rounded px-4 py-3 hover:border-amber-500/50 transition-colors"
          >
            <span className="text-xs text-zinc-300">
              Estás viendo los últimos {recentYears} años.{' '}
              <span className="text-amber-400">Desbloqueá la década completa ({fullFromYear}→)</span> con PRO.
            </span>
            <span className="text-[11px] font-terminal uppercase tracking-wider text-amber-400 whitespace-nowrap">
              PRO · ARS $7.900/mes →
            </span>
          </Link>
        </div>
      )}
    </>
  )
}
