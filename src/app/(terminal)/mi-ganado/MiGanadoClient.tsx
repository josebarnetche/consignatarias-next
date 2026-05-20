'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useGanado, type GanadoItem } from '@/hooks/useGanado'
import { PriceSparkline } from '@/components/PriceSparkline'

interface InmagSeed {
  current: number
  prev: number
  change: number
  series?: { date: string; value: number }[]
}

interface MarketPrices {
  inmag: InmagSeed
  categories: Record<string, { current: number; prev: number; change: number }>
  usdBlue: { current: number; prev: number; change: number }
}

const CATEGORIAS = [
  { value: 'novillos', label: 'Novillos', defaultPeso: 450 },
  { value: 'novillitos', label: 'Novillitos', defaultPeso: 350 },
  { value: 'vaquillonas', label: 'Vaquillonas', defaultPeso: 320 },
  { value: 'vacas', label: 'Vacas', defaultPeso: 400 },
  { value: 'toros', label: 'Toros', defaultPeso: 550 },
  { value: 'terneros', label: 'Terneros', defaultPeso: 180 },
]

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}
function fmtCurrency(n: number): string {
  return '$' + fmt(n)
}
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function valueOf(items: GanadoItem[], prices: MarketPrices) {
  let cabezas = 0, kilos = 0, ars = 0
  for (const it of items) {
    const precio = prices.categories[it.categoria]?.current ?? prices.inmag.current
    const k = (it.cabezas || 0) * (it.peso || 0)
    cabezas += it.cabezas || 0
    kilos += k
    ars += k * precio
  }
  return { cabezas, kilos, ars, usd: ars / prices.usdBlue.current }
}

/** Animate a number from 0 → target with easeOutCubic, once per target change. */
function useCountUp(target: number, durationMs = 900): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
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
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
        setVal(to)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, durationMs])
  return val
}

export default function MiGanadoClient({ prices, lastUpdate }: { prices: MarketPrices; lastUpdate: string }) {
  const {
    items, lastSeenValue, lastSeenAt, alertsOptIn, history,
    isLoading, isLoggedIn, hasRow,
    saveGanado, markSeen, snapshotValue, setAlerts,
  } = useGanado()

  const [draft, setDraft] = useState<GanadoItem[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const stampedRef = useRef(false)

  // Hydrate the editable draft from the saved herd once it loads.
  useEffect(() => {
    if (!isLoading) setDraft(items)
  }, [isLoading, items])

  const totals = useMemo(() => valueOf(draft, prices), [draft, prices])
  const animatedArs = useCountUp(totals.ars)

  // Δ since last visit — computed against the SAVED value (not the draft), and
  // only meaningful when nothing is being edited.
  const savedTotals = useMemo(() => valueOf(items, prices), [items, prices])
  const delta = lastSeenValue != null && !dirty ? savedTotals.ars - lastSeenValue : null
  const deltaPct = delta != null && lastSeenValue ? (delta / lastSeenValue) * 100 : null

  // 30-day shape of what the herd would have been worth, tracking the INMAG.
  // Honest illustration: today's herd composition valued at each day's index.
  const herdSeries = useMemo(() => {
    const series = prices.inmag.series ?? []
    const cur = prices.inmag.current
    const last = series.slice(-30)
    if (!last.length || !cur || totals.ars <= 0) return []
    return last.map(p => ({ date: p.date, value: totals.ars * (p.value / cur) }))
  }, [prices.inmag.series, prices.inmag.current, totals.ars])

  // Real evolution of THIS producer's herd value, from saved snapshots.
  const realSeries = useMemo(
    () => history.map(s => ({ date: s.snapshot_date, value: s.value_ars })),
    [history],
  )

  // Stamp the value the producer is seeing now, once per mount, so the next
  // visit can show "Δ desde tu última visita" — and write today's snapshot so
  // the evolution chart grows.
  useEffect(() => {
    if (!isLoading && isLoggedIn && hasRow && items.length > 0 && !stampedRef.current) {
      stampedRef.current = true
      const v = valueOf(items, prices)
      markSeen(v.ars)
      snapshotValue(v.ars, v.cabezas, v.kilos, prices.inmag.current)
    }
  }, [isLoading, isLoggedIn, hasRow, items, prices, markSeen, snapshotValue])

  function addItem() {
    setDraft([...draft, { categoria: 'novillos', cabezas: 50, peso: 450 }])
    setDirty(true); setSaved(false)
  }
  function removeItem(idx: number) {
    setDraft(draft.filter((_, i) => i !== idx))
    setDirty(true); setSaved(false)
  }
  function updateItem(idx: number, field: keyof GanadoItem, value: string | number) {
    setDraft(draft.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [field]: value }
      if (field === 'categoria') {
        const cat = CATEGORIAS.find(c => c.value === value)
        if (cat) next.peso = cat.defaultPeso
      }
      return next
    }))
    setDirty(true); setSaved(false)
  }
  async function handleSave() {
    setSaving(true)
    const { error } = await saveGanado(draft)
    setSaving(false)
    if (!error) {
      setDirty(false); setSaved(true)
      stampedRef.current = true
      const v = valueOf(draft, prices)
      markSeen(v.ars) // reset the baseline to what was just saved
      snapshotValue(v.ars, v.cabezas, v.kilos, prices.inmag.current)
      setTimeout(() => setSaved(false), 4000)
    }
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-40 bg-terminal-panel/50 rounded animate-pulse" />
      </div>
    )
  }

  /* ---- Logged out: invite to sign in ---- */
  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">Mi Ganado</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Cargá tu hacienda una vez y mirá cuánto vale <strong className="text-zinc-200">hoy al INMAG</strong>,
          actualizado cada día hábil. Volvé cuando quieras: tu rodeo queda guardado y el valor se
          mueve solo con el mercado.
        </p>
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">¿Qué vas a ver?</div>
          <ul className="px-panel py-4 space-y-2 text-sm text-zinc-400">
            <li>· El valor total de tu hacienda en pesos y dólares, al precio del día.</li>
            <li>· Cuánto cambió <strong className="text-zinc-200">desde tu última visita</strong>.</li>
            <li>· La evolución de tu rodeo y un aviso cada lunes con cuánto vale.</li>
          </ul>
        </div>
        <Link
          href="/login"
          className="inline-block py-3 px-6 bg-accent hover:bg-accent-bright text-terminal-bg text-sm font-medium rounded transition-colors"
        >
          Ingresá para guardar tu ganado →
        </Link>
        <p className="text-xxs text-zinc-500 mt-4">
          Gratis. Solo necesitás tu email. ¿Querés una estimación rápida sin cuenta?{' '}
          <Link href="/calculadora" className="text-accent hover:text-accent-bright">Usá la calculadora</Link>.
        </p>
      </div>
    )
  }

  const isUp = (prices.inmag.change ?? 0) >= 0
  const empty = draft.length === 0

  /* ---- Logged in, empty & never loaded: the welcome / first-run flow ---- */
  if (empty && !hasRow) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-terminal text-zinc-100 mb-2">Bienvenido a Mi Ganado</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-md mx-auto">
          Cargá tu hacienda y mirá lo que vale <strong className="text-zinc-200">hoy</strong>, en
          tiempo real, al precio del INMAG. Tres datos por categoría y listo.
        </p>
        <div className="terminal-panel mb-8 text-left">
          <div className="terminal-panel-header text-accent">Empezá por una categoría</div>
          <div className="px-panel py-5 grid grid-cols-3 gap-3">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setDraft([{ categoria: cat.value, cabezas: 50, peso: cat.defaultPeso }]); setDirty(true) }}
                className="py-3 px-2 bg-zinc-900 border border-zinc-700 hover:border-accent rounded text-sm text-zinc-200 hover:text-accent transition-colors"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xxs text-zinc-500">
          Apretá una categoría y vas a ver el número al instante. Después la ajustás.
        </p>
      </div>
    )
  }

  /* ---- Logged in: dashboard ---- */
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-terminal text-zinc-100 mb-1">Mi Ganado</h1>
          <p className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
            Valuado al INMAG ${fmt(prices.inmag.current)}/kg · act. {fmtDate(lastUpdate)}
          </p>
        </div>
        <span className={`text-xxs font-terminal px-2 py-1 rounded inline-flex items-center gap-1.5 ${isUp ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isUp ? 'bg-positive' : 'bg-negative'} animate-pulse`} />
          INMAG {isUp ? '+' : ''}{(prices.inmag.change ?? 0).toFixed(1)}% hoy
        </span>
      </div>

      {/* Hero valuation — the aha moment */}
      {!empty && (
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header text-accent">Valor de tu hacienda hoy</div>
          <div className="px-panel py-6">
            <div className="text-4xl text-positive font-mono font-medium mb-1 tabular-nums">
              {fmtCurrency(animatedArs)}
            </div>
            <div className="text-lg text-zinc-400 font-mono mb-4">
              ≈ USD {fmt(animatedArs / prices.usdBlue.current)} <span className="text-xxs text-zinc-500">(blue ${fmt(prices.usdBlue.current)})</span>
            </div>

            {delta != null && (
              <div className={`inline-flex items-center gap-2 text-sm font-mono px-3 py-1.5 rounded ${delta >= 0 ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
                <span>{delta >= 0 ? '↑' : '↓'}</span>
                <span>{delta >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(delta))}</span>
                {deltaPct != null && <span className="opacity-80">({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%)</span>}
                <span className="text-zinc-500 text-xxs">desde tu última visita{lastSeenAt ? ` · ${fmtDate(lastSeenAt)}` : ''}</span>
              </div>
            )}

            {/* 30-day shape, tracking the index */}
            {herdSeries.length > 1 && (
              <div className="mt-6">
                <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                  Tu hacienda los últimos 30 días (al índice)
                </div>
                <PriceSparkline data={herdSeries} height={90} lineColor="#4ade80" areaColor="rgba(74,222,128,0.12)" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-terminal-border">
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Total cabezas</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(totals.cabezas)}</div>
              </div>
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Total kilos</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(totals.kilos)} kg</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editable herd */}
      <div className="terminal-panel mb-6">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Tu hacienda</span>
          <span className="text-xxs text-zinc-500">categoría · cabezas · peso</span>
        </div>

        {empty ? (
          <div className="px-panel py-8 text-center">
            <p className="text-zinc-400 text-sm mb-4">Todavía no cargaste tu hacienda.</p>
            <button onClick={addItem} className="text-sm text-accent hover:text-accent-bright">+ Agregar tu primera categoría</button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-terminal-border">
              {draft.map((item, index) => (
                <div key={index} className="px-panel py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xxs text-zinc-500 font-terminal">#{index + 1}</span>
                    <button onClick={() => removeItem(index)} className="text-xxs text-red-400 hover:text-red-300 ml-auto">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Categoría</label>
                      <select
                        value={item.categoria}
                        onChange={(e) => updateItem(index, 'categoria', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                      >
                        {CATEGORIAS.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Cabezas</label>
                      <input
                        type="number" min="1" value={item.cabezas}
                        onChange={(e) => updateItem(index, 'cabezas', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Peso prom. (kg)</label>
                      <input
                        type="number" min="50" max="1000" value={item.peso}
                        onChange={(e) => updateItem(index, 'peso', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-panel py-3 border-t border-terminal-border">
              <button onClick={addItem} className="text-sm text-accent hover:text-accent-bright transition-colors">+ Agregar categoría</button>
            </div>
          </>
        )}
      </div>

      {/* Save */}
      {!empty && (
        <button
          onClick={handleSave}
          disabled={saving || (!dirty && hasRow)}
          className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : dirty || !hasRow ? 'Guardar mi ganado' : 'Guardado'}
        </button>
      )}

      {/* Registro de valor — evolution + weekly alert opt-in */}
      {hasRow && !empty && (
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Registro de valor</div>
          <div className="px-panel py-5">
            {realSeries.length > 1 ? (
              <>
                <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                  La evolución de tu hacienda
                </div>
                <PriceSparkline data={realSeries} height={90} />
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Tu primer registro quedó guardado hoy. Cada vez que vuelvas, sumamos un punto y
                vas a ver crecer la curva de tu hacienda.
              </p>
            )}

            <label className="flex items-center gap-3 mt-5 pt-5 border-t border-terminal-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alertsOptIn}
                onChange={(e) => setAlerts(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-zinc-300">
                Avisame cada lunes cuánto vale mi hacienda
                <span className="block text-xxs text-zinc-500">Un mail con el valor y cuánto cambió en la semana. Cancelás cuando quieras.</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Consignar — entry to the directory (permiso flow llega en la próxima fase) */}
      <div className="terminal-panel mt-6">
        <div className="px-panel py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-400">¿Pensás vender? Encontrá consignatarias en tu zona.</p>
          <Link href="/consignatarias" className="text-sm text-accent hover:text-accent-bright transition-colors whitespace-nowrap">Ver directorio →</Link>
        </div>
      </div>

      <p className="text-xxs text-zinc-500 mt-6">
        * Valores referenciales al precio INMAG por categoría. El precio final depende de calidad,
        ubicación, condiciones de pago y negociación. Tu hacienda queda guardada en tu cuenta.
      </p>
    </div>
  )
}
