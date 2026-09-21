'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useGanado } from '@/hooks/useGanado'
import { PriceSparkline } from '@/components/PriceSparkline'
import { valuarRodeo } from '@/lib/rodeo-vr'

interface Props {
  /** Últimos ~8 puntos del INMAG (para la forma 7d) */
  inmagSeries: { date: string; value: number }[]
  inmagCurrent: number
  usdBlue: number
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

/**
 * Módulo "cartera" del overview — tu rodeo a su Valor de Referencia (la mediana
 * observada de su categoría y peso en el MAG, ver lib/rodeo-vr.ts), con la forma de
 * los últimos 7 días movida con el INMAG. Antes valuaba con `market-prices.json`,
 * que los días sin rueda es un ratio fijo sobre el INMAG y no un precio observado.
 * Estados: cargando / sin sesión / sin hacienda / con hacienda.
 */
export default function MiGanadoWidget({ inmagSeries, inmagCurrent, usdBlue }: Props) {
  const { items, isLoading, isLoggedIn } = useGanado()

  const rodeo = useMemo(() => valuarRodeo(items), [items])
  const totals = {
    cabezas: rodeo.valuado.cabezas,
    ars: rodeo.total?.central ?? 0,
  }

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
          Cargá tu hacienda una vez y la ves valuada a lo que realmente se vendió en el MAG, por categoría y peso.
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
          <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Valor de Referencia · {fmt(totals.cabezas)} cab.</div>
          {rodeo.total ? (
            <>
              <div className="text-3xl text-positive font-mono font-medium tabular-nums leading-none">${fmt(totals.ars)}</div>
              <div className="text-xxs text-zinc-500 font-mono mt-1.5">
                entre ${fmt(rodeo.total.conservador)} y ${fmt(rodeo.total.optimista)} · ≈ USD {fmt(totals.ars / usdBlue)}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-400">Sin referencia observada para tu rodeo.</div>
          )}
          {rodeo.sinValuar.cabezas > 0 && (
            <div className="text-xxs text-amber-400/80 mt-1">{fmt(rodeo.sinValuar.cabezas)} cab. sin valuar (sin precio observado)</div>
          )}
        </div>
        {delta7d != null && (
          <span className={`text-xxs font-terminal px-2 py-1 rounded-sm tabular-nums ${up ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
            {up ? '▲' : '▼'} {up ? '+' : ''}{delta7d.toFixed(1)}% · 7d al INMAG
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
