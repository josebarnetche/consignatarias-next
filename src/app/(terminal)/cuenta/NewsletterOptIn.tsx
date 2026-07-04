'use client'

import { useState } from 'react'

/**
 * Ítem del checklist "Empezá por acá": suscripción al resumen semanal con un
 * click (el email ya lo tenemos — es la cuenta). POST a /api/newsletter.
 */
export default function NewsletterOptIn({ email, initialDone }: { email: string; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone)
  const [busy, setBusy] = useState(false)

  async function subscribe() {
    if (done || busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'cuenta-checklist' }),
      })
      if (r.ok) setDone(true)
    } catch {
      // queda pendiente; el usuario puede reintentar
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-panel py-3">
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xxs flex-shrink-0 ${
          done ? 'border-positive/40 bg-positive/10 text-positive' : 'border-zinc-700 text-transparent'
        }`}
      >
        ✓
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200">Recibí el resumen semanal</div>
        <div className="text-xxs text-zinc-500">INMAG, remates y lo que movió el mercado, cada semana en tu mail.</div>
      </div>
      {done ? (
        <span className="text-xxs text-positive font-terminal uppercase tracking-wider flex-shrink-0">Activo</span>
      ) : (
        <button
          onClick={subscribe}
          disabled={busy}
          className="flex-shrink-0 text-xxs font-terminal uppercase tracking-wider text-zinc-950 bg-accent hover:bg-sky-300 disabled:opacity-60 rounded-sm px-3 py-1.5 transition-colors"
        >
          {busy ? '…' : 'Activar'}
        </button>
      )}
    </div>
  )
}
