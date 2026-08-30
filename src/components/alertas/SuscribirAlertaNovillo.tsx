'use client'

import { useState } from 'react'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * Alta a la alerta del novillo en dólares.
 *
 * NO pide umbral. Ése es el producto entero: el sitio ya tiene alertas configurables y
 * **nadie las usó** (0 de 48 usuarios). Acá el umbral lo fijamos nosotros, lo publicamos,
 * y le decimos de antemano cuántas veces al año va a sonar — así el productor no tiene que
 * decidir si 12 % es mucho o poco antes de anotarse.
 *
 * Decir la frecuencia esperada arriba del botón es deliberado: es lo que separa "me anoto"
 * de "no quiero otro mail más".
 */
export function SuscribirAlertaNovillo({ source = 'sitio' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo' | 'error'>('idle')
  const [error, setError] = useState('')

  async function anotar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    setError('')
    try {
      const res = await fetch('/api/alertas/novillo-usd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No pudimos anotarte.')
        setEstado('error')
        return
      }
      trackEvent('alerta_novillo_subscribe', { source })
      emitValueBeacon('alerta_novillo_subscribe', { meta: { source } })
      setEstado('listo')
    } catch {
      setError('No pudimos anotarte.')
      setEstado('error')
    }
  }

  if (estado === 'listo') {
    return (
      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-5">
        <h3 className="font-semibold text-emerald-200">Anotado</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Te avisamos a <strong className="text-slate-100">{email}</strong> cuando el
          novillo en dólares se mueva de verdad. Si no pasa nada, no te escribimos.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={anotar} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
      <h3 className="font-semibold text-slate-100">Avisame cuando se mueva de verdad</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Te escribimos sólo cuando el novillo medido en dólares se aparta más de{' '}
        <strong className="text-slate-200">12 %</strong> de su promedio del mes anterior.
        Sobre once años de serie eso pasó{' '}
        <strong className="text-slate-200">unas cuatro veces por año</strong>.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="nombre@campo.com.ar"
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={estado === 'enviando' || !email.trim()}
          className="rounded bg-sky-600 px-5 py-2.5 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Anotando…' : 'Avisame'}
        </button>
      </div>

      {estado === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        No hay nada que configurar y no llega otra en 30 días. Te podés dar de baja cuando
        quieras.
      </p>
    </form>
  )
}
