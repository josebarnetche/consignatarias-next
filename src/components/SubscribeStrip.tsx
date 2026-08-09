'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * SubscribeStrip — a persistent, inline email-capture band for high-traffic
 * pages that had NO capture at all (consignataria & frigorífico profiles — the
 * pages whose views are *growing*). Unlike the modal (once, on engagement), this
 * is always visible: the reader who scrolls a profile to the end gets a standing
 * ask with a page-matched incentive.
 *
 * Two incentives:
 *  - mode="corredor"  → El Corredor PDF, delivered INSTANTLY on signup
 *    (POST /api/el-corredor/subscribe). The strongest hook — use as default.
 *  - mode="newsletter" → a segmented list (e.g. the monthly faena report)
 *    (POST /api/newsletter with `source`).
 */

type Mode = 'corredor' | 'newsletter'
type State = 'idle' | 'submitting' | 'success' | 'error'

interface Props {
  mode?: Mode
  /** newsletter mode only — the segment tag written to newsletter_subscribers */
  source?: string
  /** Small uppercase eyebrow above the headline. */
  eyebrow?: string
  title: string
  body: string
  cta?: string
  /** channel label for the value-events ledger (attribution) */
  channel?: string
}

export default function SubscribeStrip({
  mode = 'corredor',
  source = 'perfil',
  eyebrow = 'Mesa de hacienda · cierre mensual',
  title,
  body,
  cta = 'Recibir',
  channel = 'strip',
}: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setErr(null)
    try {
      const endpoint = mode === 'corredor' ? '/api/el-corredor/subscribe' : '/api/newsletter'
      const payload =
        mode === 'corredor'
          ? { email: email.trim(), source: `strip-${channel}` }
          : { email: email.trim(), source }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d?.error || 'No pudimos procesar. Reintentá.')
        setState('error')
        return
      }
      setState('success')
      trackValueEvent('newsletter_subscribe', { meta: { source: channel } })
    } catch {
      setErr('Error de red. Reintentá.')
      setState('error')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-zinc-900/40 p-5">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-[380px] -translate-x-1/2 rounded-full bg-sky-500/5 blur-[80px]" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/40" />
            <span className="relative h-2 w-2 rounded-full bg-sky-400" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-400">
            {eyebrow}
          </span>
        </div>

        <h3 className="mb-1 font-mono text-lg font-bold tracking-tight text-white">{title}</h3>
        <p className="mb-4 max-w-xl font-mono text-sm leading-relaxed text-zinc-400">{body}</p>

        {state === 'success' ? (
          <div className="flex items-center gap-2 font-mono text-sm text-emerald-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {mode === 'corredor' ? (
                <>Listo — te enviamos <strong>El Corredor</strong> a {email}. Revisá tu inbox.</>
              ) : (
                <>Listo, ya estás suscripto. Te llega el próximo informe.</>
              )}
            </span>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex max-w-md flex-col gap-2 sm:flex-row">
              <input
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
                {state === 'submitting' ? 'Enviando…' : `${cta} →`}
              </button>
            </div>
            {state === 'error' && err && <p className="mt-2 font-mono text-xs text-red-400">{err}</p>}
            <p className="mt-2 font-mono text-[10px] text-zinc-600">Gratis · un email por mes · sin spam.</p>
          </form>
        )}
      </div>
    </div>
  )
}
