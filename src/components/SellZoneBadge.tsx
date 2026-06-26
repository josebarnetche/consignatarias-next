'use client'

import { useEffect, useState } from 'react'

/**
 * SellZoneBadge — el "semáforo de venta" on-site. Muestra de un vistazo si el
 * mercado está en zona de venta / aguantar / neutra (INMAG en USD reales,
 * percentil del año), la versión gratis y diaria del aviso por mail.
 *
 * Es la señal "¿conviene vender hoy?" que da motivo de volver todos los días
 * (mecánica de retención #1 en productos de precio agro). Lee /api/sell-zone
 * (cacheado 1h). Honestidad: el percentil mide el novillo; en otras categorías
 * refleja la dirección del mercado, y el subtítulo lo dice.
 */
interface Signal {
  success: boolean
  pct30: number
  pct365: number
  verdict: 'vender' | 'aguantar' | 'neutro'
  inmagUsdHoy: number | null
  asOf: string | null
}

const STYLE: Record<Signal['verdict'], { label: string; color: string; bg: string; border: string; dot: string }> = {
  vender: { label: 'Zona de venta', color: '#34d399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.35)', dot: '#34d399' },
  aguantar: { label: 'Zona de aguante', color: '#fbbf24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.35)', dot: '#fbbf24' },
  neutro: { label: 'Zona neutra', color: '#a1a1aa', bg: 'rgba(161,161,170,0.06)', border: 'rgba(161,161,170,0.30)', dot: '#a1a1aa' },
}

export default function SellZoneBadge({
  categoriaLabel = 'novillo',
  className = '',
}: {
  /** etiqueta singular para el copy ('novillo', 'vaca', …) */
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
    // Skeleton liviano mientras carga — sin números falsos.
    return (
      <div className={`inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
        <span className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
      </div>
    )
  }

  const s = STYLE[sig.verdict]
  return (
    <div
      className={`rounded-md px-3.5 py-2.5 ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
        <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">Semáforo de venta · {categoriaLabel}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-semibold" style={{ color: s.color }}>{s.label}</span>
        <span className="text-xs font-mono text-zinc-400 tabular-nums">
          percentil {sig.pct365} del año · {sig.pct30} del mes
        </span>
      </div>
      <p className="text-xxs text-zinc-600 mt-1 leading-relaxed">
        Medido sobre el INMAG en dólares reales. {categoriaLabel === 'novillo'
          ? 'Preciso para el novillo.'
          : `Refleja la dirección del mercado (vía novillo).`}
      </p>
    </div>
  )
}
