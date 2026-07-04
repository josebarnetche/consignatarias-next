'use client'

import { useState } from 'react'
import { trackAlertSubscribe } from '@/lib/analytics'

/**
 * FASE 0 — captura de demanda de precio (motor actual = cierre mensual).
 * Email-first, sin login: un input + botón que postea a /api/newsletter con un
 * `source` tag ('alerta-inmag' | 'alerta-arrendamiento') y dispara
 * trackAlertSubscribe({source, page}) para medir intención real.
 *
 * Reusa la misma infra que CierreMensualSubscribe (Resend, single opt-in,
 * source-tagging). La promesa por default es lo CUMPLIBLE hoy: el cierre
 * mensual (no hay motor de umbral por tick). El default del subtitle se deriva
 * del `source` para que arrendamiento hable de 'canon/arrendamiento' (demanda #1).
 *
 * accent: 'amber' (arrendamiento) | 'emerald' (inmag). Nota: ambas variantes
 * renderizan el acento de marca (cielo); solo el ✓ de éxito conserva color propio.
 */
const DEFAULT_SUBTITLES: Record<string, string> = {
  'alerta-arrendamiento':
    'Te mandamos el cierre mensual del novillo — el número para liquidar tu arrendamiento. Un mail por mes.',
  'alerta-inmag':
    'Te mandamos el cierre mensual del INMAG. Un mail por mes, sin spam por tick.',
}

export default function PriceAlertSignup({
  source,
  page,
  accent = 'emerald',
  title = 'Recibí el cierre mensual',
  subtitle,
}: {
  /** tag de origen para medir demanda: 'alerta-inmag' | 'alerta-arrendamiento' */
  source: string
  /** ruta de la landing donde se montó, para el evento GA */
  page: string
  accent?: 'amber' | 'emerald'
  title?: string
  subtitle?: string
}) {
  const resolvedSubtitle =
    subtitle ?? DEFAULT_SUBTITLES[source] ?? DEFAULT_SUBTITLES['alerta-inmag']
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const c = accent === 'emerald'
    ? { ring: 'focus-within:border-sky-500/60', btn: 'bg-accent hover:bg-sky-300', text: 'text-emerald-400', border: 'border-sky-500/20', glow: 'from-sky-500/5' }
    : { ring: 'focus-within:border-sky-500/60', btn: 'bg-accent hover:bg-sky-300', text: 'text-accent', border: 'border-sky-500/20', glow: 'from-sky-500/5' }

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
            : 'Listo — te llega el cierre mensual a tu mail.'
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
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">{resolvedSubtitle}</p>

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
          <p className="text-xs text-zinc-600 mt-3">Sin cuenta. Un mail por mes, sin spam. Te podés desuscribir cuando quieras.</p>
        )}
      </div>
    </div>
  )
}
