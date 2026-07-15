import Link from 'next/link'
import { getActivePreofertas } from '@/lib/data/preofertas'

/* Bloque de descubrimiento: pre-ofertas ABIERTAS, clickeables. Reusable en
   overview / landing / herramientas. Server component (fechas, sin countdown
   live — la cuenta regresiva vive en la ficha y en el perfil de la consignataria). */

function fmtFecha(iso: string): string {
  const d = new Date(iso)
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dias[d.getDay()]} ${d.getDate()}-${meses[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function PreofertasActivas({ compact = false }: { compact?: boolean }) {
  const activas = getActivePreofertas(Date.now())
  if (activas.length === 0) return null

  return (
    <section aria-label="Pre-ofertas abiertas">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" aria-hidden="true" />
        <span className="text-xxs font-terminal uppercase tracking-widest text-zinc-400">
          Pre-ofertas abiertas
        </span>
        <span className="text-xxs text-zinc-600">· conocé los lotes antes del remate</span>
      </div>
      <div className={compact ? 'space-y-2' : 'grid sm:grid-cols-2 gap-3'}>
        {activas.map((p) => (
          <Link
            key={p.slug}
            href={`/preoferta/${p.slug}`}
            className="group block rounded-terminal border border-terminal-border bg-black/20 hover:border-positive/50 hover:bg-positive/[0.04] transition-colors p-3.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-positive font-terminal text-xxs uppercase tracking-wider">Pre-oferta</span>
              {p.consignataria_pro && (
                <span className="text-[10px] font-terminal uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-500/40">PRO</span>
              )}
            </div>
            <div className="text-zinc-100 font-medium leading-snug group-hover:text-white">{p.remate}</div>
            <div className="text-zinc-400 text-xs mt-1">
              {p.cabana} · {p.consignataria}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xxs font-terminal text-zinc-500">
              <span className="text-zinc-300 tabular-nums">Remate {fmtFecha(p.fecha)}</span>
              <span>·</span>
              <span>Cierra pre-oferta {fmtFecha(p.cierre_preoferta)}</span>
              <span>·</span>
              <span className="text-zinc-300">{p.lotes.length} lotes con video</span>
            </div>
            <div className="mt-2 text-xxs font-terminal uppercase tracking-wider text-positive/90 group-hover:text-positive">
              Ver lotes y pre-ofertar &rarr;
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
