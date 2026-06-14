'use client'

import { useEffect, useRef, useState } from 'react'
import { ProReveal, HeroNumber, StatPill } from '@/components/pro'
import { trackFreeTasteUnlock } from '@/lib/analytics'

// defaultCab ≈ un camión jaula típico de cada categoría (referencia editable).
const CATS = [
  { value: 'novillos', label: 'Novillo', defaultKg: 430, defaultCab: 30 },
  { value: 'novillitos', label: 'Novillito', defaultKg: 280, defaultCab: 40 },
  { value: 'vaquillonas', label: 'Vaquillona', defaultKg: 320, defaultCab: 36 },
  { value: 'vacas', label: 'Vaca', defaultKg: 380, defaultCab: 32 },
  { value: 'toros', label: 'Toro', defaultKg: 600, defaultCab: 20 },
  { value: 'terneros', label: 'Ternero', defaultKg: 180, defaultCab: 60 },
] as const

type CatValue = typeof CATS[number]['value']

interface Estacional {
  mejor_mes: string
  gap_pct: number
  en_pico: boolean
  upside_cab_ars: number
  upside_lote_ars: number
}

interface ApiResponse {
  success: boolean
  locked?: boolean
  taste?: boolean
  taste_reset_days?: number
  teaser?: string
  input?: { categoria: string; kgs: number; cabezas?: number }
  actual?: {
    cabezas?: number
    precio_kg_ars: number
    valor_cabeza_ars: number
    valor_lote_ars?: number
    precio_kg_usd: number | null
    valor_cabeza_usd: number | null
    valor_lote_usd?: number | null
    variacion_semanal_pct: number
    usd_blue: number
  }
  contexto?: {
    base?: string
    precision?: 'preciso' | 'indicativo'
    percentil_30_dias: number
    percentil_365_dias: number
    inmag_usd_hoy: number | null
    inmag_usd_min_5a: number | null
    inmag_usd_prom_5a: number | null
    inmag_usd_max_5a: number | null
    estacional?: Estacional | null
  }
  veredicto?: 'vender' | 'aguantar' | 'neutro'
  recomendacion?: string
  disclaimer?: string
  error?: { code: string; message: string }
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const fmt2 = (n: number | null) =>
  n !== null ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

const FROM = '/mercado/vender-ahora'

const VERDICT: Record<NonNullable<ApiResponse['veredicto']>, { label: string; color: string }> = {
  vender: { label: 'Vender hoy', color: '#34d399' },
  aguantar: { label: 'Aguantar', color: '#fbbf24' },
  neutro: { label: 'Zona neutra', color: '#a1a1aa' },
}

export default function VenderAhoraClient() {
  const [cat, setCat] = useState<CatValue>('novillos')
  const [kgs, setKgs] = useState<string>('430')
  const [cabezas, setCabezas] = useState<string>('30')
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const tasteTracked = useRef(false)

  // Fire the taste-unlock conversion signal once per granted taste.
  useEffect(() => {
    if (result?.taste && !tasteTracked.current) {
      tasteTracked.current = true
      trackFreeTasteUnlock(FROM, result.input?.categoria ?? cat)
    }
  }, [result, cat])

  async function calculate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    tasteTracked.current = false
    try {
      const res = await fetch(
        `/api/vender-ahora?categoria=${encodeURIComponent(cat)}&kgs=${encodeURIComponent(kgs)}&cabezas=${encodeURIComponent(cabezas)}`,
      )
      const json: ApiResponse = await res.json()
      setResult(json)
    } catch {
      setResult({ success: false, error: { code: 'network', message: 'Error de red.' } })
    } finally {
      setLoading(false)
    }
  }

  function selectCat(v: CatValue) {
    setCat(v)
    const c = CATS.find((x) => x.value === v)
    if (c) {
      setKgs(String(c.defaultKg))
      setCabezas(String(c.defaultCab))
    }
  }

  const catLabel = CATS.find((c) => c.value === cat)?.label ?? cat
  const weekly = result?.actual?.variacion_semanal_pct ?? 0
  const weeklyTone = weekly > 0.5 ? 'positive' : weekly < -0.5 ? 'negative' : 'neutral'
  const weeklySign = weekly > 0 ? '+' : ''

  return (
    <div className="space-y-4">
      {/* Input form */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">Tu lote</div>
        <form onSubmit={calculate} className="px-panel py-5 space-y-4">
          <div>
            <label className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {CATS.map((c) => {
                const active = cat === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => selectCat(c.value)}
                    className="px-2 py-2 text-xxs font-terminal uppercase tracking-wider transition-colors border min-h-[40px]"
                    style={
                      active
                        ? {
                            background: 'rgba(56, 189, 248, 0.12)',
                            borderColor: 'rgba(56, 189, 248, 0.5)',
                            color: '#38bdf8',
                          }
                        : { background: 'transparent', borderColor: '#27272a', color: '#a1a1aa' }
                    }
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="kgs-input"
                className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1"
              >
                Peso vivo (kg/cabeza)
              </label>
              <input
                id="kgs-input"
                type="number"
                min={50}
                max={1500}
                step={10}
                value={kgs}
                onChange={(e) => setKgs(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-terminal-border text-zinc-100 text-data font-terminal focus:outline-none focus:border-sky-500"
              />
              <p className="text-zinc-500 text-xxs mt-1">
                Típico {catLabel}: {CATS.find((c) => c.value === cat)?.defaultKg} kg
              </p>
            </div>
            <div>
              <label
                htmlFor="cabezas-input"
                className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1"
              >
                Cabezas (tu lote)
              </label>
              <input
                id="cabezas-input"
                type="number"
                min={1}
                max={1000}
                step={1}
                value={cabezas}
                onChange={(e) => setCabezas(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-terminal-border text-zinc-100 text-data font-terminal focus:outline-none focus:border-sky-500"
              />
              <p className="text-zinc-500 text-xxs mt-1">
                ≈ un camión de {catLabel.toLowerCase()}: {CATS.find((c) => c.value === cat)?.defaultCab}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !kgs}
            className="terminal-btn w-full disabled:opacity-50 min-h-[40px]"
            style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
          >
            {loading ? 'Calculando…' : 'Calcular →'}
          </button>
        </form>
      </div>

      {/* Valor actual — gratis para todos (precios públicos). Gancho fuera del gate. */}
      {result?.success && result.actual && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            Valor actual · {result.actual.cabezas ?? 1} {catLabel.toLowerCase()}
            {(result.actual.cabezas ?? 1) === 1 ? '' : 's'} × {result.input?.kgs} kg
          </div>

          {/* El "camión": valor del lote completo — el ancla monetaria del gancho. */}
          {result.actual.valor_lote_ars !== undefined && (result.actual.cabezas ?? 1) > 1 && (
            <div className="px-4 py-5 border-b border-terminal-border bg-sky-500/[0.03]">
              <HeroNumber
                label={`Valor de tu lote · ${result.actual.cabezas} cabezas`}
                value={`$${fmt(result.actual.valor_lote_ars)}`}
                sub={
                  result.actual.valor_lote_usd != null
                    ? `≈ USD ${fmt(result.actual.valor_lote_usd)} al blue · esto es lo que mueve tu venta`
                    : 'esto es lo que mueve tu venta'
                }
                tone="accent"
                size="text-4xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-terminal-border">
            <div className="bg-terminal-panel px-4 py-5">
              <HeroNumber
                label="Por cabeza (ARS)"
                value={`$${fmt(result.actual.valor_cabeza_ars)}`}
                sub={`$${fmt(result.actual.precio_kg_ars)}/kg × ${result.input?.kgs} kg`}
                size="text-3xl"
              />
            </div>
            <div className="bg-terminal-panel px-4 py-5">
              <HeroNumber
                label="Por cabeza (USD blue)"
                tone="accent"
                value={
                  result.actual.valor_cabeza_usd !== null
                    ? `USD ${fmt(result.actual.valor_cabeza_usd)}`
                    : '—'
                }
                sub={`USD ${result.actual.precio_kg_usd ?? '—'}/kg al blue $${fmt(
                  result.actual.usd_blue,
                )}`}
                size="text-3xl"
              />
            </div>
          </div>
          {/* Variación semanal real (market-prices.json) — micro-señal pública. */}
          <div className="px-4 py-2.5 border-t border-terminal-border flex items-center justify-between">
            <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
              Variación semanal
            </span>
            <span
              className="text-data font-terminal tabular-nums"
              style={{
                color:
                  weeklyTone === 'positive'
                    ? '#34d399'
                    : weeklyTone === 'negative'
                      ? '#f87171'
                      : '#a1a1aa',
              }}
            >
              {weeklySign}
              {weekly.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>
      )}

      {/* ¿Conviene vender? — capa PRO (la DECISIÓN). Gating unificado a <ProReveal>. */}
      {result?.success && (result.contexto || result.locked) && (
        <ProReveal
          from={FROM}
          title="¿Conviene vender hoy?"
          tasteUnlocked={result.taste === true}
          tasteResetDays={result.taste_reset_days}
          benefit={
            result.teaser ??
            'El valor ya lo tenés arriba. El análisis de si conviene vender o aguantar —percentil en dólares reales + brecha estacional— es PRO Usuario.'
          }
        >
          {result.contexto && result.veredicto && (
            <VenderAnalysis
              contexto={result.contexto}
              veredicto={result.veredicto}
              recomendacion={result.recomendacion ?? ''}
              disclaimer={result.disclaimer ?? ''}
              catLabel={catLabel}
            />
          )}
        </ProReveal>
      )}

      {result?.error && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-data text-red-300">
          {result.error.message}
        </div>
      )}
    </div>
  )
}

/** El bloque PRO: percentiles reales + veredicto accionable + honestidad de precisión. */
function VenderAnalysis({
  contexto,
  veredicto,
  recomendacion,
  disclaimer,
  catLabel,
}: {
  contexto: NonNullable<ApiResponse['contexto']>
  veredicto: NonNullable<ApiResponse['veredicto']>
  recomendacion: string
  disclaimer: string
  catLabel: string
}) {
  const v = VERDICT[veredicto]
  const indicativo = contexto.precision === 'indicativo'

  return (
    <div className="space-y-4">
      {/* Veredicto — la decisión, no el dato. */}
      <div
        className="flex items-center justify-between gap-3 border px-4 py-3"
        style={{ borderColor: `${v.color}66`, background: `${v.color}14` }}
      >
        <span className="text-zinc-400 text-xxs font-terminal uppercase tracking-wider">
          Veredicto estadístico
        </span>
        <span
          className="text-lg font-terminal uppercase tracking-wide tabular-nums"
          style={{ color: v.color }}
        >
          {v.label}
        </span>
      </div>

      {/* Honestidad por categoría (regla #1: no inventar precisión que no hay). */}
      <p className="text-xxs leading-relaxed" style={{ color: indicativo ? '#fbbf24' : '#34d399' }}>
        {indicativo
          ? `Percentil indicativo para ${catLabel}: refleja la DIRECCIÓN del mercado vía INMAG (novillo). No existe serie histórica propia de ${catLabel}, así que el nivel exacto puede diferir; la señal de tendencia es válida.`
          : `Percentil preciso: ${catLabel} ES la categoría base del INMAG. La medición aplica directamente.`}
      </p>

      <div className="space-y-3">
        <StatPill label="Percentil últimos 30 días" value={contexto.percentil_30_dias} />
        <StatPill label="Percentil último año" value={contexto.percentil_365_dias} />
      </div>

      <div className="border-t border-terminal-border pt-3 grid grid-cols-3 gap-3">
        <HeroNumber
          label="Mín 5y"
          value={`USD ${fmt2(contexto.inmag_usd_min_5a)}`}
          sub="/kg real"
          size="text-sm"
        />
        <HeroNumber
          label="Prom 5y"
          value={`USD ${fmt2(contexto.inmag_usd_prom_5a)}`}
          sub="/kg real"
          size="text-sm"
        />
        <HeroNumber
          label="Máx 5y"
          value={`USD ${fmt2(contexto.inmag_usd_max_5a)}`}
          sub="/kg real"
          size="text-sm"
        />
      </div>

      <p className="text-zinc-600 text-xxs">
        Hoy: INMAG USD {fmt2(contexto.inmag_usd_hoy)}/kg · medido sobre INMAG ÷ dólar blue para
        neutralizar la inflación en pesos.
      </p>

      {/* Brecha estacional — el patrón histórico traducido a plata sobre TU lote. */}
      {contexto.estacional && (
        <div
          className="border px-4 py-3"
          style={
            contexto.estacional.en_pico
              ? { borderColor: '#34d39966', background: '#34d39914' }
              : { borderColor: '#38bdf866', background: '#38bdf814' }
          }
        >
          {contexto.estacional.en_pico ? (
            <p className="text-data leading-relaxed" style={{ color: '#34d399' }}>
              Estás en torno al <strong>pico estacional histórico</strong>: {contexto.estacional.mejor_mes} es
              el mes más alto de la década en dólares reales. El calendario no juega a favor de esperar.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-zinc-400 text-xxs font-terminal uppercase tracking-wider">
                  Brecha estacional · tu lote
                </span>
                <span className="text-lg font-terminal tabular-nums" style={{ color: '#38bdf8' }}>
                  +${fmt(contexto.estacional.upside_lote_ars)}
                </span>
              </div>
              <p className="text-zinc-300 text-data leading-relaxed mt-1.5">
                Históricamente <strong>{contexto.estacional.mejor_mes}</strong> estuvo{' '}
                <strong>+{contexto.estacional.gap_pct}%</strong> sobre hoy en dólares reales — sobre tu
                lote, una brecha de <strong>+${fmt(contexto.estacional.upside_lote_ars)}</strong> (+$
                {fmt(contexto.estacional.upside_cab_ars)}/cab).
              </p>
              <p className="text-zinc-600 text-xxs mt-1.5">
                Patrón de 10 años, no una predicción. El precio futuro no está garantizado.
              </p>
            </>
          )}
        </div>
      )}

      {/* Lectura — cierra con la decisión. */}
      <div className="border-t border-terminal-border pt-3">
        <p className="text-zinc-200 text-sm leading-relaxed mb-2">{recomendacion}</p>
        <p className="text-zinc-500 text-xxs">{disclaimer}</p>
      </div>
    </div>
  )
}
