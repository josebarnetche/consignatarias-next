'use client'

import { useState } from 'react'

/**
 * Confirmación de baja prefetch-safe: NO da de baja en el GET (los escáneres de
 * Gmail/Outlook prefetchean los links y desuscribirían a quien no clickeó). El
 * usuario confirma con un botón → POST a /api/newsletter/unsubscribe. Si llega
 * con ?ok=1 (redirigido desde el one-click del cliente de correo), muestra el
 * estado final directo.
 */
export default function UnsubscribeConfirm({ email, alreadyDone }: { email: string; alreadyDone: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(alreadyDone ? 'done' : 'idle')

  async function confirm() {
    if (state === 'loading') return
    setState('loading')
    try {
      const res = await fetch(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="text-data font-terminal text-zinc-300 leading-relaxed">
        Listo, te diste de baja. No vas a recibir más mails a{' '}
        <span className="text-zinc-100">{email}</span>. Si fue un error, podés volver a suscribirte cuando quieras.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-data font-terminal text-zinc-300 leading-relaxed">
        ¿Querés dar de baja a <span className="text-zinc-100">{email || 'tu email'}</span> de los avisos de consignatarias.com.ar?
      </p>
      {state === 'error' && (
        <p className="text-xxs font-terminal text-negative">No se pudo procesar la baja. Probá de nuevo en un rato.</p>
      )}
      <button
        onClick={confirm}
        disabled={!email || state === 'loading'}
        className="px-4 py-2 text-xxs font-terminal uppercase tracking-wider border border-terminal-border text-zinc-300 rounded-terminal hover:border-zinc-500 transition-colors disabled:opacity-50"
      >
        {state === 'loading' ? 'Procesando…' : 'Confirmar baja'}
      </button>
    </div>
  )
}
