'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useSessionTier } from '@/lib/use-session-tier'
import { trackProPromptClick, trackProPromptView } from '@/lib/analytics'

interface Props {
  svg?: string // server-rendered chart string (legacy), shown to PRO
  children?: React.ReactNode // interactive chart node (preferred), shown to PRO
  context: string // analytics context
  title: string
  description: string
}

/**
 * Wraps a server-rendered chart that is PRO-only. PRO users see the chart;
 * free/anon users see an upsell with the price anchor. Keeps the host page
 * static (tier resolved client-side via /api/me). The SVG still ships in the
 * HTML (data is public by design); this is a merchandising gate, not DRM.
 */
export default function ProChartGate({ svg, children, context, title, description }: Props) {
  const { tier, loading } = useSessionTier()
  const tracked = useRef(false)

  useEffect(() => {
    if (!loading && tier !== 'pro' && !tracked.current) {
      tracked.current = true
      trackProPromptView(context, 'inline')
    }
  }, [loading, tier, context])

  if (tier === 'pro') {
    if (children) return <div className="px-panel py-4">{children}</div>
    return <div className="px-panel py-4" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
  }

  if (loading) {
    return <div className="px-panel py-4 h-[240px]" aria-hidden />
  }

  return (
    <div className="px-panel py-6">
      <Link
        href={`/planes?from=${context}`}
        onClick={() => trackProPromptClick(context, 'inline')}
        className="block border border-amber-500/30 bg-amber-500/[0.04] rounded px-5 py-8 text-center hover:border-amber-500/50 transition-colors"
      >
        <div className="text-[11px] font-terminal uppercase tracking-widest text-amber-400 mb-2">
          {title}
        </div>
        <p className="text-sm text-zinc-300 mb-2 max-w-md mx-auto">{description}</p>
        <p className="text-xxs text-zinc-500">PRO Usuario · ARS $7.900/mes →</p>
      </Link>
    </div>
  )
}
