'use client'

/**
 * <LiveRemateTicker /> — ticker de remate EN VIVO.
 *
 * Pollea /api/live-remate cada 8s. Si no hay sesión activa, no renderiza nada
 * (seguro de montar siempre en /remates/en-vivo). Cuando hay vivo, muestra:
 * banner "lectura automática preliminar", lote actual, feed reciente y promedios
 * corrientes por categoría.
 *
 * El precio es transcripción automática del cantaleo (~3% en categorías limpias):
 * se rotula SIEMPRE como preliminar, nunca como precio oficial.
 */
import { useEffect, useState } from 'react'

interface Lot { categoria: string; precio: number; unidad?: 'kg' | 'cabeza'; cabezas: number | null; at: string }
interface CatAvg { categoria: string; unidad?: 'kg' | 'cabeza'; n: number; mediana: number }
const porUnidad = (u?: string) => (u === 'cabeza' ? '/cab' : '/kg')
interface Payload {
  active: boolean
  session: { id: string; consignataria: string | null; location: string | null; staleSec: number } | null
  current: Lot | null
  recent: Lot[]
  averages: CatAvg[]
}

const ars = (n: number) => '$' + n.toLocaleString('es-AR')

export default function LiveRemateTicker() {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let on = true
    const tick = async () => {
      try {
        const r = await fetch('/api/live-remate', { cache: 'no-store' })
        const j = (await r.json()) as Payload
        if (on) setData(j)
      } catch { /* soft-fail */ }
    }
    tick()
    const id = setInterval(tick, 8000)
    return () => { on = false; clearInterval(id) }
  }, [])

  if (!data?.active || !data.session) return null

  return (
    <section className="rounded-xl border border-sky-500/30 bg-zinc-950/60 p-4 my-4">
      <header className="flex items-center gap-2 mb-3">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-mono uppercase tracking-wider text-red-400">En vivo</span>
        <span className="text-sm text-zinc-300">
          {data.session.consignataria ?? 'Remate'} {data.session.location ? `· ${data.session.location}` : ''}
        </span>
        <span className="ml-auto text-[10px] font-mono text-zinc-500">
          lectura automática · preliminar
        </span>
      </header>

      {data.current && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Lote actual</div>
          <div className="text-lg text-zinc-100">
            <span className="font-semibold text-accent">{data.current.categoria}</span>
            {' · '}
            <span className="font-mono">{ars(data.current.precio)}{porUnidad(data.current.unidad)}</span>
            {data.current.cabezas ? <span className="text-zinc-400 text-sm"> · {data.current.cabezas} cab.</span> : null}
          </div>
        </div>
      )}

      {data.averages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {data.averages.map((a) => (
            <div key={a.categoria} className="rounded-lg bg-zinc-900/70 border border-zinc-800 px-3 py-2">
              <div className="text-[11px] text-zinc-400">{a.categoria}</div>
              <div className="font-mono text-zinc-100">{ars(a.mediana)}<span className="text-zinc-500 text-xs">{porUnidad(a.unidad)}</span></div>
              <div className="text-[10px] text-zinc-600">{a.n} lote{a.n !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {data.recent.length > 1 && (
        <div className="text-xs font-mono text-zinc-500 max-h-24 overflow-y-auto">
          {data.recent.slice(1).map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-accent/70 w-32 shrink-0 truncate">{l.categoria}</span>
              <span className="text-zinc-300">{ars(l.precio)}{porUnidad(l.unidad)}</span>
              {l.cabezas ? <span className="text-zinc-600">{l.cabezas} cab.</span> : null}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-zinc-600 leading-snug">
        Precios transcriptos automáticamente del audio del remate (lectura preliminar, no oficial).
        El promedio oficial lo publica la consignataria al cierre.
      </p>
    </section>
  )
}
