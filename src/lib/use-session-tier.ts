'use client'

import { useEffect, useState } from 'react'

export type Tier = 'anonymous' | 'free' | 'pro'

export interface SessionState {
  loggedIn: boolean
  tier: Tier
  email: string | null
  loading: boolean
}

const INITIAL: SessionState = {
  loggedIn: false,
  tier: 'anonymous',
  email: null,
  loading: true,
}

/**
 * Client hook that fetches the current user's tier from /api/me.
 * Use this in client components inside statically generated pages so the
 * page can stay SSG while still adapting UI to logged-in/PRO state.
 *
 * While `loading` is true, do not render gated UI — render a neutral
 * placeholder or hide.
 */
export function useSessionTier(): SessionState {
  const [state, setState] = useState<SessionState>(INITIAL)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setState({
          loggedIn: !!data.loggedIn,
          // PRO Usuario retirado (2026-07): las herramientas del productor son
          // gratis para todos → forzamos 'pro' para abrir los gates que consultan
          // este hook. loggedIn/email se mantienen reales.
          tier: 'pro',
          email: data.email ?? null,
          loading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({ loggedIn: false, tier: 'pro', email: null, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
