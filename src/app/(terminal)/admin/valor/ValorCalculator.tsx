'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import marketPrices from '@/lib/data/market-prices.json'

/**
 * ValorCalculator — juego/calculadora de valor del modelo comisionista (venta de
 * hacienda: originás el lead, lo conectás con un colega, cobrás 1%). PRIVADO: solo
 * en /admin. Palancas en vivo + escenarios + meta, para jugar con "cuánto puedo hacer".
 * Grounded en precios reales de market-prices.json.
 */

const CATS: Array<{ key: string; label: string; peso: number }> = [
  { key: 'novillos', label: 'Novillos', peso: 430 },
  { key: 'novillitos', label: 'Novillitos', peso: 350 },
  { key: 'vaquillonas', label: 'Vaquillonas', peso: 330 },
  { key: 'vacas', label: 'Vacas', peso: 420 },
  { key: 'toros', label: 'Toros', peso: 650 },
  { key: 'terneros', label: 'Terneros', peso: 190 },
]

const cats = (marketPrices as { categories?: Record<string, { current?: number }> }).categories || {}
const BLUE = (marketPrices as { usdBlue?: { current?: number } }).usdBlue?.current || 1555

const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const usd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')

/** Count-up animado (easeOutCubic). */
function useCountUp(target: number, ms = 600): number {
  const [val, setVal] = useState(target)
  const from = useRef(target)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const a = from.current, b = target
    if (a === b) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = b; setVal(b); return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = 1 - Math.pow(1 - t, 3)
      setVal(a + (b - a) * e)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else { from.current = b; setVal(b) }
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, ms])
  return val
}

interface Escenario { nombre: string; ops: number; cierre: number; cab: number }
const ESCENARIOS: Escenario[] = [
  { nombre: 'Conservador', ops: 2, cierre: 20, cab: 80 },
  { nombre: 'Realista', ops: 5, cierre: 30, cab: 120 },
  { nombre: 'Optimista', ops: 12, cierre: 40, cab: 200 },
]

function Slider({ label, value, set, min, max, step = 1, suffix }: {
  label: string; value: number; set: (n: number) => void; min: number; max: number; step?: number; suffix?: string
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xxs font-terminal text-zinc-500">{label}</span>
        <span className="font-terminal text-lg tabular-nums text-accent">{value.toLocaleString('es-AR')}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-accent cursor-pointer"
      />
    </label>
  )
}

export default function ValorCalculator() {
  const [catKey, setCatKey] = useState('novillos')
  const [ops, setOps] = useState(5)          // operaciones captadas / mes
  const [cierre, setCierre] = useState(30)   // % que cierra
  const [cab, setCab] = useState(120)        // cabezas por operación
  const [comision, setComision] = useState(1.0) // % de comisión
  const [metaUsd, setMetaUsd] = useState(50000)  // meta anual en USD

  const cat = CATS.find((c) => c.key === catKey)!
  const precio = cats[catKey]?.current || 4500

  const calc = useMemo(() => {
    const valorOp = cab * cat.peso * precio
    const comisionOp = valorOp * (comision / 100)
    const opsCerradas = ops * (cierre / 100)
    const comisionMes = comisionOp * opsCerradas
    const comisionAnual = comisionMes * 12
    return { valorOp, comisionOp, opsCerradas, comisionMes, comisionAnual }
  }, [cab, cat.peso, precio, comision, ops, cierre])

  const anualUsd = calc.comisionAnual / BLUE
  const heroAnim = useCountUp(calc.comisionAnual)
  const pctMeta = Math.min(100, (anualUsd / metaUsd) * 100)
  const metaOk = anualUsd >= metaUsd

  return (
    <>
      {/* HERO */}
      <section className="terminal-panel px-panel py-4">
        <p className="text-xxs font-terminal text-zinc-500">Comisión anual proyectada</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-terminal text-4xl tabular-nums text-accent sm:text-5xl">{ars(heroAnim)}</span>
          <span className="font-terminal text-xl tabular-nums text-zinc-400">≈ {usd(anualUsd)}</span>
        </div>
        <p className="mt-1 text-xxs font-terminal text-zinc-500">{ars(calc.comisionMes)}/mes · {calc.opsCerradas.toFixed(1)} operaciones cerradas/mes</p>

        {/* Meta / progreso */}
        <div className="mt-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xxs font-terminal">
            <label className="text-zinc-500">Meta anual:
              <input
                type="number" value={metaUsd} onChange={(e) => setMetaUsd(Math.max(1000, Number(e.target.value) || 0))}
                className="terminal-input ml-1.5 inline-block w-28 py-0.5 text-data tabular-nums"
              /> USD
            </label>
            <span className={metaOk ? 'text-positive' : 'text-zinc-400'}>{pctMeta.toFixed(0)}%{metaOk ? ' · ¡meta!' : ''}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full rounded-full transition-all duration-500 ${metaOk ? 'bg-positive' : 'bg-accent'}`} style={{ width: `${pctMeta}%` }} />
          </div>
        </div>
      </section>

      {/* ESCENARIOS */}
      <div className="terminal-panel px-panel py-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xxs font-terminal text-zinc-500">Escenario:</span>
        {ESCENARIOS.map((e) => {
          const activo = ops === e.ops && cierre === e.cierre && cab === e.cab
          return (
            <button
              key={e.nombre}
              type="button"
              aria-pressed={activo}
              onClick={() => { setOps(e.ops); setCierre(e.cierre); setCab(e.cab) }}
              className={activo ? 'terminal-btn-primary bg-accent/10' : 'terminal-btn'}
            >
              {e.nombre}
            </button>
          )
        })}
      </div>

      {/* PALANCAS */}
      <section className="terminal-panel px-panel py-4 grid gap-5 sm:grid-cols-2">
        <Slider label="Operaciones captadas / mes" value={ops} set={setOps} min={1} max={40} />
        <Slider label="Tasa de cierre" value={cierre} set={setCierre} min={5} max={60} suffix="%" />
        <Slider label="Cabezas por operación" value={cab} set={setCab} min={20} max={500} step={5} />
        <Slider label="Comisión" value={comision} set={setComision} min={0.5} max={3} step={0.25} suffix="%" />
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xxs font-terminal text-zinc-500">Categoría (precio en vivo)</span>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={catKey === c.key}
                onClick={() => setCatKey(c.key)}
                className={catKey === c.key ? 'terminal-btn-primary bg-accent/10' : 'terminal-btn'}
              >
                {c.label} <span className="ml-1 text-zinc-500 tabular-nums">{ars(cats[c.key]?.current || 0)}/kg</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* DESGLOSE */}
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: 'Valor por operación', v: ars(calc.valorOp), s: `${cab} cab × ${cat.peso} kg × ${ars(precio)}` },
          { l: 'Comisión por cierre', v: ars(calc.comisionOp), s: `${comision}% del valor`, hot: true },
          { l: 'Cierres / mes', v: calc.opsCerradas.toFixed(1), s: `${ops} captadas × ${cierre}%` },
          { l: 'Comisión / mes', v: ars(calc.comisionMes), s: `≈ ${usd(calc.comisionMes / BLUE)}`, hot: true },
        ].map((c) => (
          <div key={c.l} className="terminal-panel px-panel py-3">
            <p className="text-xxs font-terminal text-zinc-500">{c.l}</p>
            <p className={`mt-1 font-terminal text-xl tabular-nums ${c.hot ? 'text-positive' : 'text-ink'}`}>{c.v}</p>
            <p className="mt-1 text-xxs font-terminal text-zinc-500">{c.s}</p>
          </div>
        ))}
      </div>

      <p className="terminal-panel px-panel py-2 text-xxs font-terminal text-zinc-500">
        Precios reales INMAG ({ars(precio)}/kg {cat.label.toLowerCase()}) · blue {ars(BLUE)}. Proyección para jugar con el modelo — no es compromiso ni forecast. Con 1 sola operación cerrada por mes ya estás facturando.
      </p>
    </>
  )
}
