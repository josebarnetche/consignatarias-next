'use client'

import { useState } from 'react'

/**
 * Oferta por un lote concreto: precio + email, un botón.
 *
 * Es la captura más corta posible —dos campos— porque el que mira un lote ya
 * decidió que le interesa: pedirle categoría, provincia y cabezas de nuevo es
 * hacerle repetir lo que ya está en la tarjeta. Entra a `producer_leads` como
 * `lote:<sku>`, con intent `comprar`, así que el que lo trabaja sabe por qué
 * hacienda preguntan y a cuánto.
 */
export default function OfertaLote({
  sku,
  categoria,
  provincia,
  cabezas,
}: {
  sku: string
  categoria: string | null
  provincia: string | null
  cabezas: number | null
}) {
  const [abierto, setAbierto] = useState(false)
  const [precio, setPrecio] = useState('')
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'ok' | 'error'>('listo')
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    setError(null)
    try {
      const res = await fetch('/api/producer-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'comprar',
          source: `lote:${sku}`,
          category: categoria || undefined,
          province: provincia || undefined,
          headCount: cabezas || undefined,
          desiredPriceArs: precio ? Number(precio) : undefined,
          email,
          // El nombre es obligatorio en la API y acá no lo pedimos: dos campos es
          // todo lo que un comprador tolera. Se completa al contactarlo.
          name: 'Oferta por lote',
          message: `Oferta por el lote ${sku}${precio ? ` a $${precio}/kg` : ' (sin precio)'}`,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'No se pudo enviar')
      }
      setEstado('ok')
    } catch (err) {
      setEstado('error')
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    }
  }

  if (estado === 'ok') {
    return (
      <p className="text-xs text-positive border border-positive/40 bg-positive/5 rounded-lg px-3 py-2">
        Oferta registrada. Te escribimos a {email} para cerrar los detalles.
      </p>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-sky-300 transition-colors"
      >
        Ofrecer por este lote
      </button>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Tu precio por kg"
            aria-label="Tu precio por kilo"
            className="w-full rounded-lg border border-terminal-border bg-black/30 pl-5 pr-2 py-2 text-xs text-ink placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none"
          />
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu email"
          aria-label="Tu email"
          className="flex-1 rounded-lg border border-terminal-border bg-black/30 px-2 py-2 text-xs text-ink placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-sky-300 transition-colors disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Enviar oferta'}
      </button>
      {error && <p className="text-xxs text-negative">{error}</p>}
    </form>
  )
}
