'use client'

import { useState } from 'react'

/**
 * Producer-facing capture for the monthly INMAG close.
 * "Subscribe and on the 1st of each month you get the average of the month
 * that closed." Posts to /api/newsletter with source='cierre-mensual'.
 *
 * accent: 'amber' (arrendamiento) | 'emerald' (inmag).
 */
export default function CierreMensualSubscribe({
  accent = 'amber',
  title = 'Recibí el cierre mensual',
  subtitle = 'El 1° de cada mes te llega el promedio del Índice Novillo del mes que cerró — el número para liquidar tu arrendamiento. Gratis.',
  source = 'cierre-mensual',
  withLease = false,
}: {
  accent?: 'amber' | 'emerald'
  title?: string
  subtitle?: string
  source?: string
  /** Si true, adjunta el arriendo guardado (localStorage del calculador) → el email trae TU canon. */
  withLease?: boolean
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const c = accent === 'emerald'
    ? { ring: 'focus-within:border-emerald-500/60', btn: 'bg-emerald-500 hover:bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'from-emerald-500/5' }
    : { ring: 'focus-within:border-amber-500/60', btn: 'bg-amber-500 hover:bg-amber-400', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'from-amber-500/5' }

  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error'); setMsg('Email inválido'); return
    }
    setState('loading'); setMsg('')

    // Adjuntar el arriendo guardado (si el usuario lo guardó en el calculador).
    const payload: Record<string, unknown> = { email: value, source }
    let hasLease = false
    if (withLease) {
      try {
        const saved = JSON.parse(localStorage.getItem('arrendamiento-calc-v1') || 'null')
        if (saved && typeof saved.kgHa === 'number' && saved.kgHa > 0 && typeof saved.hectareas === 'number' && saved.hectareas > 0) {
          payload.kgHa = saved.kgHa
          payload.hectareas = saved.hectareas
          hasLease = true
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState('ok')
        setMsg(
          data.message?.includes('Ya estás')
            ? 'Ya estabas suscripto ✓'
            : hasLease
            ? `Listo — el 1° de ${nextMonth} te llega tu canon actualizado.`
            : `Listo — te llega el 1° de ${nextMonth}.`
        )
      } else {
        setState('error'); setMsg(data.error || 'No se pudo suscribir. Probá de nuevo.')
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
              {state === 'loading' ? 'Suscribiendo…' : 'Suscribirme'}
            </button>
          </form>
        )}
        {state === 'error' && <p className="text-red-400 text-xs mt-2">{msg}</p>}
        {state !== 'ok' && (
          <p className="text-xs text-zinc-600 mt-3">Un email por mes. Sin spam. Te podés desuscribir cuando quieras.</p>
        )}
      </div>
    </div>
  )
}
