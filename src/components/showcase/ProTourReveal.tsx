'use client'

import Link from 'next/link'
import { ProReveal } from '@/components/pro'
import { useSessionTier } from '@/lib/use-session-tier'

/**
 * The gated "PRO side" of each /pro tour row. Reuses <ProReveal> so the gate,
 * blur, analytics and upgrade CTA stay identical to the rest of the product.
 *
 * The blurred teaser is an explicit NON-REAL skeleton (brand rule #1): it shows
 * the SHAPE of the locked decision (verdict pill + two bars + a read line),
 * never a real PRO number nor a fabricated one.
 *
 * For PRO users, instead of the children we surface a small "ya tenés acceso"
 * confirmation that links straight into the tool — the tour shouldn't dead-end
 * a paying user on a gate that's already open.
 */
export default function ProTourReveal({
  from,
  title,
  benefit,
}: {
  from: string
  title: string
  benefit: string
}) {
  const { tier, loading } = useSessionTier()

  if (!loading && tier === 'pro') {
    return (
      <div
        className="terminal-panel rounded-terminal flex flex-col"
        style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}
      >
        <div className="terminal-panel-header" style={{ color: '#34d399' }}>
          PRO activo
        </div>
        <div className="px-panel py-5 flex-1 flex flex-col gap-3">
          <p className="text-zinc-300 text-data leading-relaxed">{benefit}</p>
          <Link
            href={from}
            className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xxs font-terminal uppercase tracking-wider text-zinc-950 rounded-sm min-h-[40px]"
            style={{ background: 'rgba(52, 211, 153, 0.9)' }}
          >
            Abrir la herramienta →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ProReveal from={from} title={title} benefit={benefit} placeholder={<DecisionSkeleton />}>
      <DecisionSkeleton />
    </ProReveal>
  )
}

/** Non-real skeleton of a decision layer: a verdict chip, two bars, a read line. */
function DecisionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border border-terminal-border px-4 py-3">
        <div className="h-2.5 w-24 bg-zinc-800 rounded-sm" />
        <div className="h-4 w-20 bg-zinc-700 rounded-sm" />
      </div>
      {[64, 42].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '40%' }} />
          <div className="flex-1 h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
            <div className="h-full bg-zinc-700" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
      <div className="space-y-1.5 pt-1">
        <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '92%' }} />
        <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '70%' }} />
      </div>
    </div>
  )
}
