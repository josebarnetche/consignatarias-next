'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * Consulta por un campo. El contacto del oferente no se publica: la consulta
 * entra como lead y la conecta Jose (misma regla que El Ovejero).
 */
export default function ConsultarCampoForm({ campoId, resumen }: { campoId: number; resumen: string }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/campos/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo_id: campoId, nombre, telefono, email, mensaje }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        trackValueEvent('lead_form', { meta: { kind: 'consulta_campo', campo_id: campoId } })
      } else {
        setStatus('error')
        setError(data.error || 'No se pudo enviar la consulta.')
      }
    } catch {
      setStatus('error')
      setError('Error de conexión.')
    }
  }

  if (status === 'ok') {
    return (
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5">
        <p className="text-emerald-400 text-sm font-medium mb-1">✓ Recibimos tu consulta</p>
        <p className="text-zinc-400 text-sm">
          Hablamos con quien ofrece el campo y te contestamos. Si querés apurarlo, escribinos por WhatsApp al{' '}
          <a
            href="https://wa.me/5493773418130"
            className="text-accent hover:text-accent-bright"
          >
            +54 9 3773 41-8130
          </a>
          .
        </p>
      </div>
    )
  }

  const input =
    'w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors'

  return (
    <form onSubmit={onSubmit} className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 space-y-3">
      <p className="text-zinc-400 text-xs">
        Consultás por <span className="text-zinc-200">{resumen}</span>. Te contestamos nosotros — no
        publicamos el contacto de quien ofrece.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={input} />
        <input required value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className={input} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className={input} />
      </div>
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="¿Qué querés saber? (opcional)"
        rows={2}
        maxLength={500}
        className={input}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-5 py-2.5 text-sm bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Enviando…' : 'Consultar por el campo'}
      </button>
      {status === 'error' && error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
