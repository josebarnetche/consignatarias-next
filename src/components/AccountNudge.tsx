'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { onAccountNudge, type NudgePayload, type NudgeReason } from '@/lib/account-nudge'
import { trackAccountNudge } from '@/lib/analytics'
import { overlayShown, markOverlayShown } from '@/lib/overlay-bus'

/**
 * Global, non-blocking account nudge (mounted once in the root layout, like the
 * WhatsApp FAB). Listens on the account-nudge bus; when an anonymous user hits a
 * high-intent moment, it slides in a soft, dismissible invite to create a free
 * account with Google. Never blocks the action that triggered it.
 *
 * Suppression rules: never shown to logged-in users; snoozed 24h after a
 * dismissal; at most one visible at a time; at most once per page load.
 */

const SNOOZE_KEY = 'cnsg_nudge_snooze_until'
const SNOOZE_MS = 24 * 60 * 60 * 1000

const COPY: Record<NudgeReason, { title: string; body: string }> = {
  save_follow: {
    title: 'Guardá tus consignatarias',
    body: 'Entrá con Google para no perder lo que seguís y que te avisemos cuando publiquen un remate.',
  },
  calc_result: {
    title: 'Guardá tus cálculos',
    body: 'Entrá con Google para guardar el historial y comparar precios entre fechas.',
  },
  alert_subscribe: {
    title: 'Gestioná tus alertas',
    body: 'Entrá con Google para administrar todos tus avisos de precio desde un solo lugar.',
  },
  contact_reveal: {
    title: 'Todos los contactos, en tu cuenta',
    body: 'Entrá con Google para ver y guardar los contactos de todas las consignatarias del directorio.',
  },
  calendar_export: {
    title: 'Tu calendario, sincronizado',
    body: 'Entrá con Google para guardar y sincronizar los remates que seguís.',
  },
}

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    return Date.now() < until
  } catch {
    return false
  }
}

export default function AccountNudge() {
  // null = unknown (still checking /api/me); avoids a flash before we know auth.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [payload, setPayload] = useState<NudgePayload | null>(null)
  const [busy, setBusy] = useState(false)
  const shownThisLoad = useRef(false)
  const pending = useRef<NudgePayload | null>(null)

  // Resolve auth once. loggedIn stays null until this settles.
  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setLoggedIn(!!data?.loggedIn)
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Subscribe to the nudge bus.
  useEffect(() => {
    const maybeShow = (p: NudgePayload) => {
      if (shownThisLoad.current) return
      if (snoozed()) return
      if (overlayShown()) return // subscribe modal already took the corner this load
      shownThisLoad.current = true
      markOverlayShown()
      setPayload(p)
      trackAccountNudge('view', p.reason)
    }

    return onAccountNudge((p) => {
      // Unknown auth yet → stash and decide when /api/me resolves.
      if (loggedIn === null) {
        pending.current = p
        return
      }
      if (loggedIn) return // logged-in users are never nudged
      maybeShow(p)
    })
  }, [loggedIn])

  // Flush a stashed nudge once auth resolves to anonymous.
  useEffect(() => {
    if (loggedIn === false && pending.current && !shownThisLoad.current && !snoozed() && !overlayShown()) {
      const p = pending.current
      pending.current = null
      shownThisLoad.current = true
      markOverlayShown()
      setPayload(p)
      trackAccountNudge('view', p.reason)
    }
  }, [loggedIn])

  function dismiss() {
    if (payload) trackAccountNudge('dismiss', payload.reason)
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      /* private mode — just close */
    }
    setPayload(null)
  }

  async function continueWithGoogle() {
    if (!payload) return
    trackAccountNudge('click', payload.reason)
    setBusy(true)
    try {
      const supabase = createClient()
      const next = window.location.pathname + window.location.search
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl },
      })
      if (error) setBusy(false)
      // On success the browser navigates to Google; keep the button busy.
    } catch {
      setBusy(false)
    }
  }

  if (!payload) return null
  const copy = COPY[payload.reason]
  const strong = payload.strength === 'strong'

  return (
    <div
      role="complementary"
      aria-label="Sumate con una cuenta gratis"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-sm sm:inset-x-auto sm:left-4 sm:mx-0"
    >
      <div
        className={`terminal-panel rounded-xl bg-[#0b0b0e]/95 p-4 shadow-2xl backdrop-blur-sm ${
          strong ? 'border border-sky-500/40' : 'border border-zinc-700/80'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
              strong ? 'bg-sky-500/15 text-sky-400' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="mb-1 font-mono text-sm text-zinc-100">{copy.title}</p>
            <p className="mb-3 font-mono text-xs leading-relaxed text-zinc-400">{copy.body}</p>

            <div className="flex items-center gap-2">
              <button
                onClick={continueWithGoogle}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded bg-zinc-100 px-3 py-2 font-mono text-xs font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
              >
                <GoogleIcon />
                {busy ? 'Redirigiendo…' : 'Continuá con Google'}
              </button>
              <button
                onClick={dismiss}
                className="rounded px-2 py-2 font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Ahora no
              </button>
            </div>

            <p className="mt-2 font-mono text-[10px] text-zinc-600">Gratis · sin tarjeta · seguís usando todo igual.</p>
          </div>

          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 shrink-0 rounded p-1 text-zinc-600 transition-colors hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
