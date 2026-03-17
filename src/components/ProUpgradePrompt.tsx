'use client'

import Link from 'next/link'

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
 * 
 * Usage:
 *   <ProUpgradePrompt 
 *     benefit="Compará hasta 5 consignatarias" 
 *     context="comparar"
 *   />
 */
export default function ProUpgradePrompt({
  benefit,
  context,
  ctaText = 'Ver planes PRO',
  variant = 'inline',
}: ProUpgradePromptProps) {
  const href = context ? `/planes?from=${context}` : '/planes'

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
                Plan PRO · $45.000/mes
              </p>
            </div>
          </div>
          <Link
            href={href}
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
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          {ctaText}
        </Link>
      </span>
    </div>
  )
}
