'use client'

import { useState } from 'react'

/**
 * "Recibí la propuesta por mail" — al lado del checkout (17-10-2026). La firma que
 * todavía no decide, o que tiene que consultarlo con su socio, se lleva la propuesta
 * con la marca y sus números, sin hablar con nadie. A nosotros nos llega en copia.
 */
export default function PedirPropuesta({ slug, displayName }: { slug: string; displayName: string }) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function pedir(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    try {
      const res = await fetch('/api/propuesta/pedir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, nombre: nombre || undefined }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok) {
        setEstado('ok')
      } else {
        setMsg(d?.error ?? 'No pudimos mandarla. Probá de nuevo.')
        setEstado('error')
      }
    } catch {
      setMsg('Error de conexión.')
      setEstado('error')
    }
  }

  if (estado === 'ok') {
    return (
      <div className="terminal-panel mt-4 px-panel py-4">
        <p className="text-sm text-zinc-100">Listo: te mandamos la propuesta a {email}.</p>
        <p className="mt-1 text-xs text-zinc-500">Si no la ves en unos minutos, revisá spam o promociones.</p>
      </div>
    )
  }

  return (
    <form onSubmit={pedir} className="terminal-panel mt-4">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">¿PRIMERO QUERÉS VER LA PROPUESTA?</span>
      </div>
      <div className="px-panel py-4 space-y-3">
        <p className="text-xs text-zinc-400">
          Te mandamos por mail la propuesta PRO para {displayName}: qué incluye, sus números en el sitio y una
          versión para imprimir o reenviar.
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (estado === 'error') setEstado('idle') }}
          placeholder="tu@mail.com"
          autoComplete="email"
          className="terminal-input w-full"
          aria-label="Mail para recibir la propuesta"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={80}
          placeholder="Tu nombre (opcional)"
          autoComplete="name"
          className="terminal-input w-full"
          aria-label="Tu nombre"
        />
        {estado === 'error' && <p className="text-xs text-negative">{msg}</p>}
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="w-full rounded border border-accent/60 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Enviando…' : 'Mandame la propuesta'}
        </button>
      </div>
    </form>
  )
}
