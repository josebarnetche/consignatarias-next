'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useGanado, type GanadoItem } from '@/hooks/useGanado'
import { PriceSparkline } from '@/components/PriceSparkline'

interface Props {
  /** Últimos ~8 puntos del INMAG (para la forma 7d) */
  inmagSeries: { date: string; value: number }[]
  inmagCurrent: number
  categories: Record<string, { current: number }>
  usdBlue: number
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function herdValue(items: GanadoItem[], categories: Props['categories'], inmagCurrent: number) {
  let cabezas = 0
  let ars = 0
  for (const it of items) {
    const precio = categories[it.categoria]?.current ?? inmagCurrent
    cabezas += it.cabezas || 0
    ars += (it.cabezas || 0) * (it.peso || 0) * precio
  }
  return { cabezas, ars }
}

/**
 * Módulo "cartera" del overview — tu stock valuado al precio de hoy, con la
 * forma de los últimos 7 días (composición actual valuada al índice de cada
 * día, igual que en /mi-ganado). Estados: cargando / sin sesión / sin hacienda
 * / con hacienda.
 */
export default function MiGanadoWidget({ inmagSeries, inmagCurrent, categories, usdBlue }: Props) {
  const { items, isLoading, isLoggedIn } = useGanado()

  const totals = useMemo(() => herdValue(items, categories, inmagCurrent), [items, categories, inmagCurrent])

  // Forma 7d: la hacienda de HOY valuada al índice de cada uno de los últimos días.
  const series7d = useMemo(() => {
    if (totals.ars <= 0 || !inmagCurrent) return []
    return inmagSeries.slice(-7).map((p) => ({ date: p.date, value: totals.ars * (p.value / inmagCurrent) }))
  }, [inmagSeries, inmagCurrent, totals.ars])

  const delta7d = useMemo(() => {
    if (series7d.length < 2) return null
    const first = series7d[0].value
    const last = series7d[series7d.length - 1].value
    return first > 0 ? ((last - first) / first) * 100 : null
  }, [series7d])

  if (isLoading) {
    return <div className="px-panel py-5"><div className="h-24 bg-zinc-800/40 rounded animate-pulse" /></div>
  }

  if (!isLoggedIn || items.length === 0) {
    return (
      <div className="px-panel py-5">
        <p className="text-sm text-zinc-300 mb-1.5">Tu stock, a valor de hoy.</p>
        <p className="text-xxs text-zinc-500 leading-relaxed mb-4">
          Cargá tu hacienda una vez y vuelve valuada al INMAG de cada día, como una cartera.
        </p>
        <Link
          href="/mi-ganado"
          className="inline-flex items-center justify-center min-h-[40px] px-4 bg-accent hover:bg-sky-300 text-zinc-950 text-xxs font-terminal font-bold uppercase tracking-wider rounded-sm transition-colors"
        >
          {isLoggedIn ? 'Cargar mi hacienda →' : 'Empezar gratis →'}
        </Link>
      </div>
    )
  }

  const up = (delta7d ?? 0) >= 0

  return (
    <div className="px-panel py-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Valor hoy · {fmt(totals.cabezas)} cab.</div>
          <div className="text-3xl text-positive font-mono font-medium tabular-nums leading-none">${fmt(totals.ars)}</div>
          <div className="text-xxs text-zinc-500 font-mono mt-1.5">≈ USD {fmt(totals.ars / usdBlue)}</div>
        </div>
        {delta7d != null && (
          <span className={`text-xxs font-terminal px-2 py-1 rounded-sm tabular-nums ${up ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
            {up ? '▲' : '▼'} {up ? '+' : ''}{delta7d.toFixed(1)}% · 7d
          </span>
        )}
      </div>
      {series7d.length > 1 && (
        <div className="mt-3">
          <PriceSparkline data={series7d} height={56} lineColor="#4ade80" areaColor="rgba(74,222,128,0.10)" />
        </div>
      )}
    </div>
  )
}
