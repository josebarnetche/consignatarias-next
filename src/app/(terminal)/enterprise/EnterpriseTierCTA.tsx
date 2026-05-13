'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Tier = 'starter' | 'growth' | 'scale'
type CurrentPlan = 'unknown' | 'none' | 'starter' | 'growth' | 'scale'

const TIER_RANK: Record<Exclude<CurrentPlan, 'unknown'>, number> = {
  none: 0,
  starter: 1,
  growth: 2,
  scale: 3,
}

const TIER_LABEL: Record<Tier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
}

interface Props {
  tier: Tier
  accent: string
  /** Used when user is logged-out or non-Enterprise (Starter → Rebill checkout, Growth/Scale → mailto) */
  defaultCtaText: string
  defaultCtaHref: string
}

interface AccountResponse {
  enterprise?: { plan?: string }
}

export function EnterpriseTierCTA({ tier, accent, defaultCtaText, defaultCtaHref }: Props) {
  const [current, setCurrent] = useState<CurrentPlan>('unknown')
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState<'unknown' | 'anon' | 'authed'>('unknown')

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' })
        const me = await meRes.json()
        if (cancelled) return
        if (!me?.loggedIn) {
          setAuthChecked('anon')
          setCurrent('none')
          return
        }
        setAuthChecked('authed')
        const accRes = await fetch('/api/account', { cache: 'no-store' })
        if (!accRes.ok) {
          setCurrent('none')
          return
        }
        const acc: AccountResponse = await accRes.json()
        const plan = (acc?.enterprise?.plan as CurrentPlan) ?? 'none'
        if (!cancelled) setCurrent(plan)
      } catch {
        if (!cancelled) setCurrent('none')
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  async function startCheckout() {
    if (tier !== 'starter') {
      // Growth/Scale go through mailto
      window.location.href = defaultCtaHref
      return
    }
    setRedirecting(true)
    setError(null)
    try {
      const res = await fetch('/api/enterprise/checkout', { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/enterprise')}`
        return
      }
      if (!res.ok || !json?.checkoutUrl) {
        setError(json?.message ?? `Falla HTTP ${res.status}`)
        setRedirecting(false)
        return
      }
      window.location.href = json.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
      setRedirecting(false)
    }
  }

  // 1. Loading
  if (current === 'unknown') {
    return (
      <button disabled className="terminal-btn w-full text-center opacity-50 cursor-wait">
        Cargando…
      </button>
    )
  }

  const currentRank = TIER_RANK[current]
  const thisRank = TIER_RANK[tier]
  const isCurrent = currentRank === thisRank && currentRank > 0
  const isUpgrade = currentRank > 0 && thisRank > currentRank
  const isDowngrade = currentRank > 0 && thisRank < currentRank

  /* ===================================================
     2. THIS IS THE USER'S CURRENT PLAN — glowy + pulse
     =================================================== */
  if (isCurrent) {
    return (
      <Link
        href="/cuenta/api-keys"
        className="enterprise-current-plan-cta block w-full text-center px-4 py-3 text-xxs font-terminal uppercase tracking-widest relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
          border: `1.5px solid ${accent}`,
          color: accent,
          borderRadius: '2px',
          boxShadow: `0 0 24px ${accent}55, inset 0 0 12px ${accent}22`,
        }}
      >
        <span
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent} 0%, transparent 70%)`,
            animation: 'pulse 2.4s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
        <span className="relative flex items-center justify-center gap-2">
          <span style={{ color: accent }}>★</span>
          Tu plan actual · Dashboard →
        </span>
      </Link>
    )
  }

  /* ===================================================
     3. UPGRADE TARGET — wow effect
     =================================================== */
  if (isUpgrade) {
    const mailto = `mailto:agro@memola.com.ar?subject=${encodeURIComponent(
      `Upgrade a Enterprise ${TIER_LABEL[tier]} — consignatarias.com.ar`,
    )}&body=${encodeURIComponent(
      `Hola, queremos upgradear de ${TIER_LABEL[current as Tier]} a ${TIER_LABEL[tier]}.\n\nEmpresa:\nVolumen estimado req/mes:\nTimeline:`,
    )}`
    return (
      <a
        href={mailto}
        className="enterprise-upgrade-cta block w-full text-center px-4 py-3 text-xxs font-terminal uppercase tracking-widest relative overflow-hidden group"
        style={{
          background: `linear-gradient(110deg, ${accent}, ${accent}cc 50%, ${accent})`,
          backgroundSize: '200% 100%',
          border: `1.5px solid ${accent}`,
          color: '#000',
          borderRadius: '2px',
          fontWeight: 700,
          boxShadow: `0 0 28px ${accent}66, 0 4px 12px ${accent}33`,
          animation: 'shimmer 3s ease-in-out infinite',
        }}
      >
        <span className="relative flex items-center justify-center gap-2">
          <span>✨</span>
          Upgradearme a {TIER_LABEL[tier]}
          <span>→</span>
        </span>
      </a>
    )
  }

  /* ===================================================
     4. DOWNGRADE — informational, muted
     =================================================== */
  if (isDowngrade) {
    return (
      <div
        className="w-full text-center px-4 py-3 text-xxs font-terminal uppercase tracking-wider text-zinc-600 italic cursor-not-allowed"
        style={{ border: '1px dashed #27272a', borderRadius: '2px' }}
      >
        Plan menor — ya tenés {TIER_LABEL[current as Tier]}
      </div>
    )
  }

  /* ===================================================
     5. DEFAULT — anon or non-Enterprise: regular CTA
     =================================================== */
  if (tier === 'starter') {
    return (
      <>
        <button
          type="button"
          onClick={startCheckout}
          disabled={redirecting}
          className="terminal-btn w-full text-center disabled:opacity-50"
          style={{ borderColor: `${accent}99`, color: accent }}
        >
          {redirecting
            ? 'Redirigiendo a pago…'
            : authChecked === 'anon'
              ? 'Iniciar sesión para contratar →'
              : 'Contratar Starter ahora →'}
        </button>
        {error && (
          <p className="mt-2 text-xxs text-red-400 text-center">{error}</p>
        )}
        <p className="mt-2 text-xxs text-zinc-500 text-center">
          ARS al equivalente USD via Rebill. Cancelás cuando quieras.
        </p>
      </>
    )
  }

  return (
    <a
      href={defaultCtaHref}
      className="terminal-btn w-full text-center"
      style={{ borderColor: `${accent}99`, color: accent }}
    >
      {defaultCtaText}
    </a>
  )
}
