'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import manifest from '../../public/el-corredor/manifest.json'
import { trackValueEvent, trackEvent } from '@/lib/analytics'
import { overlayShown, markOverlayShown } from '@/lib/overlay-bus'

/**
 * Global subscribe modal — the site's primary email-capture lever.
 *
 * Problem it solves: the subscribe rate was ~0.7% of visitors because most
 * pages never *ask*. This shows the strongest incentive we have — El Corredor,
 * the monthly market PDF delivered INSTANTLY on signup — once per visitor, only
 * after real engagement, on content pages only.
 *
 * Respect rules (why this isn't spam):
 *  - fires ONCE per page load, and only after a genuine engagement signal
 *    (deep scroll, long dwell, or a desktop exit-intent) — never on arrival;
 *  - coordinated with the account nudge via overlay-bus so only one ever shows;
 *  - durable snooze: 30 days after a dismissal, forever after a subscribe;
 *  - suppressed on admin / checkout / auth / account / the El Corredor page itself;
 *  - anonymous only (logged-in readers get the inline strips instead).
 *
 * Mounted once in the root layout, sibling to <AccountNudge/> and the WhatsApp FAB.
 */

const SNOOZE_KEY = 'cnsg_sub_modal_snooze_until'
const DONE_KEY = 'cnsg_sub_modal_done' // set once subscribed → never show again
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

const EDITION = manifest.current.edition_label // "Junio · 2026"
const EDITION_MONTH = EDITION.split('·')[0].trim() // "Junio"
const COVER = manifest.current.cover_path

// Paths where a capture modal would be wrong (mid-task, already-a-customer, or
// the dedicated El Corredor page which has its own richer form).
const SUPPRESSED_PREFIXES = [
  '/admin',
  '/cuenta',
  '/mi-cuenta',
  '/auth',
  '/login',
  '/checkout',
  '/upgrade',
  '/planes',
  '/enterprise',
  '/el-corredor',
  '/api',
]

function suppressedPath(path: string): boolean {
  return SUPPRESSED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
}

function suppressed(): boolean {
  try {
    if (localStorage.getItem(DONE_KEY)) return true
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    if (Date.now() < until) return true
  } catch {
    /* private mode — fall through, still one-per-load via overlay-bus */
  }
  return false
}

type State = 'idle' | 'submitting' | 'success' | 'error'

export default function SubscribeModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)
  const armed = useRef(false) // listeners attached, waiting for a trigger
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Gate: anonymous only, not suppressed, not on a suppressed path, and no
    // other overlay already shown this load.
    if (typeof window === 'undefined') return
    if (suppressedPath(window.location.pathname)) return
    if (suppressed()) return

    let cancelled = false
    let cleanup = () => {}

    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.loggedIn) return // logged-in readers → inline strips, not a modal
        cleanup = arm()
      })
      .catch(() => {
        if (!cancelled) cleanup = arm()
      })

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fire(trigger: string) {
    if (armed.current === false) return
    if (overlayShown() || suppressed()) return
    armed.current = false
    markOverlayShown()
    setOpen(true)
    trackEvent('subscribe_modal_view', { trigger })
    // Focus the field a beat after mount so the reveal animation can settle.
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  function arm(): () => void {
    armed.current = true

    // 1) Deep scroll — reader is engaged with the content.
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      if (max <= 0) return
      if (doc.scrollTop / max >= 0.55) fire('scroll')
    }
    // 2) Long dwell — even a non-scroller who stays is interested.
    const dwell = window.setTimeout(() => fire('dwell'), 35_000)
    // 3) Desktop exit-intent — mouse leaves toward the tab bar.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire('exit')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseout', onMouseOut)

    return () => {
      window.clearTimeout(dwell)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }

  // Esc to close while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss() {
    trackEvent('subscribe_modal_dismiss', {})
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      /* private mode — just close */
    }
    setOpen(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setErr(null)
    try {
      const res = await fetch('/api/el-corredor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'modal' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d?.error || 'No pudimos procesar. Reintentá.')
        setState('error')
        return
      }
      setState('success')
      // Channel attribution: the DB row is forced to source 'el-corredor', so
      // record the real acquisition surface in the value-events ledger instead.
      trackValueEvent('newsletter_subscribe', { meta: { source: 'modal' } })
      try {
        localStorage.setItem(DONE_KEY, '1')
      } catch {
        /* ignore */
      }
    } catch {
      setErr('Error de red. Reintentá.')
      setState('error')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recibí El Corredor, el cierre mensual del mercado"
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-3 sm:p-4"
    >
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={dismiss}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
      />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-sky-500/25 bg-[#0b0b0e] shadow-2xl shadow-black/60 animate-[popIn_.22s_ease-out]">
        <div className="absolute -top-16 left-1/2 h-48 w-[420px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[90px] pointer-events-none" />

        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative p-6 sm:p-7">
          {state === 'success' ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 font-mono text-lg font-bold text-white">Listo, ya sos parte de la mesa.</h2>
              <p className="mb-5 font-mono text-sm leading-relaxed text-zinc-400">
                Te enviamos <strong className="text-zinc-200">El Corredor</strong> a{' '}
                <span className="text-sky-400">{email}</span>. Revisá tu inbox — y cada mes te llega el nuevo cierre.
              </p>
              <button
                onClick={() => setOpen(false)}
                className="rounded bg-zinc-100 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-white"
              >
                Seguir navegando
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/40" />
                  <span className="relative h-2 w-2 rounded-full bg-sky-400" />
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Mesa de hacienda · cierre mensual
                </span>
              </div>

              <div className="mb-5 flex gap-4">
                <Image
                  src={COVER}
                  alt={`El Corredor — ${EDITION}`}
                  width={92}
                  height={122}
                  className="hidden h-auto w-[92px] shrink-0 rounded border border-zinc-800 shadow-lg shadow-black/50 sm:block"
                />
                <div className="min-w-0">
                  <h2 className="mb-1 font-mono text-2xl font-bold tracking-tight text-white">El Corredor</h2>
                  <p className="font-mono text-sm leading-relaxed text-zinc-400">
                    El cierre mensual del mercado bovino argentino. INMAG en USD reales, 18 categorías del MAG,
                    lectura del ciclo y la tesis del mes próximo.
                  </p>
                  <p className="mt-2 font-mono text-xs text-zinc-300">
                    12 páginas · <span className="text-sky-400">gratis</span> · te llega ahora a tu correo.
                  </p>
                </div>
              </div>

              <form onSubmit={submit}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu.email@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={state === 'submitting'}
                    className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-4 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={state === 'submitting' || !email.trim()}
                    className="whitespace-nowrap rounded bg-sky-400 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-sky-300 active:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {state === 'submitting' ? 'Enviando…' : `Recibir ${EDITION_MONTH} →`}
                  </button>
                </div>
                {state === 'error' && err && <p className="mt-2 font-mono text-xs text-red-400">{err}</p>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] text-zinc-600">Un email por mes · sin spam · baja cuando quieras.</p>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="shrink-0 font-mono text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Ahora no
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
