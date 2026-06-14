'use client'

import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { useSessionTier } from '@/lib/use-session-tier'
import { trackProPromptView, trackProPromptClick } from '@/lib/analytics'

interface ProRevealProps {
  /**
   * The premium content. Rendered as-is for PRO users; for free/anon users it
   * is rendered BLURRED + aria-hidden + inert as a visual teaser only.
   *
   * IMPORTANT (brand rule #1 — no invented data): when this component is used
   * as a teaser, `children` is shown blurred to a non-PRO user. Do NOT pass
   * fabricated numbers as the blurred preview — pass a real-but-locked render,
   * or pass a `placeholder` made of obviously-fake skeleton bars. If you have
   * nothing real to show, rely on the default skeleton placeholder.
   */
  children: ReactNode
  /**
   * Short value statement shown in the overlay, e.g.
   * "Percentiles en dólares reales + lectura del mercado".
   */
  benefit: string
  /**
   * Page/context key for analytics + the `next` param of the upgrade link,
   * e.g. "/mercado/vender-ahora". Used so the user returns here after paying.
   */
  from: string
  /**
   * Optional non-real placeholder shown blurred behind the overlay instead of
   * the actual `children`. Use this when the gated content needs live data the
   * free user must NOT see (so we never leak real PRO numbers, and never fake
   * them either). If omitted, a neutral skeleton is rendered.
   */
  placeholder?: ReactNode
  /** Optional header label for the gated panel. */
  title?: string
  /**
   * When true, a non-PRO user is seeing their free weekly "taste": render the
   * real `children` (no blur) wrapped in a taste banner + footer CTA, instead of
   * the gated teaser. The server decides this (one full verdict per week).
   */
  tasteUnlocked?: boolean
  /** Days until the next free taste — shown in the taste footer. */
  tasteResetDays?: number
}

const UPGRADE_CTA = 'Desbloquear con PRO — ARS $7.900/mes →'

/**
 * Reusable PRO gating wrapper.
 *
 * - PRO  → renders `children` verbatim.
 * - free/anon → renders a blurred, inert, aria-hidden teaser (the `placeholder`
 *   skeleton, or the children themselves if explicitly safe to show blurred)
 *   with a centered overlay: benefit + upgrade CTA to /upgrade?next=<from>.
 * - loading → renders the same blurred skeleton WITHOUT the CTA (avoids a flash
 *   of the unlock prompt to a user who turns out to be PRO).
 *
 * This is the soft-gate primitive: a free gancho of public data lives OUTSIDE
 * <ProReveal>; the premium decision layer goes INSIDE. Never a hard wall/redirect.
 *
 * Usage:
 *   <ProReveal from="/mercado/vender-ahora" benefit="El análisis de si conviene vender">
 *     <PremiumAnalysis data={data} />
 *   </ProReveal>
 */
export default function ProReveal({
  children,
  benefit,
  from,
  placeholder,
  title,
  tasteUnlocked = false,
  tasteResetDays,
}: ProRevealProps) {
  const { tier, loading } = useSessionTier()
  const href = `/upgrade?next=${encodeURIComponent(from)}`
  const hasTrackedImpression = useRef(false)

  // Count the gate impression once, only for users who can convert (not on a taste).
  useEffect(() => {
    if (loading || tier === 'pro' || tasteUnlocked) return
    if (!hasTrackedImpression.current) {
      trackProPromptView(from, 'reveal')
      hasTrackedImpression.current = true
    }
  }, [from, tier, loading, tasteUnlocked])

  // PRO users get the real thing.
  if (tier === 'pro') return <>{children}</>

  // Free user spending their weekly taste: real content + taste banner/footer.
  if (tasteUnlocked) {
    return (
      <div className="terminal-panel" style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}>
        <div
          className="terminal-panel-header flex items-center justify-between"
          style={{ color: '#34d399' }}
        >
          <span>🎁 {title ?? 'Probada PRO'} · gratis esta semana</span>
        </div>
        <div className="px-panel py-5">{children}</div>
        <div className="border-t border-terminal-border px-panel py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-zinc-500 text-xxs">
            {typeof tasteResetDays === 'number'
              ? `Tu probada de esta semana. Próxima en ${tasteResetDays} día${tasteResetDays === 1 ? '' : 's'}.`
              : 'Tu probada gratis de esta semana.'}
          </span>
          <Link
            href={href}
            onClick={() => trackProPromptClick(from, 'reveal')}
            className="inline-block px-4 py-2 text-xxs font-terminal uppercase tracking-wider self-start sm:self-auto"
            style={{ background: 'rgba(56, 189, 248, 0.9)', color: '#000', borderRadius: '2px' }}
          >
            Desbloquear todo con PRO →
          </Link>
        </div>
      </div>
    )
  }

  const blurred = placeholder ?? <RevealSkeleton />

  return (
    <div className="terminal-panel" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
      {title && (
        <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
          {title}
        </div>
      )}
      <div className="relative px-panel py-5">
        {/* Blurred, inert teaser — never real PRO data, never fabricated numbers. */}
        <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
          {blurred}
        </div>

        {/* Overlay — hidden while we don't yet know the tier, to avoid flashing
            the upgrade CTA to a user who turns out to be PRO. */}
        {!loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-terminal-panel/55 backdrop-blur-[1px]">
            <span
              className="text-xxs font-terminal uppercase tracking-wider"
              style={{ color: '#38bdf8' }}
            >
              PRO Usuario
            </span>
            <p className="text-zinc-200 text-data max-w-md">{benefit}</p>
            <Link
              href={href}
              onClick={() => trackProPromptClick(from, 'reveal')}
              className="inline-block px-4 py-2 text-xxs font-terminal uppercase tracking-wider"
              style={{ background: 'rgba(56, 189, 248, 0.9)', color: '#000', borderRadius: '2px' }}
            >
              {UPGRADE_CTA}
            </Link>
            <span className="text-zinc-500 text-xxs">
              Sin permanencia · Cancelá cuando quieras
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Neutral non-real skeleton used as the default blurred placeholder.
 * Obviously-fake bars — carries no number a user could mistake for data.
 */
function RevealSkeleton() {
  return (
    <div className="space-y-3">
      {[64, 80, 48].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '38%' }} />
          <div className="flex-1 h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
            <div className="h-full bg-zinc-700" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
      <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '70%' }} />
    </div>
  )
}
