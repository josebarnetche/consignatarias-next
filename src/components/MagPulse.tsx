'use client'

import { useState, useEffect, useRef } from 'react'
import { EmptyState } from '@/components/ui'

interface Firm {
  name: string
  cabezas: number
}
interface PulseData {
  date: string | null
  total_cabezas: number
  firms: Firm[]
  acumulado_lotes: number
}

/** Count-up animado con ease-out cúbico (dopamina de ver el número subir). */
function useCountUp(target: number, duration = 1200, run = true): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!run || target <= 0) {
      setVal(target > 0 ? 0 : 0)
      return
    }
    let start: number | null = null
    const step = (t: number) => {
      if (start === null) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration, run])
  return val
}

const fmt = (n: number) => n.toLocaleString('es-AR')

function PulseRow({ firm, max, rank }: { firm: Firm; max: number; rank: number }) {
  const [shown, setShown] = useState(false)
  const c = useCountUp(firm.cabezas, 900, shown)
  useEffect(() => {
    const id = setTimeout(() => setShown(true), 20)
    return () => clearTimeout(id)
  }, [])
  const pct = max ? Math.max(4, (firm.cabezas / max) * 100) : 0
  return (
    <div
      className="flex items-center gap-2 py-1"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity .45s ease, transform .45s ease',
      }}
    >
      <span className="text-zinc-600 text-xxs font-terminal tabular-nums w-4 shrink-0">{rank}</span>
      <span className="text-zinc-300 text-xxs truncate flex-1 min-w-0">{firm.name}</span>
      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden shrink-0" style={{ width: 90 }}>
        <div
          className="h-full rounded-full"
          style={{
            width: shown ? `${pct}%` : '0%',
            background: 'linear-gradient(90deg, rgba(56,189,248,0.5), #38bdf8)',
            transition: 'width .9s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
      <span className="text-sky-300 font-terminal tabular-nums text-data w-16 text-right shrink-0">{fmt(c)}</span>
    </div>
  )
}

/**
 * Pulso del mercado — dripea la actividad de Cañuelas del último día con datos:
 * cabezas por consignatario, con count-up y reveal escalonado. Dopamínico, con
 * sensación de progreso (el acumulado histórico también cuenta hacia arriba).
 */
export default function MagPulse() {
  const [data, setData] = useState<PulseData | null>(null)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    fetch('/api/market-pulse')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
  }, [])

  // Drip: revelar las firmas de a una.
  useEffect(() => {
    if (!data?.firms?.length) return
    setVisible(0)
    const iv = setInterval(() => {
      setVisible((v) => {
        if (v >= data.firms.length) {
          clearInterval(iv)
          return v
        }
        return v + 1
      })
    }, 320)
    return () => clearInterval(iv)
  }, [data])

  const total = useCountUp(data?.total_cabezas || 0, 1600, !!data)
  const acum = useCountUp(data?.acumulado_lotes || 0, 1800, !!data)

  if (data && !data.date) {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header" style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}>
          Pulso del mercado · Cañuelas
        </div>
        <EmptyState
          icon="onda"
          compact
          title="Todavía registrando operaciones."
          sub="El pulso arranca tras el cierre del mercado (14:00 ART)."
        />
      </div>
    )
  }

  const max = data?.firms?.[0]?.cabezas || 0
  const shownFirms = (data?.firms || []).slice(0, visible)

  return (
    <div className="terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.28)' }}>
      <div
        className="terminal-panel-header flex items-center justify-between"
        style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Pulso del mercado · Cañuelas
        </span>
        <span className="text-zinc-600 text-xxs font-terminal normal-case tracking-normal">
          {data?.date ? new Date(data.date + 'T12:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}
        </span>
      </div>
      <div className="px-panel py-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-terminal tabular-nums text-sky-300" style={{ textShadow: '0 0 20px rgba(56,189,248,0.25)' }}>
            {fmt(total)}
          </span>
          <span className="text-zinc-500 text-data">cabezas operadas ese día</span>
        </div>
        <p className="text-zinc-600 text-xxs mb-3">
          por consignatario, en el mercado de referencia (~12% nacional).
        </p>

        <div className="space-y-0.5">
          {shownFirms.map((f, i) => (
            <PulseRow key={f.name} firm={f} max={max} rank={i + 1} />
          ))}
        </div>

        {!!data?.acumulado_lotes && (
          <div className="mt-3 pt-2 border-t border-terminal-border flex items-center justify-between">
            <span className="text-zinc-600 text-xxs">operaciones registradas del mercado</span>
            <span className="text-zinc-400 font-terminal tabular-nums text-xxs">{fmt(acum)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
