import { Send } from 'lucide-react'
import type { ResumenDistribucion } from '@/lib/promotion'

/**
 * "A cuántos les llegó" — el bloque de distribución del panel.
 *
 * Es la respuesta literal a la pregunta que una consignataria hace en la primera
 * reunión. Hasta que existió `promotion_campaigns`, "distribución" era una palabra
 * sin respaldo: el newsletter salía y no quedaba registro de quién había aparecido.
 *
 * El número que se muestra son envíos EXITOSOS, no el tamaño de la lista — es un
 * número que la firma puede auditar.
 *
 * Los clics no se muestran: todavía no hay tracking por link y un cero ahí se lee
 * como "nadie te abrió el mail", que no es lo que el dato dice.
 */

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function Distribucion({ dist }: { dist: ResumenDistribucion }) {
  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Send className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          A cuántos les llegó · últimos 30 días
        </h3>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-terminal tabular-nums font-bold text-zinc-100">
          {dist.alcance.toLocaleString('es-AR')}
        </span>
        <span className="text-xs font-terminal text-zinc-500">
          envíos con tus remates, en {dist.campanas} {dist.campanas === 1 ? 'salida' : 'salidas'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {dist.porCanal.map((c) => (
          <span key={c.canal} className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
            {c.label} · {c.alcance.toLocaleString('es-AR')}
          </span>
        ))}
      </div>

      {dist.ultimas.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-terminal-border pt-3">
          {dist.ultimas.map((u, i) => (
            <li key={`${u.fecha}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-xs text-zinc-400">
              <span className="font-terminal text-zinc-600">{fmtFecha(u.fecha)}</span>
              <span className="text-zinc-300">{u.remateTitle ?? u.label}</span>
              <span className="text-zinc-600">
                — {u.label}, {u.destinatarios.toLocaleString('es-AR')} destinatarios
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Contamos los envíos que salieron de verdad, no el tamaño de la lista. Si un envío
        falla, no se cuenta.
      </p>
    </div>
  )
}
