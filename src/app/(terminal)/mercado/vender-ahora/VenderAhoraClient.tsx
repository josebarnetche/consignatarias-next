'use client'

import { useState } from 'react'
import Link from 'next/link'

const CATS = [
  { value: 'novillos', label: 'Novillo', defaultKg: 430 },
  { value: 'novillitos', label: 'Novillito', defaultKg: 280 },
  { value: 'vaquillonas', label: 'Vaquillona', defaultKg: 320 },
  { value: 'vacas', label: 'Vaca', defaultKg: 380 },
  { value: 'toros', label: 'Toro', defaultKg: 600 },
  { value: 'terneros', label: 'Ternero', defaultKg: 180 },
] as const

type CatValue = typeof CATS[number]['value']

interface ApiResponse {
  success: boolean
  input?: { categoria: string; kgs: number }
  actual?: {
    precio_kg_ars: number
    valor_cabeza_ars: number
    precio_kg_usd: number | null
    valor_cabeza_usd: number | null
    variacion_semanal_pct: number
    usd_blue: number
  }
  contexto?: {
    percentil_30_dias: number
    percentil_365_dias: number
    promedio_5_anos: number | null
    minimo_5_anos: number | null
    maximo_5_anos: number | null
  }
  recomendacion?: string
  disclaimer?: string
  error?: { code: string; message: string }
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

export default function VenderAhoraClient() {
  const [cat, setCat] = useState<CatValue>('novillos')
  const [kgs, setKgs] = useState<string>('430')
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function calculate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(
        `/api/vender-ahora?categoria=${encodeURIComponent(cat)}&kgs=${encodeURIComponent(kgs)}`,
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
    if (c) setKgs(String(c.defaultKg))
  }

  if (result?.error?.code === 'pro_required') {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
          Función PRO Usuario
        </div>
        <div className="px-panel py-6 text-center">
          <p className="text-zinc-300 text-data mb-4">
            El calculador &ldquo;¿Vendo ahora?&rdquo; está disponible para
            suscriptores PRO Usuario.
          </p>
          <Link
            href="/upgrade?next=/mercado/vender-ahora"
            className="inline-block px-4 py-2 text-xxs font-terminal uppercase tracking-wider"
            style={{
              background: 'rgba(56, 189, 248, 0.9)',
              color: '#000',
              borderRadius: '2px',
            }}
          >
            Activar PRO — ARS $7.900/mes →
          </Link>
        </div>
      </div>
    )
  }

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
                    className="px-2 py-2 text-xxs font-terminal uppercase tracking-wider transition-colors border"
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

          <div>
            <label
              htmlFor="kgs-input"
              className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1"
            >
              Peso vivo (kgs por cabeza)
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
              Promedio típico para {CATS.find((c) => c.value === cat)?.label}:{' '}
              {CATS.find((c) => c.value === cat)?.defaultKg} kg
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !kgs}
            className="terminal-btn w-full disabled:opacity-50"
            style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
          >
            {loading ? 'Calculando…' : 'Calcular →'}
          </button>
        </form>
      </div>

      {/* Result */}
      {result?.success && result.actual && result.contexto && (
        <>
          <div className="terminal-panel">
            <div className="terminal-panel-header">Valor actual</div>
            <div className="grid grid-cols-2 gap-px bg-terminal-border">
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                  Por cabeza (ARS)
                </div>
                <div className="text-2xl font-terminal tabular-nums text-zinc-100">
                  ${fmt(result.actual.valor_cabeza_ars)}
                </div>
                <div className="text-zinc-500 text-xxs mt-1">
                  ${fmt(result.actual.precio_kg_ars)}/kg × {result.input?.kgs} kg
                </div>
              </div>
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                  Por cabeza (USD blue)
                </div>
                <div className="text-2xl font-terminal tabular-nums" style={{ color: '#38bdf8' }}>
                  USD {result.actual.valor_cabeza_usd !== null ? fmt(result.actual.valor_cabeza_usd) : '—'}
                </div>
                <div className="text-zinc-500 text-xxs mt-1">
                  USD {result.actual.precio_kg_usd ?? '—'}/kg al blue $
                  {fmt(result.actual.usd_blue)}
                </div>
              </div>
            </div>
          </div>

          <div className="terminal-panel">
            <div className="terminal-panel-header">Contexto estadístico</div>
            <div className="px-panel py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-data text-zinc-400">Percentil últimos 30 días</span>
                <PercentileBar value={result.contexto.percentil_30_dias} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-data text-zinc-400">Percentil último año</span>
                <PercentileBar value={result.contexto.percentil_365_dias} />
              </div>
              <div className="border-t border-terminal-border pt-3 grid grid-cols-3 gap-3 text-xxs">
                <div>
                  <div className="text-zinc-500 font-terminal uppercase tracking-wider mb-1">Mínimo 5y</div>
                  <div className="text-zinc-300 font-terminal tabular-nums">
                    ${fmt(result.contexto.minimo_5_anos ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 font-terminal uppercase tracking-wider mb-1">Promedio 5y</div>
                  <div className="text-zinc-300 font-terminal tabular-nums">
                    ${fmt(result.contexto.promedio_5_anos ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 font-terminal uppercase tracking-wider mb-1">Máximo 5y</div>
                  <div className="text-zinc-300 font-terminal tabular-nums">
                    ${fmt(result.contexto.maximo_5_anos ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="terminal-panel"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
            }}
          >
            <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
              Lectura
            </div>
            <div className="px-panel py-4">
              <p className="text-zinc-200 text-sm leading-relaxed mb-3">
                {result.recomendacion}
              </p>
              <p className="text-zinc-500 text-xxs">{result.disclaimer}</p>
            </div>
          </div>
        </>
      )}

      {result?.error && result.error.code !== 'pro_required' && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-data text-red-300">
          {result.error.message}
        </div>
      )}
    </div>
  )
}

function PercentileBar({ value }: { value: number }) {
  const color = value >= 70 ? '#34d399' : value >= 40 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-3 flex-1 max-w-xs ml-4">
      <div className="flex-1 h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-zinc-200 font-terminal tabular-nums text-data w-10 text-right">
        {value}%
      </span>
    </div>
  )
}
