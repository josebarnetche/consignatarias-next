'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MeResponse {
  loggedIn: boolean
  tier: 'anonymous' | 'free' | 'pro'
  email: string | null
}

interface Props {
  title: string
  description: string
  cta: string
  ctaHref?: string
}

/**
 * Client overlay that hides itself when the user is PRO.
 * Fetches /api/me on mount; while loading shows the overlay (safer default).
 */
export function ProOverlay({ title, description, cta, ctaHref = '/upgrade?next=/mercado' }: Props) {
  const [tier, setTier] = useState<'loading' | 'anonymous' | 'free' | 'pro'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: MeResponse) => {
        if (!cancelled) setTier(j.tier ?? 'anonymous')
      })
      .catch(() => {
        if (!cancelled) setTier('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (tier === 'pro') return null

  // Slightly less visual noise while loading
  const opacity = tier === 'loading' ? 'opacity-0' : 'opacity-100'

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-zinc-950/85 backdrop-blur-[2px] transition-opacity duration-200 ${opacity}`}
      aria-hidden={tier === 'loading'}
    >
      <div className="text-center max-w-md px-6">
        <div className="text-xxs font-terminal uppercase tracking-widest text-sky-400 mb-2">
          {title}
        </div>
        <p className="text-zinc-200 text-sm mb-3">{description}</p>
        <p className="text-zinc-500 text-xxs mb-4">
          Activá PRO Usuario por ARS $7.900/mes y desbloqueá esto + el
          calculador &ldquo;¿Vendo ahora?&rdquo; + descargas mensuales.
        </p>
        <Link
          href={ctaHref}
          className="inline-block px-4 py-2 text-xxs font-terminal uppercase tracking-wider"
          style={{
            background: 'rgba(56, 189, 248, 0.9)',
            color: '#000',
            borderRadius: '2px',
          }}
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
