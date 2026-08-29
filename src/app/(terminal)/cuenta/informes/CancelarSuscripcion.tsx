'use client'

import { useState } from 'react'

/**
 * Baja de una suscripción, desde la cuenta y sin hablar con nadie — que es lo que le
 * prometemos al suscribirse.
 *
 * Pide confirmación en dos pasos y en el primero dice lo que importa: **cancelar no le
 * saca el acceso**. El período ya está pagado y se honra hasta el final. Sin esa frase,
 * mucha gente no cancela por miedo a perder lo que pagó, y termina pidiendo la baja por
 * mail — que es peor para los dos.
 */
export function CancelarSuscripcion({
  slug,
  nombre,
  vigenteHasta,
}: {
  slug: string
  nombre: string
  vigenteHasta: string | null
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')

  const hasta = vigenteHasta
    ? new Date(vigenteHasta).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  async function cancelar() {
    setEstado('enviando')
    try {
      const res = await fetch('/api/informes/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMensaje(json?.error || 'No pudimos procesar la baja.')
        setEstado('error')
        return
      }
      setEstado('listo')
    } catch {
      setMensaje('No pudimos procesar la baja.')
      setEstado('error')
    }
  }

  if (estado === 'listo') {
    return (
      <p className="mt-3 text-sm text-slate-400">
        Suscripción dada de baja.{' '}
        {hasta ? `Lo seguís teniendo hasta el ${hasta}.` : 'Te avisamos por mail.'}
      </p>
    )
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-3 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
      >
        Cancelar la suscripción
      </button>
    )
  }

  return (
    <div className="mt-4 rounded border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-200">¿Cancelar {nombre}?</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        No perdés nada de lo que ya pagaste:{' '}
        {hasta ? (
          <>
            lo seguís recibiendo hasta el <strong className="text-slate-200">{hasta}</strong>
          </>
        ) : (
          'lo seguís recibiendo hasta que termine el período en curso'
        )}
        . Después deja de renovarse.
      </p>

      {estado === 'error' && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {mensaje}
        </p>
      )}

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={cancelar}
          disabled={estado === 'enviando'}
          className="rounded border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Dando de baja…' : 'Sí, cancelar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          No, dejarla
        </button>
      </div>
    </div>
  )
}
