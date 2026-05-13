'use client'

import { useEffect, useState } from 'react'

interface MeResponse {
  loggedIn: boolean
  tier: string
  email: string | null
}

interface AccountResponse {
  enterprise?: { plan?: string }
}

/**
 * Self-serve checkout button for Enterprise Starter (USD 99 / ARS equiv).
 * Auth-aware: anonymous users get a login redirect, logged-in non-enterprise
 * users get a Rebill payment link, current enterprise users get a deep-link
 * to their dashboard.
 */
export default function EnterpriseStarterButton() {
  const [state, setState] = useState<
    'loading' | 'anon' | 'free' | 'active_enterprise' | 'redirecting' | 'error'
  >('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' })
        const me: MeResponse = await meRes.json()
        if (!me.loggedIn) {
          if (!cancelled) setState('anon')
          return
        }
        // Logged in — check if they already have an active Enterprise tier
        const accRes = await fetch('/api/account', { cache: 'no-store' })
        const acc: AccountResponse = await accRes.json()
        if (acc?.enterprise?.plan && acc.enterprise.plan !== 'none') {
          if (!cancelled) setState('active_enterprise')
          return
        }
        if (!cancelled) setState('free')
      } catch {
        if (!cancelled) setState('free') // fail open to the CTA
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  async function checkout() {
    setState('redirecting')
    setError(null)
    try {
      const res = await fetch('/api/enterprise/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json?.checkoutUrl) {
        setError(json?.message ?? 'No se pudo crear el link de pago.')
        setState('free')
        return
      }
      window.location.href = json.checkoutUrl
    } catch {
      setError('Error de red. Probá de nuevo.')
      setState('free')
    }
  }

  if (state === 'loading') {
    return (
      <button
        disabled
        className="terminal-btn w-full text-center opacity-50 cursor-wait"
      >
        Cargando…
      </button>
    )
  }

  if (state === 'anon') {
    return (
      <a
        href={`/login?next=${encodeURIComponent('/enterprise')}`}
        className="terminal-btn w-full text-center"
        style={{ borderColor: 'rgba(113, 113, 122, 0.6)', color: '#a1a1aa' }}
      >
        Iniciar sesión para contratar →
      </a>
    )
  }

  if (state === 'active_enterprise') {
    return (
      <a
        href="/cuenta/api-keys"
        className="terminal-btn w-full text-center"
        style={{ borderColor: 'rgba(52, 211, 153, 0.6)', color: '#34d399' }}
      >
        Ya sos Enterprise · Ir al dashboard →
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={checkout}
        disabled={state === 'redirecting'}
        className="terminal-btn w-full text-center disabled:opacity-50"
        style={{ borderColor: 'rgba(113, 113, 122, 0.6)', color: '#e4e4e7' }}
      >
        {state === 'redirecting' ? 'Redirigiendo a pago…' : 'Contratar Starter ahora →'}
      </button>
      {error && (
        <p className="mt-2 text-xxs text-red-400 text-center">{error}</p>
      )}
      <p className="mt-2 text-xxs text-zinc-500 text-center">
        Pago en ARS al equivalente USD via Rebill. Cancelás cuando quieras.
      </p>
    </>
  )
}
