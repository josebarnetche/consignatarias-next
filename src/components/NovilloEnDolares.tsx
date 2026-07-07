'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

export interface NovilloDay {
  date: string
  label: string
  ctx: string
  usd_blue: number
  usd_oficial: number
  inmag: number
  blue: number
}
export interface NovilloPoint {
  date: string
  usd: number
}

/** Count-up animado (easeOutCubic) que re-dispara cuando cambia el target. */
function useCountUp(target: number, durationMs = 900): number {
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
      else {
        fromRef.current = to
        setVal(to)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs])
  return val
}

// En Argentina "$" se lee como pesos → los valores en dólares SIEMPRE con "USD".
const fmtUsd = (n: number) => 'USD ' + Math.round(n).toLocaleString('es-AR')
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d, 10)} ${MES[parseInt(m, 10) - 1]} ${y}`
}

export default function NovilloEnDolares({
  days,
  series,
  totalDays,
}: {
  days: NovilloDay[]
  series: NovilloPoint[]
  totalDays: number
}) {
  const [active, setActive] = useState(days.length - 1)
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([])

  // La escena visible manda: setea el día activo (mueve el marcador + el número).
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i)
            if (!Number.isNaN(i)) setActive(i)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    sceneRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const cur = days[active]
  const animUsd = useCountUp(cur?.usd_blue ?? 0)

  // Chart SVG del espinazo (serie mensual, USD blue).
  const chart = useMemo(() => {
    const W = 1000
    const H = 240
    const usds = series.map((p) => p.usd)
    const min = Math.min(...usds) * 0.9
    const max = Math.max(...usds) * 1.05
    const x = (i: number) => (i / (series.length - 1)) * W
    const y = (v: number) => H - ((v - min) / (max - min)) * H
    const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.usd).toFixed(1)}`).join(' ')
    const areaPath = `${path} L${W},${H} L0,${H} Z`
    // índice de serie más cercano a cada día importante
    const dayIdx = days.map((d) => {
      let best = 0
      let bestDiff = Infinity
      series.forEach((p, i) => {
        const diff = Math.abs(new Date(p.date).getTime() - new Date(d.date).getTime())
        if (diff < bestDiff) {
          bestDiff = diff
          best = i
        }
      })
      return best
    })
    return { W, H, x, y, path, areaPath, dayIdx }
  }, [series, days])

  const activeIdx = chart.dayIdx[active]

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* HERO */}
      <section className="pt-14 pb-8 text-center">
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
          · Del ISO-8859-1 a la serie completa · {series.length} meses
        </div>
        <h1 className="text-4xl md:text-6xl font-mono font-bold text-white tracking-tight leading-[0.95]">
          El novillo argentino,
          <br />
          en dólares.
        </h1>
        <p className="text-zinc-400 font-mono text-sm md:text-base mt-5 max-w-xl mx-auto leading-relaxed">
          Un novillo (~460 kg) cruzado con el dólar blue, día por día desde 2015. La misma hacienda, el mismo
          animal — y lo que valía en dólares según qué pasaba en la Argentina. Scrolleá.
        </p>
      </section>

      {/* CHART + NÚMERO STICKY */}
      <div className="sticky top-2 z-20 bg-zinc-950/85 backdrop-blur border border-zinc-800 rounded-xl p-4 md:p-6 mb-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xxs font-mono uppercase tracking-widest text-zinc-500 mb-1">Un novillo valía</div>
            <div className="text-5xl md:text-7xl font-mono font-bold text-sky-400 tabular-nums leading-none">
              {fmtUsd(animUsd)}
            </div>
            <div className="text-sm font-mono text-zinc-400 mt-2">
              {fmtDate(cur.date)} · <span className="text-zinc-200">{cur.label}</span>
            </div>
          </div>
          <div className="text-right text-xxs font-mono text-zinc-500 leading-relaxed">
            <div>
              INMAG <span className="text-zinc-300 tabular-nums">${Math.round(cur.inmag).toLocaleString('es-AR')}/kg</span>
            </div>
            <div>
              Blue <span className="text-zinc-300 tabular-nums">${cur.blue.toLocaleString('es-AR')}</span>
            </div>
            <div>
              Al oficial <span className="text-zinc-300 tabular-nums">{fmtUsd(cur.usd_oficial)}</span>
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-28 md:h-36 mt-3" preserveAspectRatio="none">
          <defs>
            <linearGradient id="novGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={chart.areaPath} fill="url(#novGrad)" />
          <path d={chart.path} fill="none" stroke="#38bdf8" strokeWidth={2} vectorEffect="non-scaling-stroke" opacity={0.85} />
          {chart.dayIdx.map((si, i) => (
            <circle
              key={i}
              cx={chart.x(si)}
              cy={chart.y(series[si].usd)}
              r={i === active ? 7 : 3}
              fill={i === active ? '#38bdf8' : '#3f3f46'}
            />
          ))}
          <line
            x1={chart.x(activeIdx)}
            x2={chart.x(activeIdx)}
            y1={0}
            y2={chart.H}
            stroke="#38bdf8"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            opacity={0.4}
          />
        </svg>
      </div>

      {/* ESCENAS */}
      <div className="space-y-2">
        {days.map((d, i) => (
          <div
            key={d.date}
            data-i={i}
            ref={(el) => {
              sceneRefs.current[i] = el
            }}
            className={`min-h-[62vh] flex flex-col justify-center border-l-2 pl-5 md:pl-8 transition-colors duration-500 ${
              i === active ? 'border-sky-500' : 'border-zinc-800'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-widest text-sky-400/80 mb-2">{fmtDate(d.date)}</div>
            <h2 className="text-2xl md:text-4xl font-mono font-bold text-white tracking-tight mb-3">{d.label}</h2>
            <div className="text-4xl md:text-6xl font-mono font-bold text-sky-400 tabular-nums mb-4">
              {fmtUsd(d.usd_blue)}
            </div>
            <p className="text-zinc-400 font-mono text-sm md:text-base max-w-lg leading-relaxed">{d.ctx}</p>
          </div>
        ))}
      </div>

      {/* CTA — pb generoso para despejar el banner de cookies + el FAB de WhatsApp */}
      <section className="pt-20 pb-44 text-center border-t border-zinc-800 mt-10">
        <h2 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight mb-4">
          Esto es un puñado de días. Tenemos los {totalDays.toLocaleString('es-AR')}.
        </h2>
        <p className="text-zinc-400 font-mono text-sm max-w-xl mx-auto mb-8 leading-relaxed">
          Convertimos el HTML ISO-8859-1 del Mercado Agroganadero en la serie histórica completa del INMAG —
          cualquier fecha desde 2015, cruzable con el dólar. Es lo que servimos por API y MCP.
        </p>
        <Link
          href="/enterprise"
          className="inline-block bg-sky-400 text-zinc-950 font-mono font-semibold px-7 py-3 rounded text-sm hover:bg-sky-300 transition-colors"
        >
          Ver el Enterprise API →
        </Link>
      </section>
    </div>
  )
}
