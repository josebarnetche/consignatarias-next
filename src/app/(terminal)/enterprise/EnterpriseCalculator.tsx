'use client'

import { useMemo, useState } from 'react'

// Anchor points: requests/mes → USD/mes
// Curve has decreasing $/1K marginal cost (typical SaaS API)
const ANCHORS: Array<{ requests: number; usd: number }> = [
  { requests: 100_000, usd: 700 },
  { requests: 250_000, usd: 1200 },
  { requests: 500_000, usd: 1800 },
  { requests: 1_000_000, usd: 2800 },
  { requests: 2_000_000, usd: 4500 },
  { requests: 5_000_000, usd: 7500 },
]

const MIN_IDX = 0
const MAX_IDX = ANCHORS.length - 1

function formatRequests(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `${(n / 1000).toFixed(0)}K`
}

function formatUSD(n: number): string {
  return n.toLocaleString('en-US')
}

export default function EnterpriseCalculator() {
  // Slider position is an index into ANCHORS (snapped)
  const [idx, setIdx] = useState(2) // default: 500K

  const current = ANCHORS[idx]
  const annual = useMemo(() => current.usd * 12 * 0.85, [current]) // 15% off anual
  const perThousand = useMemo(
    () => (current.usd / (current.requests / 1000)).toFixed(2),
    [current],
  )

  return (
    <div className="terminal-panel">
      <div
        className="terminal-panel-header flex items-center justify-between"
        style={{ color: '#7dd3fc', borderBottomColor: 'rgba(125, 211, 252, 0.3)' }}
      >
        <span>Scale · Calculadora de volumen</span>
        <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">
          Slider request-based
        </span>
      </div>

      <div className="px-panel py-6">
        {/* Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border mb-6">
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
              Requests/mes
            </div>
            <div className="text-zinc-100 text-2xl font-terminal tabular-nums">
              {formatRequests(current.requests)}
            </div>
          </div>
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
              Precio mensual
            </div>
            <div
              className="text-2xl font-terminal tabular-nums"
              style={{ color: '#7dd3fc' }}
            >
              USD {formatUSD(current.usd)}
            </div>
          </div>
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
              Anual (–15%)
            </div>
            <div className="text-zinc-300 text-2xl font-terminal tabular-nums">
              USD {formatUSD(Math.round(annual))}
            </div>
          </div>
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
              Costo / 1.000 req
            </div>
            <div className="text-zinc-300 text-2xl font-terminal tabular-nums">
              USD {perThousand}
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={MIN_IDX}
            max={MAX_IDX}
            step={1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            aria-label="Volumen de requests mensuales"
            className="w-full"
            style={{
              accentColor: '#38bdf8',
            }}
          />

          {/* Anchor markers */}
          <div className="flex justify-between mt-2 text-xxs font-terminal text-zinc-500 tabular-nums">
            {ANCHORS.map((a, i) => (
              <button
                key={a.requests}
                onClick={() => setIdx(i)}
                className="cursor-pointer hover:text-zinc-300 transition-colors"
                style={i === idx ? { color: '#7dd3fc' } : undefined}
                aria-label={`Seleccionar ${formatRequests(a.requests)} requests/mes`}
              >
                {formatRequests(a.requests)}
              </button>
            ))}
          </div>
        </div>

        {/* Beyond cap */}
        <div className="mt-6 border-t border-terminal-border pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-data text-zinc-400">
            <span className="text-zinc-300">¿Más de 5M req/mes?</span> Pricing
            personalizado + CSM dedicado + posibilidad de instancia aislada.
          </div>
          <a
            href={`mailto:agro@memola.com.ar?subject=Enterprise%20Scale%20—%20Consignatarias.com.ar&body=Hola,%20queremos%20conversar%20sobre%20el%20plan%20Scale.%0A%0AEmpresa:%0AVolumen%20estimado%20(req/mes):%20${current.requests}%0AUso:`}
            className="terminal-btn whitespace-nowrap"
            style={{
              borderColor: 'rgba(167, 139, 250, 0.6)',
              color: '#7dd3fc',
            }}
          >
            Contratar Scale →
          </a>
        </div>
      </div>
    </div>
  )
}
