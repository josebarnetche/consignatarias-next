'use client'

import { useState } from 'react'

type State = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Lightweight inline email-capture for El Corredor — embedded directly in the
 * CTA so the visitor subscribes WITHOUT navigating away (the old CTA only linked
 * to /el-corredor, an extra step that killed conversion). POSTs to the verified
 * /api/el-corredor/subscribe (which forces source='el-corredor' → corredor segment).
 */
export function ElCorredorInlineForm({
  editionLabel,
  context = 'unknown',
}: {
  editionLabel: string
  context?: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setErr(null)
    try {
      const res = await fetch('/api/el-corredor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: `cta-${context}` }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d?.error || 'No pudimos procesar. Reintentá.')
        setState('error')
        return
      }
      setState('success')
    } catch {
      setErr('Error de red. Reintentá.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Listo — te enviamos <strong>El Corredor</strong> a {email}. Revisá tu inbox.</span>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="tu.email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-white font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'submitting' || !email.trim()}
          className="bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {state === 'submitting' ? 'Enviando…' : `Recibir ${editionLabel} →`}
        </button>
      </div>
      {state === 'error' && err && <p className="mt-2 text-xs font-mono text-red-400">{err}</p>}
      <p className="mt-2 text-xxs font-mono text-zinc-600">Gratis · un email por mes · sin spam.</p>
    </form>
  )
}
