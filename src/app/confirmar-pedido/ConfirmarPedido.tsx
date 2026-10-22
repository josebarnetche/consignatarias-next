'use client'

import { useState } from 'react'

/** Botón del doble opt-in: confirma con POST, nunca en el GET (escáneres de correo). */
export default function ConfirmarPedido({ lead, token }: { lead: string; token: string }) {
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'hecho' | 'error'>('listo')
  const [error, setError] = useState('')

  async function confirmar() {
    if (estado === 'enviando') return
    setEstado('enviando')
    try {
      const res = await fetch(`/api/agente/confirmar?lead=${encodeURIComponent(lead)}&t=${encodeURIComponent(token)}`, { method: 'POST' })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) setEstado('hecho')
      else {
        setError(j.error ?? 'No se pudo confirmar.')
        setEstado('error')
      }
    } catch {
      setError('No se pudo confirmar. Probá de nuevo en un rato.')
      setEstado('error')
    }
  }

  if (estado === 'hecho') {
    return (
      <p className="text-data font-terminal text-zinc-300 leading-relaxed">
        Listo, pedido confirmado. Empezamos a buscar contraparte y te escribimos a este mismo correo cuando haya novedades.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-data font-terminal text-zinc-300 leading-relaxed">
        Confirmá que el pedido es tuyo y que querés que busquemos contraparte. Si no lo pediste, cerrá esta página: no te vamos a escribir.
      </p>
      {estado === 'error' && <p className="text-xxs font-terminal text-negative">{error}</p>}
      <button
        onClick={confirmar}
        disabled={!lead || !token || estado === 'enviando'}
        className="px-4 py-2 text-xxs font-terminal uppercase tracking-wider border border-terminal-border text-zinc-300 rounded-terminal hover:border-zinc-500 transition-colors disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Confirmando…' : 'Sí, el pedido es mío'}
      </button>
    </div>
  )
}
