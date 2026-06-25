'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackProPromptView, trackProPromptClick } from '@/lib/analytics'
import { useSessionTier } from '@/lib/use-session-tier'

interface ProUpgradePromptProps {
  /** Main benefit text (e.g. "Compará hasta 5 consignatarias") */
  benefit: string
  /** Page context for analytics */
  context?: string
  /** Optional custom CTA text */
  ctaText?: string
  /** Variant: inline (small, subtle) or card (larger, more prominent) */
  variant?: 'inline' | 'card'
}

/**
 * Contextual PRO upgrade prompt - non-blocking, value-focused.
 * 
 * Shows at moments of engagement to convert free users.
 * Tracks impressions and clicks for conversion funnel analysis.
 * 
 * Usage:
 *   <ProUpgradePrompt 
 *     benefit="Compará hasta 5 consignatarias" 
 *     context="comparar"
 *   />
 */
export default function ProUpgradePrompt({
  benefit,
  context = 'unknown',
  ctaText = 'Activar PRO · ARS $7.900/mes →',
  variant = 'inline',
}: ProUpgradePromptProps) {
  const href = `/upgrade?from=${encodeURIComponent(context)}`
  const hasTrackedImpression = useRef(false)
  const { tier, loading } = useSessionTier()

  // Track the impression once — only for users who can actually convert
  // (free/anon). Firing for PRO users (or before tier is known) would inflate
  // and contaminate the pro_prompt_view denominator of the conversion funnel.
  useEffect(() => {
    if (loading || tier === 'pro') return
    if (!hasTrackedImpression.current) {
      trackProPromptView(context, variant)
      hasTrackedImpression.current = true
    }
  }, [context, variant, tier, loading])

  const handleClick = () => {
    trackProPromptClick(context, variant)
  }

  // PRO users already have it; don't show the upsell or count them.
  if (tier === 'pro') return null

  if (variant === 'card') {
    return (
      <div className="terminal-panel mt-px">
        <div className="px-panel py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/5 border-l-2 border-amber-500/40">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 text-lg">⚡</span>
            <div>
              <p className="text-xs text-zinc-200 font-medium">
                {benefit}
              </p>
              <p className="text-xxs text-zinc-500 mt-0.5">
                Sin permanencia · Cancelá cuando quieras
              </p>
            </div>
          </div>
          <Link
            href={href}
            onClick={handleClick}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    )
  }

  // Inline variant - subtle, doesn't interrupt flow
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-sm">
      <span className="text-amber-400 text-xs">⚡</span>
      <span className="text-xxs text-zinc-400">
        {benefit} ·{' '}
        <Link
          href={href}
          onClick={handleClick}
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          {ctaText}
        </Link>
      </span>
    </div>
  )
}
