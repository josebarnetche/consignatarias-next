'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DecimalNumberInput from '@/components/ui/DecimalNumberInput'
import { trackValueEvent } from '@/lib/analytics'

function fmt(n: number): string {
  return Math.round(n || 0).toLocaleString('es-AR')
}

/** Count-up animado (easeOutCubic) para el canon. */
function useCountUp(target: number, durationMs = 650): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    const from = fromRef.current
    const to = target
    if (from === to) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else { fromRef.current = to; setVal(to) }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, durationMs])
  return val
}

const STORAGE_KEY = 'arrendamiento-calc-v1'

function Field({ label, value, onChange, suffix, min = 0 }: {
  label: string; value: number; onChange: (n: number) => void; suffix?: string; min?: number
}) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-500 mb-1">{label}</span>
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-sky-500/60">
        <DecimalNumberInput
          value={value}
          onChange={onChange}
          min={min}
          ariaLabel={label}
          className="w-full bg-transparent text-white font-mono text-lg outline-none"
        />
        {suffix && <span className="text-zinc-500 text-sm whitespace-nowrap">{suffix}</span>}
      </div>
    </label>
  )
}

export default function ArrendamientoCalculator({ priceToday }: { priceToday: number }) {
  const [precio, setPrecio] = useState(priceToday)
  const [kgHa, setKgHa] = useState(4)
  const [hectareas, setHectareas] = useState(100)
  const [anios, setAnios] = useState(3)
  const [sellos, setSellos] = useState(1.0)
  const [saved, setSaved] = useState(false)
  // Suscripción al cierre mensual por email (consolidada acá: la calculadora ES el signup).
  const [email, setEmail] = useState('')
  const [subState, setSubState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  // Señal first-party: una vez, al primer cambio real de un input (no en el mount).
  const usedRef = useRef(false)
  const markUsed = () => {
    if (usedRef.current) return
    usedRef.current = true
    trackValueEvent('tool_used', { meta: { tool: 'arrendamiento' } })
  }

  // Restaurar lo guardado (en este dispositivo). El precio siempre arranca hoy.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (s) {
        if (typeof s.kgHa === 'number') setKgHa(s.kgHa)
        if (typeof s.hectareas === 'number') setHectareas(s.hectareas)
        if (typeof s.anios === 'number') setAnios(s.anios)
        if (typeof s.sellos === 'number') setSellos(s.sellos)
      }
    } catch { /* ignore */ }
  }, [])

  const canonMensual = useMemo(() => kgHa * hectareas * precio, [kgHa, hectareas, precio])
  const canonAnual = canonMensual * 12
  const totalContrato = canonAnual * anios
  const sellosCosto = totalContrato * (sellos / 100)
  const animCanon = useCountUp(canonMensual)

  function guardar() {
    markUsed()
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ kgHa, hectareas, anios, sellos })) } catch { /* ignore */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function suscribir(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSubState('error'); return }
    markUsed()
    setSubState('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'arrendamiento-liquidacion', kgHa, hectareas }),
      })
      if (res.ok) {
        setSubState('ok')
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ kgHa, hectareas, anios, sellos })) } catch { /* ignore */ }
      } else setSubState('error')
    } catch {
      setSubState('error')
    }
  }

  const priceIsToday = Math.round(precio) === Math.round(priceToday)

  return (
    <div className="bg-zinc-900/60 rounded-xl p-5 border border-sky-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-accent">Calculá tu arrendamiento</h3>
        <span className="text-xxs text-zinc-600 font-mono">en kg de novillo</span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Field label="Kg novillo / ha / mes" value={kgHa} onChange={(n) => { markUsed(); setKgHa(n) }} suffix="kg" />
        <Field label="Superficie" value={hectareas} onChange={(n) => { markUsed(); setHectareas(n) }} suffix="ha" />
        <div className="col-span-2">
          <Field label="Índice novillo (hoy)" value={precio} onChange={setPrecio} suffix="$/kg" />
          {!priceIsToday && (
            <button onClick={() => setPrecio(priceToday)} className="text-xxs text-accent/80 hover:text-accent-bright mt-1">
              ← volver al valor de hoy (${fmt(priceToday)})
            </button>
          )}
        </div>
      </div>

      {/* Canon animado */}
      <div className="rounded-lg bg-sky-500/5 border border-sky-500/20 p-4 mb-4">
        <div className="text-xs text-zinc-500 mb-1">Canon mensual</div>
        <div className="text-3xl font-bold font-mono text-accent tabular-nums">${fmt(animCanon)}</div>
        <div className="text-sm text-zinc-500 font-mono mt-1">Anual ${fmt(canonAnual)}</div>
        <div className="text-xxs text-zinc-600 mt-2">{hectareas} ha × {kgHa} kg × ${fmt(precio)}/kg</div>
      </div>

      {/* Costos de firma del contrato */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Costos de firma del contrato</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Duración" value={anios} onChange={setAnios} suffix="años" min={1} />
          <Field label="Impuesto de sellos" value={sellos} onChange={setSellos} suffix="%" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Valor total del contrato ({anios} {anios === 1 ? 'año' : 'años'})</span>
            <span className="text-white font-mono">${fmt(totalContrato)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Sellos ({sellos}%)</span>
            <span className="text-accent font-mono font-medium">${fmt(sellosCosto)}</span>
          </div>
        </div>
        <p className="text-xxs text-zinc-600 mt-2">
          El impuesto de sellos varía por provincia (~1%–1,5%) y suele dividirse entre las partes. Ajustá la tasa a tu jurisdicción.
        </p>
      </div>

      {/* Guardar */}
      <button
        onClick={guardar}
        className="w-full mt-5 py-2.5 rounded-lg bg-accent hover:bg-sky-300 text-zinc-950 font-medium transition-colors"
      >
        {saved ? '✓ Guardado en este dispositivo' : 'Guardar mi cálculo'}
      </button>
      <p className="text-xxs text-zinc-600 text-center mt-2">Se guarda en tu navegador y se recalcula al precio del día cada vez que volvés.</p>

      {/* Suscripción al cierre mensual — la calculadora ES el signup (una sola caja) */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        {subState === 'ok' ? (
          <p className="text-accent text-sm text-center">
            ✓ Listo. A principio de cada mes te llega el cierre oficial del INMAG + tu canon (${fmt(canonMensual)}).
          </p>
        ) : (
          <form onSubmit={suscribir}>
            <p className="text-xs text-zinc-400 mb-2">
              📧 Recibí el cierre de cada mes por email, con <span className="text-zinc-200">tu canon ya calculado</span>.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (subState === 'error') setSubState('idle') }}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-sky-500/60"
              />
              <button
                type="submit"
                disabled={subState === 'loading'}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
              >
                {subState === 'loading' ? '…' : 'Recibir'}
              </button>
            </div>
            {subState === 'error' && <p className="text-red-400 text-xxs mt-1">Revisá el email.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
