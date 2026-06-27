'use client'

import { useEffect, useState } from 'react'

/**
 * SellZoneBadge — el "semáforo de venta" on-site. DISEÑO TRUST-FIRST: describe,
 * no ordena. Muestra la zona del precio (alta/media/baja vs el año) + la
 * tendencia (vs media móvil 90d), para que el productor decida con el cuadro
 * completo y nunca quede en offside por un "vendé" que el mercado desmiente.
 *
 * Lee /api/sell-zone (cacheado 1h). Honestidad: el percentil mide el novillo; en
 * otras categorías refleja la dirección del mercado, y el subtítulo lo dice.
 */
interface Signal {
  success: boolean
  pct30: number
  pct365: number
  zone: 'alta' | 'media' | 'baja'
  trend: 'subiendo' | 'estable' | 'bajando'
  ma90: number | null
  alertWorthy: boolean
  inmagUsdHoy: number | null
  asOf: string | null
}

const ZONE: Record<Signal['zone'], { label: string; color: string; bg: string; border: string }> = {
  alta: { label: 'Zona alta del año', color: '#34d399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.35)' },
  media: { label: 'Zona media', color: '#a1a1aa', bg: 'rgba(161,161,170,0.06)', border: 'rgba(161,161,170,0.30)' },
  baja: { label: 'Zona baja del año', color: '#fbbf24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.35)' },
}

const TREND: Record<Signal['trend'], { label: string; arrow: string }> = {
  subiendo: { label: 'en tendencia alcista', arrow: '↑' },
  estable: { label: 'tendencia estable', arrow: '→' },
  bajando: { label: 'girando a la baja', arrow: '↓' },
}

export default function SellZoneBadge({
  categoriaLabel = 'novillo',
  className = '',
}: {
  categoriaLabel?: string
  className?: string
}) {
  const [sig, setSig] = useState<Signal | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/sell-zone')
      .then((r) => r.json())
      .then((d: Signal) => { if (alive) { if (d?.success) setSig(d); else setFailed(true) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  if (failed) return null

  if (!sig) {
    return (
      <div className={`inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
        <span className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
      </div>
    )
  }

  const z = ZONE[sig.zone]
  const t = TREND[sig.trend]

  // Lectura honesta de la conjunción zona×tendencia (descriptiva, no imperativa).
  let nota: string | null = null
  if (sig.alertWorthy) {
    nota = 'Precio alto y girando: históricamente, zona de salida.'
  } else if (sig.zone === 'alta' && sig.trend === 'subiendo') {
    nota = 'En zona alta, pero todavía subiendo — no necesariamente el techo.'
  } else if (sig.zone === 'baja') {
    nota = 'Precio bajo en términos reales vs el último año.'
  }

  return (
    <div className={`rounded-md px-3.5 py-2.5 ${className}`} style={{ background: z.bg, border: `1px solid ${z.border}` }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: z.color, boxShadow: `0 0 8px ${z.color}` }} />
        <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">Semáforo de venta · {categoriaLabel}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-semibold" style={{ color: z.color }}>{z.label}</span>
        <span className="text-xs font-mono text-zinc-400">{t.arrow} {t.label}</span>
      </div>
      <div className="mt-0.5 text-xs font-mono text-zinc-500 tabular-nums">
        percentil {sig.pct365} del año · {sig.pct30} del mes
      </div>
      {nota && <p className="text-xxs mt-1.5 leading-relaxed" style={{ color: sig.alertWorthy ? z.color : '#71717a' }}>{nota}</p>}
      <p className="text-xxs text-zinc-600 mt-1 leading-relaxed">
        Medido sobre el INMAG en dólares reales. {categoriaLabel === 'novillo'
          ? 'Preciso para el novillo.'
          : 'Refleja la dirección del mercado (vía novillo).'} No es una recomendación.
      </p>
    </div>
  )
}
