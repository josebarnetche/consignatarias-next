'use client'

import { useState } from 'react'

/**
 * Alerta de precio del novillo con umbral seleccionable + toggle USD/ARS.
 * "Avisame cuando el kilo de novillo supere/baje de XX [USD | $]".
 * Postea a /api/alertas/precio (categoría 'inmag' = índice novillo) con currency.
 * El cron detecta el CRUCE y avisa una vez (el USD se compara contra INMAG÷blue).
 */
export default function NovilloAlertSignup({
  priceToday,
  blueToday,
}: {
  priceToday: number
  blueToday?: number
}) {
  const usdToday = blueToday && blueToday > 0 ? priceToday / blueToday : null
  const [currency, setCurrency] = useState<'ars' | 'usd'>('ars')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  // Default: ~5% por encima del precio de hoy en la moneda elegida.
  const [threshold, setThreshold] = useState<number>(Math.round(priceToday * 1.05))
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const curNow = currency === 'usd' ? usdToday : priceToday

  const switchCurrency = (c: 'ars' | 'usd') => {
    if (c === currency) return
    // Convertir el umbral a la nueva moneda para que el número siga siendo razonable.
    if (blueToday && blueToday > 0) {
      setThreshold((t) => (c === 'usd' ? Math.round((t / blueToday) * 10) / 10 : Math.round(t * blueToday)))
    } else if (curNow) {
      setThreshold(Math.round((c === 'usd' ? (usdToday ?? curNow) : priceToday) * 1.05))
    }
    setCurrency(c)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(threshold > 0)) {
      setState('error')
      setMsg('Revisá el email y el umbral.')
      return
    }
    setState('loading')
    try {
      const r = await fetch('/api/alertas/precio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category: 'inmag', threshold, direction, currency }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.success === false) {
        setState('error')
        setMsg(j.error || 'No se pudo crear la alerta.')
        return
      }
      setState('ok')
    } catch {
      setState('error')
      setMsg('Error de red.')
    }
  }

  const money = (n: number) => (currency === 'usd' ? `USD ${Math.round(n).toLocaleString('es-AR')}` : `$${Math.round(n).toLocaleString('es-AR')}`)

  if (state === 'ok') {
    return (
      <div className="terminal-panel">
        <div className="px-panel py-5 text-center">
          <div className="text-accent text-lg font-medium mb-1">✓ Alerta creada</div>
          <p className="text-zinc-400 text-sm">
            Te avisamos por email cuando el kilo de novillo {direction === 'above' ? 'supere' : 'baje de'}{' '}
            <span className="text-zinc-200">{money(threshold)}/kg</span>. Una sola vez, sin spam.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header text-zinc-300 text-label tracking-widest">ALERTA DE PRECIO</div>
      <form onSubmit={submit} className="px-panel py-4 space-y-3">
        <p className="text-zinc-300 text-sm leading-relaxed flex items-center gap-2 flex-wrap">
          Avisame cuando el kilo de novillo
          {/* supere / baje de */}
          <span className="inline-flex rounded-md border border-zinc-700 overflow-hidden">
            {(['above', 'below'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-2.5 py-1 text-xs font-mono transition-colors ${direction === d ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {d === 'above' ? 'supere' : 'baje de'}
              </button>
            ))}
          </span>
        </p>

        {/* umbral + toggle moneda */}
        <div className="flex items-stretch gap-2">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex-1 focus-within:border-sky-500/60">
            <span className="text-zinc-500 text-sm">{currency === 'usd' ? 'USD' : '$'}</span>
            <input
              type="number"
              min={0}
              step={currency === 'usd' ? 0.1 : 10}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-transparent text-white font-mono text-lg outline-none"
              aria-label="Umbral de precio"
            />
            <span className="text-zinc-500 text-sm whitespace-nowrap">/kg</span>
          </div>
          {/* toggle USD / ARS */}
          <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden shrink-0">
            {(['ars', 'usd'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => switchCurrency(c)}
                className={`px-3 text-sm font-mono transition-colors ${currency === c ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {c === 'ars' ? '$ ARS' : 'USD'}
              </button>
            ))}
          </div>
        </div>

        {curNow != null && (
          <p className="text-xxs text-zinc-500 font-mono">
            Hoy el novillo está en {money(curNow)}/kg{currency === 'usd' ? ' (al blue)' : ''}.
          </p>
        )}

        <div className="flex gap-2">
          <input
            type="email"
            inputMode="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (state === 'error') setState('idle')
            }}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-sky-500/60"
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="bg-accent hover:bg-sky-300 text-zinc-950 font-medium px-4 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
          >
            {state === 'loading' ? '…' : 'Avisame'}
          </button>
        </div>
        {state === 'error' && <p className="text-red-400 text-xxs">{msg}</p>}
        <p className="text-xxs text-zinc-600">Un email cuando cruza el umbral. Sin spam. Dato de referencia, no asesoramiento.</p>
      </form>
    </div>
  )
}
