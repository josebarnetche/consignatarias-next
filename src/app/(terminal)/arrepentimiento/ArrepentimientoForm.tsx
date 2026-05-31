'use client'

import { useState } from 'react'

export default function ArrepentimientoForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [motivo, setMotivo] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/arrepentimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, identificador, motivo }),
      })
      setStatus(res.ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'ok') {
    return (
      <div className="border border-emerald-500/30 bg-emerald-500/[0.05] rounded-lg p-5">
        <p className="text-emerald-300 text-sm font-medium mb-1">Solicitud recibida</p>
        <p className="text-zinc-400 text-sm">
          Registramos tu solicitud de arrepentimiento y te enviamos una confirmación por email. La
          procesaremos sin costo a la brevedad. Si tenés una suscripción activa, también podés darla de baja
          desde <a href="/cuenta" className="text-sky-400 hover:underline">tu cuenta</a>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Nombre y apellido *</label>
          <input
            type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
          />
        </div>
        <div>
          <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Email de la suscripción *</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
          />
        </div>
      </div>
      <div>
        <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Plan o N° de operación (opcional)</label>
        <input
          type="text" value={identificador} onChange={(e) => setIdentificador(e.target.value)}
          placeholder="Ej.: PRO Usuario / comprobante de pago"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-600"
        />
      </div>
      <div>
        <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Motivo (opcional)</label>
        <textarea
          value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
        />
      </div>
      {status === 'error' && (
        <p className="text-rose-400 text-xs">
          No pudimos procesar la solicitud. Escribinos directamente a{' '}
          <a href="mailto:agro@memola.com.ar" className="underline">agro@memola.com.ar</a>.
        </p>
      )}
      <button
        type="submit" disabled={status === 'sending'}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-sm font-medium rounded transition-colors"
      >
        {status === 'sending' ? 'Enviando…' : 'Enviar solicitud de arrepentimiento'}
      </button>
      <p className="text-zinc-600 text-xxs">
        El ejercicio del derecho de arrepentimiento es gratuito y sin responsabilidad para el consumidor.
      </p>
    </form>
  )
}
