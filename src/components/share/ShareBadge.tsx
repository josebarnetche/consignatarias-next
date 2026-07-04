'use client'

import { useState, useCallback } from 'react'

const APP_URL = 'https://www.consignatarias.com.ar'

/**
 * Live preview of an embeddable price badge + a copy-paste embed snippet. The
 * snippet wraps the badge <img> in an <a> to a canonical page, so every site that
 * embeds it links back (dofollow). The badge image itself is served by /api/badge/[slug].
 */
export function ShareBadge({
  slug,
  label,
  valueFormatted,
  href,
}: {
  slug: string
  label: string
  valueFormatted: string
  href: string
}) {
  const badgeSrc = `${APP_URL}/api/badge/${slug}`
  const canonical = `${APP_URL}${href}`
  const snippet = `<a href="${canonical}"><img src="${badgeSrc}" alt="${label}: $${valueFormatted}/kg vivo — consignatarias.com.ar" width="240" height="56"></a>`

  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }, [snippet])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
      <div className="flex items-center justify-between gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeSrc} alt={`Badge ${label}`} width={240} height={56} className="rounded" />
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 text-xxs font-terminal uppercase tracking-wider text-accent/80 hover:text-accent transition-colors"
        >
          {copied ? 'Copiado ✓' : 'Copiar embed'}
        </button>
      </div>
      <code className="block overflow-x-auto whitespace-nowrap rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] text-zinc-400">
        {snippet}
      </code>
    </div>
  )
}
