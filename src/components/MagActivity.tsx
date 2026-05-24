import marketData from '@/lib/data/market-prices.json'

type Pt = { date: string; value: number; volume?: number }

/**
 * Actividad operada en el MAG (Cañuelas) a partir de NUESTRO relevamiento diario
 * (market-prices.json → inmag.series[].volume = cabezas/día). Es el mercado
 * concentrador (~12% nacional), NO la faena nacional (esa va en <FaenaStats/>,
 * fuente oficial). Datos propios, frescos cada día hábil.
 */
export function MagActivity() {
  const series = ((marketData as { inmag?: { series?: Pt[] } }).inmag?.series ?? [])
    .filter((p) => typeof p.volume === 'number' && (p.volume as number) > 0)
  if (series.length === 0) return null

  const since = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }
  const sum = (from: string) => series.filter((p) => p.date >= from).reduce((a, p) => a + (p.volume || 0), 0)
  const last7 = sum(since(7))
  const last30 = sum(since(30))
  const ruedas30 = series.filter((p) => p.date >= since(30)).length
  const latest = series[series.length - 1]
  const fmt = (n: number) => n.toLocaleString('es-AR')

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Actividad en el MAG (Cañuelas)</h3>
        <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-1 text-xs text-sky-400">
          Relevamiento propio · diario
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-zinc-500">Últimos 7 días</p>
          <p className="text-2xl font-bold text-zinc-100">{fmt(last7)}</p>
          <p className="text-xs text-zinc-500">cabezas operadas</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Últimos 30 días</p>
          <p className="text-2xl font-bold text-zinc-100">{fmt(last30)}</p>
          <p className="text-xs text-zinc-500">{ruedas30} ruedas</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Última rueda · {latest.date}</p>
          <p className="text-2xl font-bold text-zinc-100">{fmt(latest.volume || 0)}</p>
          <p className="text-xs text-zinc-500">cabezas</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-600">
        Cabezas operadas en el Mercado Agroganadero de Cañuelas — el mercado concentrador de referencia
        (~12% del total nacional). Actualizado cada día hábil con nuestro relevamiento. No es la faena
        nacional (ver arriba), es la actividad del mercado de referencia.
      </p>
    </div>
  )
}
