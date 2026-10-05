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
/** El salto de los botones: redondo contra el precio de la hacienda, no 1 peso. */
const PASO = 50

export default function OfertaLote({
  sku,
  categoria,
  provincia,
  cabezas,
  referencia,
}: {
  sku: string
  categoria: string | null
  provincia: string | null
  cabezas: number | null
  /** La referencia del lote: arranca ahí para que + y − sean "pago más/menos que el mercado". */
  referencia?: number | null
}) {
  const [abierto, setAbierto] = useState(false)
  const [precio, setPrecio] = useState(referencia ? String(Math.round(referencia)) : '')
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

  const mover = (signo: 1 | -1) => {
    const base = Number(precio) || referencia || 0
    const siguiente = Math.max(PASO, Math.round((base + signo * PASO) / PASO) * PASO)
    setPrecio(String(siguiente))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex flex-1 items-stretch rounded-lg border border-terminal-border bg-black/30 focus-within:border-sky-500/60">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label={`Bajar ${PASO} pesos`}
            className="px-2.5 text-sm text-zinc-400 hover:text-ink transition-colors"
          >
            −
          </button>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">$</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step={PASO}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Tu precio por kg"
              aria-label="Tu precio por kilo"
              className="w-full bg-transparent pl-4 pr-1 py-2 text-xs text-ink placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label={`Subir ${PASO} pesos`}
            className="px-2.5 text-sm text-zinc-400 hover:text-ink transition-colors"
          >
            +
          </button>
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
      <p className="text-xxs text-zinc-500">Nos comunicaremos y te hablamos.</p>
      {error && <p className="text-xxs text-negative">{error}</p>}
    </form>
  )
}
