'use client'

import { useState } from 'react'
import { PRO_ABIERTO } from '@/lib/plan-pro'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * Alta a PRO abierto.
 *
 * Reusa el circuito de suscripción a productos que ya está probado
 * (`/api/informes/suscribir` → Rebill → webhook → `producto_subscriptions`), así que la
 * baja autogestionada y el período de gracia funcionan igual que en el resto del catálogo.
 */
export function SuscribirPro() {
  const [email, setEmail] = useState('')
  const [quiereFactura, setQuiereFactura] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'error'>('idle')
  const [error, setError] = useState('')

  async function suscribir(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    setError('')
    try {
      const res = await fetch('/api/informes/suscribir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: PRO_ABIERTO.slug,
          email: email.trim(),
          ...(quiereFactura ? { razonSocial: razonSocial.trim(), cuit: cuit.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No pudimos abrir el pago. Probá de nuevo en un minuto.')
        setEstado('error')
        return
      }
      if (json.alreadyOwned) {
        window.location.href = '/cuenta/informes'
        return
      }
      trackEvent('pro_checkout_start', { plan: PRO_ABIERTO.slug, value: PRO_ABIERTO.precio })
      emitValueBeacon('checkout_start', { meta: { plan: PRO_ABIERTO.slug } })
      window.location.href = json.checkoutUrl
    } catch {
      setError('No pudimos abrir el pago. Probá de nuevo en un minuto.')
      setEstado('error')
    }
  }

  return (
    <form onSubmit={suscribir} className="rounded-lg border border-sky-900/60 bg-slate-950/80 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Activar PRO</h2>
        <p className="text-2xl font-semibold text-sky-300">
          ARS {PRO_ABIERTO.precio.toLocaleString('es-AR')}
          <span className="text-base font-normal text-slate-500">/mes</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Se renueva solo. Lo cancelás cuando quieras desde tu cuenta, sin llamar a nadie.
      </p>

      <div className="mt-6">
        <label htmlFor="pro-email" className="block text-sm font-medium text-slate-300">
          Tu email
        </label>
        <input
          id="pro-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@campo.com.ar"
          className="mt-1.5 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Con este mail entrás a usar PRO. Revisalo antes de seguir.
        </p>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={quiereFactura}
            onChange={(e) => setQuiereFactura(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
          />
          Necesito factura A
        </label>
        {quiereFactura && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Razón social"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
            />
            <input
              type="text"
              required
              inputMode="numeric"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="CUIT (sin guiones)"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
            />
          </div>
        )}
      </div>

      {estado === 'error' && (
        <p role="alert" className="mt-4 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={estado === 'enviando' || !email.trim()}
        className="mt-6 w-full rounded bg-sky-600 px-4 py-3 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Abriendo el pago…' : 'Activar PRO'}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Te lleva a Rebill para pagar. Los datos de tu tarjeta no pasan por nuestro sitio.
      </p>
    </form>
  )
}
