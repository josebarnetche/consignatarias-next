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
  const [email, setEmail] = useState('')

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

  // Email-first checkout for anonymous Starter — no login wall. Creates the user
  // server-side, then returns the Rebill link (mirrors the B2C public checkout).
  async function emailFirstCheckout(em: string) {
    setRedirecting(true)
    setError(null)
    try {
      const res = await fetch('/api/enterprise/checkout-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      })
      const json = await res.json().catch(() => null)
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

  // No "loading" gate: render an actionable CTA from the first paint. The auth-check is an
  // *enhancement* (upgrades the button to current-plan / upgrade / downgrade once it resolves);
  // it must NEVER freeze the button on "Cargando…". A slow network, a stale JS bundle, or a failed
  // hydration previously left it stuck there forever ("se stallea cargando y nunca te deja pagar").
  // While `current` is unknown we treat it as 'none' → the default actionable CTA renders now.
  const currentRank = current === 'unknown' ? 0 : TIER_RANK[current]
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
    // Authed → session checkout. Anon/unknown → email-first (no login wall).
    if (authChecked === 'authed') {
      return (
        <>
          <button
            type="button"
            onClick={startCheckout}
            disabled={redirecting}
            className="terminal-btn w-full text-center disabled:opacity-50"
            style={{ borderColor: `${accent}99`, color: accent }}
          >
            {redirecting ? 'Redirigiendo a pago…' : 'Contratar Starter ahora →'}
          </button>
          {error && <p className="mt-2 text-xxs text-red-400 text-center">{error}</p>}
          <p className="mt-2 text-xxs text-zinc-500 text-center">
            ARS al equivalente USD via Rebill. Cancelás cuando quieras.
          </p>
        </>
      )
    }
    return (
      <>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (email.trim()) emailFirstCheckout(email.trim())
          }}
        >
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tu.email@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={redirecting}
            className="w-full bg-zinc-900 border rounded px-3 py-2 text-zinc-100 text-data placeholder:text-zinc-600 focus:outline-none mb-2 disabled:opacity-60"
            style={{ borderColor: `${accent}55` }}
          />
          <button
            type="submit"
            disabled={redirecting || !email.trim()}
            className="terminal-btn w-full text-center disabled:opacity-50"
            style={{ borderColor: `${accent}99`, color: accent }}
          >
            {redirecting ? 'Redirigiendo a pago…' : 'Contratar Starter · USD 49/mes →'}
          </button>
        </form>
        {error && <p className="mt-2 text-xxs text-red-400 text-center">{error}</p>}
        <p className="mt-2 text-xxs text-zinc-500 text-center">
          Pagás con ese email; el acceso llega por link mágico. ARS al equivalente USD via Rebill.
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
