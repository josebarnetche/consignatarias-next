'use client'

import { useState } from 'react'
import { trackAlertSubscribe } from '@/lib/analytics'

/**
 * Captura de "alerta de precio por umbral": avisame cuando el {categoría} cruce $X.
 * Una categoría por página (el contexto de la landing = la categoría) → mínima
 * fricción. Quick-picks de números redondos sobre el precio actual (la idea de "5000").
 * Postea a /api/alertas/precio. Email-only.
 */
export default function PriceThresholdAlertSignup({
  category,
  categoryLabel,
  currentPrice,
  page,
  accent = 'emerald',
}: {
  category: string
  categoryLabel: string
  currentPrice: number
  page: string
  accent?: 'amber' | 'emerald'
}) {
  // Quick-picks: próximos 3 múltiplos de 500 por encima del precio actual.
  const base = Math.ceil((currentPrice + 1) / 500) * 500
  const quickPicks = [base, base + 500, base + 1000]

  const [threshold, setThreshold] = useState<number>(quickPicks[1]) // el del medio (redondo)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const ring = accent === 'amber' ? 'focus-within:border-sky-500/50' : 'focus-within:border-sky-500/50'
  const btn = accent === 'amber' ? 'bg-accent hover:bg-sky-300' : 'bg-accent hover:bg-sky-300'
  const chipOn = accent === 'amber' ? 'bg-accent text-zinc-950 border-accent' : 'bg-accent text-zinc-950 border-accent'
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    try {
      const res = await fetch('/api/alertas/precio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category, threshold, direction: 'above' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setState('ok')
        trackAlertSubscribe({ source: 'alerta-precio', page })
      } else {
        setState('error')
        setMsg(data.error || 'No se pudo crear la alerta.')
      }
    } catch {
      setState('error')
      setMsg('Error de red. Probá de nuevo.')
    }
  }

  if (state === 'ok') {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center">
        <p className="text-emerald-400 font-semibold mb-1">✓ Alerta activada</p>
        <p className="text-zinc-400 text-sm">
          Te avisamos a <span className="text-white">{email}</span> cuando el {categoryLabel} cruce{' '}
          <span className="text-white font-mono">{fmt(threshold)}</span>. Revisá tu casilla para confirmar.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-1">
        ¿Seguís el {categoryLabel.toLowerCase()}? Te aviso cuando cruce un precio
      </h3>
      <p className="text-zinc-400 text-sm mb-4">
        Hoy está en <span className="text-white font-mono">{fmt(currentPrice)}/kg</span>. Elegí un umbral y te
        mandamos <strong className="text-zinc-300">un solo mail</strong> cuando lo cruce.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickPicks.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setThreshold(p)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                threshold === p ? chipOn : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {fmt(p)}
            </button>
          ))}
          <div className="flex items-center gap-1 px-2 rounded-lg border border-zinc-700 text-sm">
            <span className="text-zinc-500">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-24 bg-transparent py-1.5 text-white font-mono outline-none"
              aria-label="Umbral personalizado"
            />
          </div>
        </div>

        <div className={`flex gap-2 rounded-lg border border-zinc-700 bg-black/30 p-1 ${ring} transition-colors`}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-white outline-none placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className={`${btn} text-black font-semibold px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50`}
          >
            {state === 'loading' ? 'Anotando…' : 'Avisame'}
          </button>
        </div>
        {state === 'error' && <p className="text-red-400 text-xs">{msg}</p>}
        <p className="text-xs text-zinc-600">Sin spam. Un mail cuando cruce el umbral. Podés darte de baja cuando quieras.</p>
      </form>
    </div>
  )
}
