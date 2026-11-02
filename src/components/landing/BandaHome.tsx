import Link from 'next/link'

function fmt(n: number, d = 0) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export interface FilaBandaHome {
  etiqueta: string
  p10: number
  mediana: number
  p90: number
  amplitudPct: number
  lotes: number
}

/**
 * La Banda Consignatarias en corto, para la portada: dos o tres categorías con el
 * rango P10–P90 y la mediana, sobre una misma escala para que se vea cuál se abre
 * más. Los datos los arma `bandaSemanal()` con el JSON del VR (sin query). Sin
 * filas no se dibuja nada: un bloque vacío arriba del pliegue es peor que ninguno.
 */
export default function BandaHome({ filas, fecha }: { filas: FilaBandaHome[]; fecha: string }) {
  if (filas.length === 0) return null
  const min = Math.min(...filas.map((f) => f.p10))
  const max = Math.max(...filas.map((f) => f.p90))
  const span = max - min || 1
  const pos = (v: number) => `${(((v - min) / span) * 100).toFixed(1)}%`
  const fechaCorta = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })

  return (
    <section id="banda" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 scroll-mt-20">
      <div className="rounded-lg border border-terminal-border bg-terminal-panel claro:shadow-panel">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Banda Consignatarias</h2>
          <p className="text-xxs text-zinc-500">Al {fechaCorta} · ventana de 30 días · $/kg vivo</p>
        </div>
        <p className="px-4 pt-3 text-xs text-zinc-400">
          Lo que cobró el 10 % que menos cobró y el 10 % que más, por la misma categoría. La raya es la mediana.
        </p>
        <ul className="divide-y divide-terminal-border px-4">
          {filas.map((f) => (
            <li key={f.etiqueta} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[8rem_1fr_11rem_4rem] sm:items-center">
              <span className="text-sm font-medium text-zinc-200">{f.etiqueta}</span>
              <span className="font-terminal text-sm tabular-nums text-zinc-200 text-right sm:order-3">
                ${fmt(f.p10)} – ${fmt(f.p90)}
              </span>
              <div className="relative col-span-2 h-2 rounded-full bg-zinc-800 sm:order-2 sm:col-span-1" aria-hidden="true">
                <span className="absolute inset-y-0 rounded-full bg-accent/40" style={{ left: pos(f.p10), width: `${(((f.p90 - f.p10) / span) * 100).toFixed(1)}%` }} />
                <span className="absolute -inset-y-0.5 w-0.5 bg-accent" style={{ left: pos(f.mediana) }} />
              </div>
              <span className="col-span-2 text-xxs text-zinc-500 sm:order-4 sm:col-span-1 sm:text-right">
                <span className="sm:hidden">Mediana ${fmt(f.mediana)} · </span>
                amplitud {fmt(f.amplitudPct, 1)} %
                <span className="sm:hidden"> · {fmt(f.lotes)} lotes</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-terminal-border px-4 py-3">
          <Link href="/banda" className="text-sm font-medium text-accent hover:text-accent-bright transition-colors">
            Ver la banda completa <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
