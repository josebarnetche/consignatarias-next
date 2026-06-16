'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  slug: string
  displayName: string
  /** Optional 30-day view count for social proof (passed by outreach landings). */
  views?: number | null
}

/**
 * ActivarProForm — email-first PRO Consignataria checkout CTA. Mirrors ClaimForm's
 * terminal-theme structure. POSTs to /api/consignataria/checkout-public and redirects
 * the firm to the Rebill checkout. The money path's front door for the first peso.
 */
export default function ActivarProForm({ slug, displayName, views }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/consignataria/checkout-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setErrorMsg(data?.error || 'No pudimos generar el pago. Probá de nuevo.')
      setState('error')
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">ACTIVAR PRO</span>
        <Link
          href={`/consignatarias/${slug}`}
          className="text-zinc-500 hover:text-accent text-xxs font-terminal transition-colors"
        >
          ← VOLVER
        </Link>
      </div>

      <div className="px-panel py-4 space-y-4">
        {typeof views === 'number' && views > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded">
            <span className="text-amber-400">👁</span>
            <span className="text-amber-300/90 text-xs font-terminal">
              Tu perfil fue visto <span className="font-bold">{views}</span> veces en los últimos 30 días
            </span>
          </div>
        )}

        <p className="text-data text-zinc-400 font-terminal">
          Activá el perfil PRO de <span className="text-zinc-200 font-semibold">{displayName}</span> y
          aparecé con prioridad ante los productores que buscan consignataria.
        </p>

        {state === 'error' && (
          <div className="terminal-panel border-negative/30 px-3 py-2">
            <span className="text-negative text-data font-terminal">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Email de la consignataria
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              if (state === 'error') setState('idle')
              setEmail(e.target.value)
            }}
            placeholder="info@tuconsignataria.com"
            className="terminal-input w-full"
            autoComplete="email"
          />
          <p className="text-zinc-600 text-xxs font-terminal">
            Te enviaremos la confirmación y el acceso a este email
          </p>
        </div>

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="w-full px-4 py-3 bg-positive text-zinc-900 text-sm font-bold uppercase tracking-wider hover:bg-positive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          {state === 'submitting' ? 'Generando pago…' : 'Activar PRO — ARS 45.000/mes →'}
        </button>

        <div className="pt-3 border-t border-zinc-800">
          <p className="text-xxs text-zinc-500 uppercase tracking-wider mb-2 font-terminal">
            Tu perfil PRO incluye:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-400 font-terminal">
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Prioridad de aparición (destacado) + badge PRO
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Analítica de tu perfil (vistas, ranking)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Promoción de tus remates por email
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Tu calendario distribuible y tu historial verificable
            </li>
          </ul>
        </div>

        <p className="text-center text-zinc-600 text-xxs font-terminal">
          Suscripción mensual · Cancelás cuando quieras
        </p>
      </div>
    </form>
  )
}
