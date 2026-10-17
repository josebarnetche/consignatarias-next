'use client'

import { useState } from 'react'

/**
 * Formulario de oferta sobre un lote de la firma (17-10-2026). Sin sesión: nombre,
 * teléfono o email (al menos uno), monto opcional y mensaje. El servidor revalida todo
 * (ofertaFirmaSchema); acá solo se evita el viaje inútil más obvio.
 */
export default function OfertaLoteForm({ preofertaId, loteId, loteTitulo }: { preofertaId: string; loteId: string; loteTitulo: string }) {
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  if (listo) {
    return (
      <p className="text-sm text-positive" role="status">
        Listo: tu oferta por «{loteTitulo}» le llegó a la consignataria. Te van a contactar antes del remate.
      </p>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-terminal border border-positive/50 px-3 py-1.5 text-xs font-terminal uppercase tracking-wider text-positive hover:bg-positive/10"
      >
        Dejar mi oferta
      </button>
    )
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const telefono = String(f.get('telefono') ?? '').trim()
    const email = String(f.get('email') ?? '').trim()
    if (!telefono && !email) {
      setError('Dejá un teléfono o un email para que la consignataria te contacte')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/preoferta/firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preoferta_id: preofertaId,
          lote_id: loteId,
          nombre: String(f.get('nombre') ?? ''),
          telefono,
          email,
          monto: String(f.get('monto') ?? ''),
          mensaje: String(f.get('mensaje') ?? ''),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : (j.error?.message ?? 'No se pudo enviar la oferta. Probá de nuevo.'))
        return
      }
      setListo(true)
    } catch {
      setError('Sin conexión. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const campo = 'w-full rounded-terminal border border-terminal-border bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none'

  return (
    <form onSubmit={enviar} className="grid gap-2.5 sm:grid-cols-2" aria-label={`Oferta por ${loteTitulo}`}>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Nombre y apellido o razón social
        <input name="nombre" required minLength={3} maxLength={120} autoComplete="name" className={`${campo} mt-1`} />
      </label>
      <label className="text-xs text-zinc-400">
        Teléfono
        <input name="telefono" type="tel" maxLength={40} autoComplete="tel" className={`${campo} mt-1`} />
      </label>
      <label className="text-xs text-zinc-400">
        Email
        <input name="email" type="email" maxLength={160} autoComplete="email" className={`${campo} mt-1`} />
      </label>
      <label className="text-xs text-zinc-400">
        Monto que ofrecés (ARS, opcional)
        <input name="monto" inputMode="numeric" pattern="[0-9.]*" maxLength={18} placeholder="Ej. 1.500.000" className={`${campo} mt-1 tabular-nums`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Mensaje (opcional)
        <textarea name="mensaje" rows={2} maxLength={1000} className={`${campo} mt-1`} />
      </label>
      <p className="sm:col-span-2 text-xxs text-zinc-500">
        Al menos un teléfono o un email. Tus datos le llegan solo a la consignataria; no se publican.
      </p>
      {error && <p className="sm:col-span-2 text-xs text-negative" role="alert">{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-terminal bg-accent px-3.5 py-1.5 text-xs font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar oferta'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="px-2 text-xs text-zinc-500 hover:text-zinc-300">
          Cancelar
        </button>
      </div>
    </form>
  )
}
