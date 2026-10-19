'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * "Consultar por este remate" en la ficha del remate (18-10-2026).
 *
 * La ficha del remate es adonde llega el productor desde el calendario, el mail
 * semanal y Google, y no tenía forma de escribirle a la firma: el único formulario
 * estaba en el perfil (y sólo para firmas sin contacto público). Acá la consulta va
 * a /api/leads con source 'remate', le llega a la firma por mail y entra a su panel.
 * Tres campos y el mensaje ya escrito: el productor no llena formularios largos.
 */
export default function ConsultarRemate({
  slug,
  firma,
  remate,
  remateId,
}: {
  slug: string
  firma: string
  remate: string
  remateId?: number
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState(`Hola, me interesa el remate «${remate}». ¿Me pasan más información?`)
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (listo) {
    return (
      <div className="rounded-xl border border-positive/30 bg-positive/10 px-5 py-4 text-sm text-positive">
        Listo, le mandamos tu consulta a {firma}. Te van a escribir al número que dejaste.
      </div>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full rounded-xl bg-accent px-5 py-3.5 text-center text-base font-semibold text-white oscuro:text-zinc-950 transition-colors hover:bg-accent-bright sm:w-auto"
      >
        Consultar a {firma} por este remate
      </button>
    )
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-terminal-border bg-terminal-panel p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setEnviando(true)
        setError(null)
        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, name: nombre, phone: telefono, message: mensaje, source: 'remate', remateId }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            setError(typeof data.error === 'string' ? data.error : 'No se pudo enviar. Probá de nuevo.')
            return
          }
          trackValueEvent('lead_form', { entityType: 'consignataria', entitySlug: slug })
          setListo(true)
        } catch {
          setError('Sin conexión. Probá de nuevo.')
        } finally {
          setEnviando(false)
        }
      }}
    >
      <p className="text-base font-semibold text-ink">Consultar a {firma}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-400">
          Tu nombre
          <input required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" className="mt-1 block w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
        </label>
        <label className="text-sm text-zinc-400">
          Tu WhatsApp o teléfono
          <input required type="tel" minLength={8} value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" placeholder="Ej. 3794 123456" className="mt-1 block w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
        </label>
      </div>
      <label className="block text-sm text-zinc-400">
        Mensaje
        <textarea rows={3} maxLength={1000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-1 block w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
      </label>
      {error && <p className="text-sm text-negative" role="alert">{error}</p>}
      <button type="submit" disabled={enviando} className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright disabled:opacity-60">
        {enviando ? 'Enviando…' : 'Enviar consulta'}
      </button>
      <p className="text-xs text-zinc-500">Tu consulta le llega sólo a {firma}.</p>
    </form>
  )
}
