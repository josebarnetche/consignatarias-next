'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * "Quiero que me contacten".
 *
 * El proveedor no publica su teléfono ni su mail, así que el canal es éste: el interesado
 * deja SUS datos y se los derivamos. Por eso el formulario dice con todas las letras a
 * quién van a parar — pasarle los datos de alguien a un tercero sin avisarlo sería otra
 * cosa, aunque el tercero sea quien pidió aparecer.
 *
 * Con teléfono o email alcanza: hay quien no usa mail y hay quien no da el teléfono.
 */
export function ContactarProveedor({ slug, empresa }: { slug: string; empresa: string }) {
  const [nombre, setNombre] = useState('')
  const [empresaInteresado, setEmpresaInteresado] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo' | 'error'>('idle')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!telefono.trim() && !email.trim()) {
      setError('Dejanos un teléfono o un email para que te puedan contactar.')
      setEstado('error')
      return
    }
    setEstado('enviando')
    setError('')
    try {
      const res = await fetch('/api/proveedores/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          nombre: nombre.trim(),
          empresa: empresaInteresado.trim() || undefined,
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          mensaje: mensaje.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No pudimos registrar tu consulta.')
        setEstado('error')
        return
      }
      trackEvent('proveedor_contacto', { proveedor_slug: slug })
      setEstado('listo')
    } catch {
      setError('No pudimos registrar tu consulta.')
      setEstado('error')
    }
  }

  if (estado === 'listo') {
    return (
      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-6">
        <h2 className="font-semibold text-emerald-200">Listo</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Le pasamos tus datos a <strong className="text-slate-100">{empresa}</strong>. Te
          van a contactar directo: nosotros no intervenimos en la conversación ni cobramos
          nada por esto.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} id="contactar" className="rounded-lg border border-sky-900/60 bg-slate-950/80 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Quiero que me contacten</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
        Dejanos tus datos y se los pasamos a <strong className="text-slate-200">{empresa}</strong>{' '}
        para que te contacte. Es gratis y no cobramos comisión.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pv-nombre" className="block text-xs font-medium text-slate-400">
            Tu nombre
          </label>
          <input
            id="pv-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-600 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="pv-empresa" className="block text-xs font-medium text-slate-400">
            Tu empresa <span className="text-slate-600">(opcional)</span>
          </label>
          <input
            id="pv-empresa"
            value={empresaInteresado}
            onChange={(e) => setEmpresaInteresado(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="pv-tel" className="block text-xs font-medium text-slate-400">
            Teléfono
          </label>
          <input
            id="pv-tel"
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="pv-email" className="block text-xs font-medium text-slate-400">
            Email
          </label>
          <input
            id="pv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-600 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="pv-msg" className="block text-xs font-medium text-slate-400">
            Qué necesitás <span className="text-slate-600">(opcional)</span>
          </label>
          <textarea
            id="pv-msg"
            rows={3}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Cantidad, tipo de etiqueta, plazo…"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Con el teléfono o el email alcanza, no hacen falta los dos.
      </p>

      {estado === 'error' && (
        <p role="alert" className="mt-3 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={estado === 'enviando' || !nombre.trim()}
        className="mt-5 w-full rounded bg-sky-600 px-4 py-3 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Que me contacten'}
      </button>
    </form>
  )
}
