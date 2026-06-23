'use client'

import { useState } from 'react'
import { trackAlertSubscribe } from '@/lib/analytics'

/**
 * FASE 0 — validación de demanda de alertas de precio (sin motor de umbral).
 * Email-first, sin login: un input + botón que postea a /api/newsletter con un
 * `source` tag ('alerta-inmag' | 'alerta-arrendamiento') y dispara
 * trackAlertSubscribe({source, page}) para medir intención real.
 *
 * Reusa la misma infra que CierreMensualSubscribe (Resend, single opt-in,
 * source-tagging). Default = digest, no spam por tick — el copy lo deja claro.
 *
 * accent: 'amber' (arrendamiento) | 'emerald' (inmag).
 */
export default function PriceAlertSignup({
  source,
  page,
  accent = 'emerald',
  title = 'Avisame cuando se mueva',
  subtitle = 'Te avisamos cuando se mueva el INMAG — sin cuenta, un mail. Sin spam por cada tick.',
}: {
  /** tag de origen para medir demanda: 'alerta-inmag' | 'alerta-arrendamiento' */
  source: string
  /** ruta de la landing donde se montó, para el evento GA */
  page: string
  accent?: 'amber' | 'emerald'
  title?: string
  subtitle?: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const c = accent === 'emerald'
    ? { ring: 'focus-within:border-emerald-500/60', btn: 'bg-emerald-500 hover:bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'from-emerald-500/5' }
    : { ring: 'focus-within:border-amber-500/60', btn: 'bg-amber-500 hover:bg-amber-400', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'from-amber-500/5' }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error'); setMsg('Email inválido'); return
    }
    setState('loading'); setMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState('ok')
        setMsg(
          data.message?.includes('Ya estás')
            ? 'Ya estabas anotado ✓'
            : 'Listo — te avisamos cuando se mueva.'
        )
        trackAlertSubscribe({ source, page })
      } else {
        setState('error'); setMsg(data.error || 'No se pudo anotar. Probá de nuevo.')
      }
    } catch {
      setState('error'); setMsg('Error de red. Probá de nuevo.')
    }
  }

  return (
    <div className={`bg-gradient-to-br ${c.glow} to-transparent border ${c.border} rounded-2xl p-6 lg:p-8`}>
      <div className="max-w-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">{subtitle}</p>

        {state === 'ok' ? (
          <div className={`flex items-center gap-2 ${c.text} font-medium`}>
            <span className="text-lg">✓</span><span>{msg}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <div className={`flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 ${c.ring}`}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={state === 'loading'}
              className={`${c.btn} text-zinc-950 font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap`}
            >
              {state === 'loading' ? 'Anotando…' : 'Avisame'}
            </button>
          </form>
        )}
        {state === 'error' && <p className="text-red-400 text-xs mt-2">{msg}</p>}
        {state !== 'ok' && (
          <p className="text-xs text-zinc-600 mt-3">Sin cuenta. Sin spam por tick — un aviso cuando hay movimiento. Te podés desuscribir cuando quieras.</p>
        )}
      </div>
    </div>
  )
}
