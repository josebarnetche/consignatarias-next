'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useGanado, type GanadoItem } from '@/hooks/useGanado'
import { HistorialLote } from '@/components/ganado/HistorialLote'
import type { PuntoHistorial } from '@/lib/ganado-historial'
import { valuarRodeo, type LoteValuado } from '@/lib/rodeo-vr'
import { getReferenciaPorPeso, VR_METODOLOGIA } from '@/lib/vr'

interface Props {
  inmag: { current: number; change: number }
  usdBlue: { current: number }
  lastUpdate: string
}

/**
 * Las categorías que el productor puede cargar. Terneros queda: es la hacienda que más
 * tiene un criador. Pero el Mercado Agroganadero no opera terneros, así que NO tiene
 * Valor de Referencia y la página lo dice en vez de valuarlo con un ratio.
 */
const CATEGORIAS = [
  { value: 'novillos', label: 'Novillos', defaultPeso: 450 },
  { value: 'novillitos', label: 'Novillitos', defaultPeso: 350 },
  { value: 'vaquillonas', label: 'Vaquillonas', defaultPeso: 320 },
  { value: 'vacas', label: 'Vacas', defaultPeso: 400 },
  { value: 'toros', label: 'Toros', defaultPeso: 550 },
  { value: 'terneros', label: 'Terneros', defaultPeso: 180 },
]

function labelDe(cat: string): string {
  return CATEGORIAS.find((c) => c.value === cat)?.label ?? cat
}
function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}
function fmtCurrency(n: number): string {
  return '$' + fmt(n)
}
function fmtFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

/** Qué banda se usó para un lote, en palabras. */
function baseDe(l: LoteValuado): string {
  if (!l.ref.banda) return 'Sin referencia observada'
  if (l.ref.base === 'rango_peso' && l.ref.rango) {
    return `Lotes de ${l.ref.rango.desde_kg}–${l.ref.rango.hasta_kg} kg · ${fmt(l.ref.banda.lotes)} lotes`
  }
  return `Toda la categoría · ${fmt(l.ref.banda.lotes)} lotes`
}

/**
 * Onboarding progresivo: una pregunta por pantalla.
 * ¿Qué hacienda? → ¿Cuántas? → ¿Qué peso? → Valor de Referencia + ¿agregar otra?
 */
function GanadoWizard({ usdBlue, isFirst, onComplete, onCancel }: {
  usdBlue: number
  isFirst: boolean
  onComplete: (lot: GanadoItem, addAnother: boolean) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<'cat' | 'count' | 'weight' | 'result'>('cat')
  const [categoria, setCategoria] = useState('')
  const [label, setLabel] = useState('')
  const [cabezas, setCabezas] = useState(50)
  const [peso, setPeso] = useState(450)

  const ref = useMemo(() => getReferenciaPorPeso(categoria || 'x', peso), [categoria, peso])
  const kilos = cabezas * peso
  const stepNum = step === 'cat' ? 1 : step === 'count' ? 2 : 3

  const Dots = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(n => (
        <span key={n} className={`h-1.5 rounded-full transition-all ${n === stepNum ? 'w-6 bg-accent' : n < stepNum ? 'w-1.5 bg-accent/50' : 'w-1.5 bg-zinc-700'}`} />
      ))}
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {step !== 'result' && <Dots />}

      {step === 'cat' && (
        <div className="text-center">
          <h1 className="text-2xl font-terminal text-zinc-100 mb-2">
            {isFirst ? '¿Qué hacienda tenés?' : 'Agregá otra categoría'}
          </h1>
          <p className="text-zinc-500 text-sm mb-8">Elegí una categoría para empezar.</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setCategoria(cat.value); setLabel(cat.label); setPeso(cat.defaultPeso); setStep('count') }}
                className="py-4 bg-zinc-900 border border-zinc-700 hover:border-accent rounded-lg text-zinc-200 hover:text-accent transition-colors"
              >
                {cat.label}
              </button>
            ))}
          </div>
          {!isFirst && (
            <button onClick={onCancel} className="text-xxs text-zinc-500 hover:text-zinc-300 mt-6">Cancelar</button>
          )}
        </div>
      )}

      {step === 'count' && (
        <div className="text-center">
          <h1 className="text-2xl font-terminal text-zinc-100 mb-2">¿Cuántas cabezas?</h1>
          <p className="text-zinc-500 text-sm mb-8">{label}.</p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={() => setCabezas(Math.max(1, cabezas - 10))} className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xl hover:border-accent" aria-label="Diez cabezas menos">−</button>
            <input
              type="number" min={1} value={cabezas}
              onChange={e => setCabezas(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-32 text-center text-4xl font-mono bg-transparent text-zinc-100 border-b-2 border-terminal-border focus:border-accent outline-none py-1"
            />
            <button onClick={() => setCabezas(cabezas + 10)} className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xl hover:border-accent" aria-label="Diez cabezas más">+</button>
          </div>
          <button onClick={() => setStep('weight')} className="w-full py-3 bg-accent hover:bg-accent-bright text-terminal-bg font-medium rounded-lg transition-colors">Seguir →</button>
          <button onClick={() => setStep('cat')} className="text-xxs text-zinc-500 hover:text-zinc-300 mt-4">← Volver</button>
        </div>
      )}

      {step === 'weight' && (
        <div className="text-center">
          <h1 className="text-2xl font-terminal text-zinc-100 mb-2">¿De qué peso aproximado?</h1>
          <p className="text-zinc-500 text-sm mb-8">Promedio por cabeza, en kilos. El peso cambia el precio por kilo: lo usamos para buscar lotes parecidos al tuyo.</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <input
              type="number" min={50} max={1000} value={peso}
              onChange={e => setPeso(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-32 text-center text-4xl font-mono bg-transparent text-zinc-100 border-b-2 border-terminal-border focus:border-accent outline-none py-1"
            />
            <span className="text-zinc-500 text-lg">kg</span>
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {[-40, -20, 20, 40].map(d => (
              <button key={d} onClick={() => setPeso(Math.max(1, peso + d))} className="px-3 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-400 hover:border-accent">{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>
          <button onClick={() => setStep('result')} className="w-full py-3 bg-accent hover:bg-accent-bright text-terminal-bg font-medium rounded-lg transition-colors">Ver su Valor de Referencia</button>
          <button onClick={() => setStep('count')} className="text-xxs text-zinc-500 hover:text-zinc-300 mt-4">← Volver</button>
        </div>
      )}

      {step === 'result' && (
        <div className="text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{cabezas} {label.toLowerCase()} de ~{peso} kg</p>
          {ref.banda ? (
            <>
              <div className="text-4xl text-positive font-mono font-medium mb-1 tabular-nums">{fmtCurrency(ref.banda.mediana * kilos)}</div>
              <div className="text-zinc-400 font-mono text-sm mb-1">
                entre {fmtCurrency(ref.banda.p10 * kilos)} y {fmtCurrency(ref.banda.p90 * kilos)}
              </div>
              <div className="text-zinc-500 font-mono text-xs mb-6">≈ USD {fmt((ref.banda.mediana * kilos) / usdBlue)}</div>
              <div className="terminal-panel mb-8">
                <div className="px-panel py-4 text-xs text-zinc-400 text-left leading-relaxed">
                  Es la mediana de lo que se pagó por kilo en {ref.base === 'rango_peso' && ref.rango
                    ? `lotes de ${label.toLowerCase()} de ${ref.rango.desde_kg}–${ref.rango.hasta_kg} kg`
                    : `lotes de ${label.toLowerCase()} de todos los pesos`} en el Mercado Agroganadero,
                  {' '}{fmt(ref.banda.lotes)} lotes en {ref.ventana_dias} días. El rango va del 10 % más barato al 10 % más caro.
                </div>
              </div>
            </>
          ) : (
            <div className="terminal-panel mb-8">
              <div className="px-panel py-4 text-sm text-zinc-300 text-left leading-relaxed">
                <strong className="text-amber-300">No tenemos un precio observado para {label.toLowerCase()}.</strong>{' '}
                El Mercado Agroganadero no opera esa categoría y no vamos a inventarle un valor. Lo guardamos en tu rodeo
                y lo mostramos sin valuar.
              </div>
            </div>
          )}
          <button onClick={() => onComplete({ categoria, cabezas, peso }, true)} className="w-full py-3 bg-zinc-900 border border-zinc-700 hover:border-accent text-zinc-200 rounded-lg mb-3 transition-colors">+ Agregar otra categoría</button>
          <button onClick={() => onComplete({ categoria, cabezas, peso }, false)} className="w-full py-3 bg-accent hover:bg-accent-bright text-terminal-bg font-medium rounded-lg transition-colors">Listo, ver mi rodeo →</button>
        </div>
      )}
    </div>
  )
}

export default function MiGanadoClient({ inmag, usdBlue, lastUpdate }: Props) {
  const {
    items, alertsOptIn,
    isLoading, isLoggedIn, hasRow,
    saveGanado, markSeen, setAlerts,
  } = useGanado()

  const [draft, setDraft] = useState<GanadoItem[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardKey, setWizardKey] = useState(0)
  const [histSerie, setHistSerie] = useState<PuntoHistorial[]>([])
  const [histMetodo, setHistMetodo] = useState<string | null>(null)
  const [histLoading, setHistLoading] = useState(false)
  // Feedback del opt-in semanal: sin esto el checkbox se marca y no dice si guardó.
  const [alertSaved, setAlertSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const stampedRef = useRef(false)

  // Hydrate the editable draft from the saved herd once it loads.
  useEffect(() => {
    if (!isLoading) setDraft(items)
  }, [isLoading, items])

  const rodeo = useMemo(() => valuarRodeo(draft), [draft])

  // Registra el valor central que el productor está viendo (lo lee /admin/ops). Una vez
  // por montaje. Ya no se escriben snapshots diarios: ver useGanado.
  useEffect(() => {
    if (!isLoading && isLoggedIn && hasRow && items.length > 0 && !stampedRef.current) {
      stampedRef.current = true
      const v = valuarRodeo(items)
      if (v.total) markSeen(v.total.central)
    }
  }, [isLoading, isLoggedIn, hasRow, items, markSeen])

  function addItem() {
    setDraft([...draft, { categoria: 'novillos', cabezas: 50, peso: 450 }])
    setDirty(true); setSaved(false)
  }
  function openWizard() { setWizardKey(k => k + 1); setWizardOpen(true) }
  // Wizard agregó una tropa: la sumamos y guardamos automáticamente.
  async function handleWizardComplete(lot: GanadoItem, addAnother: boolean) {
    const next = [...draft, lot]
    setDraft(next); setDirty(false)
    const { error } = await saveGanado(next)
    if (!error) {
      stampedRef.current = true
      const v = valuarRodeo(next)
      if (v.total) markSeen(v.total.central)
    }
    if (addAnother) setWizardKey(k => k + 1)
    else setWizardOpen(false)
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
      const v = valuarRodeo(draft)
      if (v.total) markSeen(v.total.central)
      setTimeout(() => setSaved(false), 4000)
    }
  }

  /* ---- El historial: el rodeo de hoy, anclado a su Valor de Referencia y movido con
         el INMAG de cada fecha. Se RECALCULA; no hay snapshots. Ver
         lib/ganado-historial.ts. Va acá arriba, con los demás efectos, porque después
         vienen returns condicionales y un hook no puede quedar detrás de uno. ---- */
  useEffect(() => {
    if (!isLoggedIn || isLoading || items.length === 0) return
    let vivo = true
    setHistLoading(true)
    fetch('/api/ganado/historial')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) return
        setHistSerie(Array.isArray(d.serie) ? d.serie : [])
        setHistMetodo(typeof d.metodo === 'string' ? d.metodo : null)
      })
      .catch(() => { /* el panel cae al texto explicativo, nunca a una serie guardada */ })
      .finally(() => { if (vivo) setHistLoading(false) })
    return () => { vivo = false }
    // Depende del rodeo GUARDADO (`items`), no del borrador: no se recalcula con cada
    // tecla mientras el usuario edita.
  }, [isLoggedIn, isLoading, items])

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
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">Mi Ganado: cuánto vale tu rodeo</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Cargá tu hacienda una vez —categoría, cabezas y peso— y la ves valuada a su{' '}
          <Link href="/vr" className="text-accent hover:text-accent-bright">Valor de Referencia</Link>:
          lo que realmente se pagó por lotes parecidos al tuyo en el Mercado Agroganadero, con el rango
          y la cantidad de lotes que lo sostienen.
        </p>
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">¿Qué vas a ver?</div>
          <ul className="px-panel py-4 space-y-2 text-sm text-zinc-400">
            <li>· El valor de tu rodeo en pesos y dólares, con el rango de lo que se pagó (no un número solo).</li>
            <li>· Qué lotes lo sostienen: categoría, rango de peso y cuántos lotes se vendieron así.</li>
            <li>· Cómo se movió ese mismo rodeo en el tiempo, y un mail cada lunes con su valor.</li>
          </ul>
        </div>
        <Link
          href="/login?next=/mi-ganado"
          className="inline-block py-3 px-6 bg-accent hover:bg-accent-bright text-terminal-bg text-sm font-medium rounded transition-colors"
        >
          Valuar mi rodeo gratis →
        </Link>
        <p className="text-xxs text-zinc-500 mt-4">
          Gratis. Solo necesitás tu email. ¿Querés mirar primero los precios?{' '}
          <Link href="/vr" className="text-accent hover:text-accent-bright">Ver el Valor de Referencia por categoría</Link>.
        </p>
      </div>
    )
  }

  // A qué remate mandar: manda la categoría con más kilos del rodeo. Terneros y
  // novillitos van a invernada; el resto, a los generales.
  const tipoRemate = (() => {
    let mejor = ''
    let masKilos = 0
    for (const it of draft) {
      const k = (it.cabezas || 0) * (it.peso || 0)
      if (k > masKilos) { masKilos = k; mejor = it.categoria }
    }
    if (mejor === 'terneros' || mejor === 'novillitos') {
      return { label: 'invernada', href: '/remates/tipo/invernada' }
    }
    return { label: 'hacienda', href: '/remates' }
  })()

  const isUp = (inmag.change ?? 0) >= 0
  const empty = draft.length === 0

  /* ---- Onboarding progresivo (primera vez) o "agregar" guiado ---- */
  if (wizardOpen || (empty && !hasRow)) {
    return (
      <GanadoWizard
        key={wizardKey}
        usdBlue={usdBlue.current}
        isFirst={draft.length === 0}
        onComplete={handleWizardComplete}
        onCancel={() => setWizardOpen(false)}
      />
    )
  }

  /* ---- Logged in: dashboard ---- */
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-terminal text-zinc-100 mb-1">Mi Ganado</h1>
          <p className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
            Valor de Referencia · lotes del MAG {fmtFechaCorta(rodeo.ventana.desde)} → {fmtFechaCorta(rodeo.ventana.hasta)} · {VR_METODOLOGIA}
          </p>
        </div>
        <span className={`text-xxs font-terminal px-2 py-1 rounded inline-flex items-center gap-1.5 ${isUp ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
          INMAG ${fmt(inmag.current)} · {isUp ? '+' : ''}{(inmag.change ?? 0).toFixed(1)}% · {fmtFechaCorta(lastUpdate)}
        </span>
      </div>

      {/* El número: Valor de Referencia del rodeo, con su rango */}
      {!empty && (
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header text-accent">Valor de Referencia de tu rodeo</div>
          <div className="px-panel py-6">
            {rodeo.total ? (
              <>
                <div className="text-4xl text-positive font-mono font-medium mb-1 tabular-nums">
                  {fmtCurrency(rodeo.total.central)}
                </div>
                <div className="text-sm text-zinc-300 font-mono mb-1">
                  entre {fmtCurrency(rodeo.total.conservador)} y {fmtCurrency(rodeo.total.optimista)}
                </div>
                <div className="text-xs text-zinc-500 font-mono mb-4">
                  ≈ USD {fmt(rodeo.total.central / usdBlue.current)} <span className="text-zinc-600">(blue ${fmt(usdBlue.current)})</span>
                </div>
                <p className="text-xxs text-zinc-500 leading-relaxed">
                  El número grande es la mediana de lo que se pagó por kilo en lotes de la misma categoría y peso
                  que los tuyos; el rango va del 10 % más barato al 10 % más caro de esos lotes.{' '}
                  <Link href="/metodologia/vr" className="text-accent hover:text-accent-bright">Cómo se calcula</Link>.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-300">
                Ninguna de las categorías que cargaste tiene un precio observado en el Mercado Agroganadero,
                así que no mostramos un valor. Preferimos no inventarlo.
              </p>
            )}

            {rodeo.sinValuar.cabezas > 0 && (
              <p className="mt-4 text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded px-3 py-2 leading-relaxed">
                {fmt(rodeo.sinValuar.cabezas)} cabezas ({rodeo.sinValuar.categorias.map(labelDe).join(', ').toLowerCase()}) quedan
                sin valuar: el Mercado Agroganadero no opera esa categoría y no tenemos un precio observado con qué medirlas.
              </p>
            )}

            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-terminal-border">
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Cabezas valuadas</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(rodeo.valuado.cabezas)}</div>
              </div>
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Kilos valuados</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(rodeo.valuado.kilos)} kg</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Qué sostiene el número: lote por lote */}
      {!empty && rodeo.lotes.length > 0 && (
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header flex items-center justify-between">
            <span>Qué lo sostiene</span>
            <span className="text-xxs text-zinc-500">$/kg · P10 · mediana · P90</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {rodeo.lotes.map((l, i) => (
              <div key={i} className="px-panel py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-1 sm:gap-4 items-baseline">
                <div>
                  <div className="text-sm text-zinc-200">
                    {fmt(l.cabezas)} {labelDe(l.categoria).toLowerCase()} · {fmt(l.peso)} kg
                  </div>
                  <div className="text-xxs text-zinc-500">{baseDe(l)}</div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  {l.ref.banda && l.central != null ? (
                    <>
                      <div className="text-sm text-zinc-100">{fmtCurrency(l.central)}</div>
                      <div className="text-xxs text-zinc-500">
                        {fmt(l.ref.banda.p10)} · <span className="text-zinc-300">{fmt(l.ref.banda.mediana)}</span> · {fmt(l.ref.banda.p90)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xxs text-amber-300/80">sin valuar</div>
                  )}
                </div>
              </div>
            ))}
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
            <button onClick={openWizard} className="text-sm text-accent hover:text-accent-bright">+ Agregar tu primera categoría</button>
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
              <button onClick={openWizard} className="text-sm text-accent hover:text-accent-bright transition-colors">+ Agregar (guiado)</button>
              <button onClick={addItem} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors ml-4">+ manual</button>
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

      {/* Evolución (recalculada) + aviso semanal */}
      {hasRow && !empty && (
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header">Cómo se movió este mismo rodeo</div>
          <div className="px-panel py-5">
            {histLoading && histSerie.length === 0 ? (
              <p className="text-sm text-zinc-500">Calculando la evolución de tu rodeo…</p>
            ) : histSerie.length > 1 ? (
              <HistorialLote serie={histSerie} metodo={histMetodo ?? undefined} />
            ) : (
              // Sin serie recalculada no se dibuja nada: la vieja serie de visitas
              // guardadas producía caídas que no ocurrieron (el "−93,1 %").
              <p className="text-sm text-zinc-400">
                {rodeo.total
                  ? 'Guardá tu hacienda y vas a ver acá cuánto valía este mismo rodeo en cada fecha, hasta 2015.'
                  : 'La evolución necesita al menos un lote con precio observado.'}
              </p>
            )}

            <label className="flex items-center gap-3 mt-5 pt-5 border-t border-terminal-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alertsOptIn}
                onChange={async (e) => {
                  await setAlerts(e.target.checked)
                  // Se guarda solo, pero hay que decirlo: un checkbox mudo deja al
                  // usuario sin saber si quedó, y el reflejo es buscar un botón.
                  setAlertSaved(true)
                  setTimeout(() => setAlertSaved(false), 2600)
                }}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-zinc-300">
                Mandame cada lunes el Valor de Referencia de mi rodeo
                <span className="block text-xxs text-zinc-500">
                  Un mail con el valor, su rango y cuánto se movió en la semana. Lo apagás desde acá cuando quieras.
                </span>
              </span>
              {alertSaved && (
                <span className="ml-auto whitespace-nowrap text-xxs text-positive">
                  ✓ {alertsOptIn ? 'Guardado' : 'Cancelado'}
                </span>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Vender — lleva a lo que corresponde a ESTE rodeo, dentro del sitio. */}
      <div className="terminal-panel mt-6">
        <div className="px-panel py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-400">
            ¿Pensás vender? Mirá los próximos remates de {tipoRemate.label}.
          </p>
          <Link href={tipoRemate.href} className="text-sm text-accent hover:text-accent-bright transition-colors whitespace-nowrap">Ver remates →</Link>
        </div>
      </div>

      <p className="text-xxs text-zinc-500 mt-6">
        * Referencia de mercado observada en el Mercado Agroganadero (Cañuelas): no es una tasación ni una
        cotización en firme. El precio final depende de calidad, ubicación, condiciones de pago y negociación.
        Tu hacienda queda guardada en tu cuenta.
      </p>
    </div>
  )
}
