'use client'

import { useState } from 'react'
import { trackCheckoutStart, trackCheckoutRedirect } from '@/lib/analytics'

/**
 * PRO checkout button.
 * - loggedIn: uses /api/subscribe/checkout (current session).
 * - anonymous: email-first — collects email inline and uses the public endpoint
 *   that creates the user server-side, so cold organic traffic can pay WITHOUT
 *   hitting a login wall (the confirmed conversion bottleneck).
 */
export function UpgradeButton({ loggedIn = true }: { loggedIn?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  async function go(endpoint: string, payload?: Record<string, unknown>) {
    setError('')
    setLoading(true)
    trackCheckoutStart('PRO_USER', 7900)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      })
      const data = await res.json()
      if (!res.ok || !data?.checkoutUrl) {
        setError(data?.error || 'No pudimos generar el link de pago. Intentá de nuevo.')
        setLoading(false)
        return
      }
      trackCheckoutRedirect('PRO_USER', 7900)
      window.location.href = data.checkoutUrl
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  // ---- ANONYMOUS: email-first (no login wall) ----
  if (!loggedIn) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim()) go('/api/subscribe/checkout-public', { email: email.trim() })
        }}
      >
        <div className="flex flex-col gap-2">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tu.email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-4 rounded transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? 'Generando link de pago…' : 'Activar PRO · ARS $7.900/mes →'}
          </button>
        </div>
        <p className="mt-2 text-xxs font-mono text-zinc-600 text-center">
          Pagás con ese email · después accedés a tu cuenta con un link mágico al mismo email.
        </p>
        {error && <p className="mt-3 text-red-400 font-mono text-xs text-center">{error}</p>}
      </form>
    )
  }

  // ---- LOGGED-IN ----
  return (
    <div>
      <button
        onClick={() => go('/api/subscribe/checkout')}
        disabled={loading}
        className="w-full bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-4 rounded transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {loading ? 'Generando link de pago…' : 'Activar PRO · ARS $7.900/mes →'}
      </button>
      {error && <p className="mt-3 text-red-400 font-mono text-xs text-center">{error}</p>}
    </div>
  )
}
