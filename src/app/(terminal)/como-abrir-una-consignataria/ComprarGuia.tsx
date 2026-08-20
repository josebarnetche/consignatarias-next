'use client'

import { useState } from 'react'
import { trackGuiaCheckoutStart } from '@/lib/analytics'

interface Props {
  slug: string
  priceLabel: string
  /** Precio numérico — el valor de conversión que viaja a GA4. */
  priceArs: number
}

/**
 * Compra email-first: el mail es la llave del entitlement, así que se pide acá
 * y no después. Si ese mail ya compró la guía, la API responde `alreadyOwned`
 * y en vez de cobrar de nuevo lo mandamos a bajarla.
 *
 * Los datos de factura A son opcionales y van plegados: el que compra a título
 * personal no los ve; el que necesita computar el gasto los abre y los carga en
 * el mismo paso, sin tener que escribir después pidiéndola.
 */
export function ComprarGuia({ slug, priceLabel, priceArs }: Props) {
  const [email, setEmail] = useState('')
  const [quiereFactura, setQuiereFactura] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function comprar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/guias-premium/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email: email.trim(),
          ...(quiereFactura
            ? { razonSocial: razonSocial.trim(), cuit: cuit.trim() }
            : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No pudimos abrir el checkout. Probá de nuevo.')
        setLoading(false)
        return
      }
      if (json.alreadyOwned) {
        window.location.href = '/cuenta/guias'
        return
      }
      // Se dispara con el link ya creado, no en el submit: así el evento cuenta
      // intenciones que de verdad llegan a Rebill y no errores de la API.
      let source: string | null = null
      try {
        source = sessionStorage.getItem(`guia_source:${slug}`)
      } catch {
        /* ignore */
      }
      trackGuiaCheckoutStart(slug, priceArs, {
        source: source || 'direct',
        conFactura: quiereFactura,
      })
      window.location.href = json.checkoutUrl
    } catch {
      setError('No pudimos abrir el checkout. Probá de nuevo.')
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent'

  return (
    <form onSubmit={comprar} className="space-y-3">
      <label htmlFor="guia-email" className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500">
        Tu email
      </label>
      <input
        id="guia-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nombre@tuempresa.com.ar"
        className={inputClass}
      />

      <label className="flex items-start gap-2 text-xs text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={quiereFactura}
          onChange={(e) => setQuiereFactura(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <span>
          Necesito <strong className="text-zinc-200">factura A</strong> — la emite Memola Medios SAS
        </span>
      </label>

      {quiereFactura && (
        <div className="space-y-2 border-l-2 border-terminal-border pl-3">
          <input
            type="text"
            required
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Razón social"
            className={inputClass}
          />
          <input
            type="text"
            required
            inputMode="numeric"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="CUIT"
            className={inputClass}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-zinc-950 font-semibold text-sm rounded px-4 py-3 hover:brightness-110 disabled:opacity-60"
      >
        {loading ? 'Abriendo el checkout…' : `Comprar la guía — ${priceLabel}`}
      </button>
      {error && <p className="text-negative text-xs">{error}</p>}
      <p className="text-zinc-500 text-xxs leading-relaxed">
        Pago con tarjeta por Rebill. Te llega el PDF al mail y te queda para
        siempre en tu cuenta. Cada copia va marcada con tu email.
      </p>
    </form>
  )
}
