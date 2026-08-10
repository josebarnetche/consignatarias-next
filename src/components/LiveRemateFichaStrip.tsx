'use client'

/**
 * <LiveRemateFichaStrip slug /> — el remate en vivo, EN LA FICHA de la firma.
 *
 * Mismo contrato que <LiveRemateTicker /> (pollea /api/live-remate cada 8s,
 * no renderiza nada sin sesión activa), con un filtro extra: solo aparece si
 * la sesión activa pertenece a ESTA consignataria (session.consignatariaSlug).
 * Así la ficha de cada firma muestra sus promedios corrientes mientras su
 * remate ocurre, y las demás fichas no se enteran.
 *
 * El precio es transcripción automática del cantaleo: SIEMPRE rotulado
 * "lectura automática · preliminar", nunca precio oficial.
 */
import { useEffect, useState } from 'react'

interface Lot { categoria: string; precio: number; unidad?: 'kg' | 'cabeza'; cabezas: number | null; at: string }
interface CatAvg { categoria: string; unidad?: 'kg' | 'cabeza'; n: number; mediana: number }
const porUnidad = (u?: string) => (u === 'cabeza' ? '/cab' : '/kg')
interface Payload {
  active: boolean
  session: { id: string; consignataria: string | null; consignatariaSlug: string | null; youtubeUrl: string | null; location: string | null; staleSec: number } | null
  current: Lot | null
  recent: Lot[]
  averages: CatAvg[]
  transcript?: { texto: string; at: string }[]
}

const ars = (n: number) => '$' + n.toLocaleString('es-AR')

/** youtube.com/watch?v=X · youtu.be/X · youtube.com/live/X → id embebible */
function youtubeEmbedId(url: string | null): string | null {
  if (!url) return null
  return url.match(/(?:v=|youtu\.be\/|\/live\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}

export default function LiveRemateFichaStrip({ slug }: { slug: string }) {
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

  if (!data?.active || !data.session || data.session.consignatariaSlug !== slug) return null

  const embedId = youtubeEmbedId(data.session.youtubeUrl)

  return (
    <div className="max-w-6xl mx-auto px-4">
      <section className="rounded-xl border border-sky-500/30 bg-zinc-950/60 p-4 my-4">
        <header className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-red-400">Remate en vivo</span>
          {data.session.location && (
            <span className="text-sm text-zinc-300">{data.session.location}</span>
          )}
          <span className="ml-auto text-[10px] font-mono text-zinc-500">
            lectura automática · preliminar
          </span>
        </header>

        <div className={embedId ? 'grid gap-4 lg:grid-cols-2' : ''}>
          {/* La transmisión de la firma, embebida: el productor mira el remate
              y los precios preliminares en la misma pantalla. */}
          {embedId && (
            <div className="relative w-full overflow-hidden rounded-lg border border-zinc-800" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${embedId}?autoplay=0`}
                title="Transmisión del remate"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div>
            {data.current && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Último lote</div>
                <div className="text-lg text-zinc-100">
                  <span className="font-semibold text-accent">{data.current.categoria}</span>
                  {' · '}
                  <span className="font-mono">{ars(data.current.precio)}{porUnidad(data.current.unidad)}</span>
                </div>
              </div>
            )}

            {data.averages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {data.averages.map((a) => (
                  <div key={a.categoria} className="rounded-lg bg-zinc-900/70 border border-zinc-800 px-3 py-2">
                    <div className="text-[11px] text-zinc-400">{a.categoria}</div>
                    <div className="font-mono text-zinc-100">{ars(a.mediana)}<span className="text-zinc-500 text-xs">{porUnidad(a.unidad)}</span></div>
                    <div className="text-[10px] text-zinc-600">{a.n} lote{a.n !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {data.transcript && data.transcript.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Cantaleo en vivo · transcripción automática
            </div>
            <div className="rounded-lg bg-zinc-900/70 border border-zinc-800 px-3 py-2 max-h-32 overflow-y-auto flex flex-col-reverse">
              <div className="text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">
                {data.transcript.map((t, i) => (
                  <span key={i}>
                    {t.texto}
                    {i < data.transcript!.length - 1 ? ' · ' : ''}
                  </span>
                ))}
                <span className="inline-block w-2 h-3 bg-red-500/70 animate-pulse ml-1 align-middle" />
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 text-[10px] text-zinc-600 leading-snug">
          Promedios y texto transcriptos automáticamente del audio del remate (lectura
          preliminar, no oficial). El promedio oficial lo publica la consignataria al cierre.
        </p>
      </section>
    </div>
  )
}
