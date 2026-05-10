'use client'

import { useState } from 'react'

type State = 'idle' | 'submitting' | 'success' | 'error'

export function SubscribeForm({ source = 'el-corredor-landing' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/el-corredor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.error || 'No pudimos procesar tu suscripción. Intentá de nuevo.')
        setState('error')
        return
      }

      setState('success')
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-5 max-w-xl">
        <div className="flex items-start gap-3">
          <div className="text-emerald-400 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-emerald-400 font-mono font-semibold text-sm uppercase tracking-widest mb-1">
              Listo · revisá tu inbox
            </div>
            <p className="text-zinc-300 font-mono text-sm leading-relaxed">
              Te enviamos <strong>El Corredor — Abril 2026</strong> a <strong className="text-white">{email}</strong>.
              Si no llega en 2 minutos, mirá en spam (Resend a veces cae ahí la primera vez).
            </p>
            <p className="text-zinc-500 font-mono text-xs mt-3">
              La próxima edición sale el primer día hábil de junio.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="tu.email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'submitting' || !email.trim()}
          className="bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {state === 'submitting' ? 'Enviando…' : 'Recibir PDF →'}
        </button>
      </div>
      {state === 'error' && errorMsg && (
        <p className="mt-3 text-sm font-mono text-red-400">{errorMsg}</p>
      )}
    </form>
  )
}
