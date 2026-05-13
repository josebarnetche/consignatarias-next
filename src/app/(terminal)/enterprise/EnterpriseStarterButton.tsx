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
        if (!accRes.ok) {
          console.warn('/api/account returned', accRes.status, '— falling back to free state')
          if (!cancelled) setState('free')
          return
        }
        const acc: AccountResponse = await accRes.json()
        // The response is { success, enterprise: { plan, ... }, ... } OR { plan: 'none' }
        const plan = acc?.enterprise?.plan
        console.log('[EnterpriseStarterButton] plan detected:', plan)
        if (plan && plan !== 'none') {
          if (!cancelled) setState('active_enterprise')
          return
        }
        if (!cancelled) setState('free')
      } catch (err) {
        console.error('[EnterpriseStarterButton] check failed:', err)
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
      let json: { checkoutUrl?: string; error?: string; message?: string } | null = null
      const bodyText = await res.text()
      try {
        json = JSON.parse(bodyText)
      } catch {
        // Body wasn't JSON — surface the raw status
        setError(
          `Respuesta inválida del servidor (HTTP ${res.status}). ${bodyText.slice(0, 120)}`,
        )
        setState('free')
        return
      }
      if (!res.ok || !json?.checkoutUrl) {
        if (res.status === 401) {
          // Probably session expired — push to login flow
          window.location.href = `/login?next=${encodeURIComponent('/enterprise')}`
          return
        }
        const msg = json?.message ?? json?.error ?? `Falla HTTP ${res.status}`
        setError(msg)
        setState('free')
        return
      }
      window.location.href = json.checkoutUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch_failed'
      setError(`Error de red: ${msg}`)
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
      <p className="mt-3 text-xxs text-zinc-500 text-center">
        ¿Ya sos Enterprise?{' '}
        <a
          href="/cuenta/api-keys"
          className="text-sky-400 hover:underline underline-offset-2"
        >
          Ir al dashboard
        </a>
      </p>
    </>
  )
}
