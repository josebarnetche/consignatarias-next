'use client'

import { useState, useCallback } from 'react'
import { trackOutboundClick } from '@/lib/analytics'

/**
 * <CitaBlock> — a copy-as-citation primitive under <AnswerBlock>. The SERVER
 * builds the honest citation string (so the load-bearing <cite> is in the static
 * HTML and any estimate label travels with the estimated number); the client only
 * renders + copies. Turns every price page into a paste-able, attributed datum.
 */
export function CitaBlock({ citation, sourceUrl }: { citation: string; sourceUrl: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(citation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      trackOutboundClick(sourceUrl, 'website')
    } catch {
      /* clipboard unavailable (insecure context) — the <cite> stays readable */
    }
  }, [citation, sourceUrl])

  return (
    <div className="mb-6 max-w-2xl rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">Cómo citar</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xxs font-terminal uppercase tracking-wider text-amber-500/80 hover:text-amber-400 transition-colors"
        >
          {copied ? 'Copiado ✓' : 'Copiar cita'}
        </button>
      </div>
      <cite className="not-italic mt-1 block text-xs leading-relaxed text-zinc-300">{citation}</cite>
    </div>
  )
}
