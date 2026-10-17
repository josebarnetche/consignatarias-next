import Link from 'next/link'
import { urlPreofertaFirma, type PreofertaFirmaPublica } from '@/lib/preofertas-firma'

/*
 * Pre-ofertas ABIERTAS que cargaron las firmas desde su panel (17-10-2026). Server
 * component que recibe la lista ya filtrada (publicada + antes del cierre): el listado
 * de El Tigre sigue en <PreofertasActivas>, que lee el registro estático.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "20-oct" desde una fecha YYYY-MM-DD, sin pasar por Date (evita el corrimiento de zona). */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}-${MESES[Number(m) - 1] ?? ''}`
}

/** "20-oct 18:00" en hora argentina, para el cierre (timestamptz). */
export function cierreCorto(iso: string): string {
  const f = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso))
  const v = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return `${v('day')}-${MESES[Number(v('month')) - 1] ?? ''} ${v('hour')}:${v('minute')}`
}

export default function PreofertasFirmaLista({ preofertas }: { preofertas: PreofertaFirmaPublica[] }) {
  if (preofertas.length === 0) return null
  return (
    <section aria-label="Pre-ofertas de consignatarias">
      <div className="grid sm:grid-cols-2 gap-3">
        {preofertas.map((p) => {
          const conVideo = p.lotes.filter((l) => l.video_url).length
          return (
            <Link
              key={p.id}
              href={urlPreofertaFirma(p.id)}
              className="group block rounded-terminal border border-terminal-border bg-zinc-900/40 hover:border-positive/50 transition-colors p-3.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-positive font-terminal text-xxs uppercase tracking-wider">Pre-oferta</span>
              </div>
              <div className="text-zinc-100 font-medium leading-snug group-hover:text-ink">{p.titulo}</div>
              <div className="text-zinc-400 text-xs mt-1">
                {p.consignataria_nombre}{p.lugar ? ` · ${p.lugar}` : ''}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xxs font-terminal text-zinc-500">
                <span className="text-zinc-300 tabular-nums">Remate {fechaCorta(p.fecha_remate)}</span>
                <span>·</span>
                <span>Cierra {cierreCorto(p.cierre)}</span>
                <span>·</span>
                <span className="text-zinc-300">
                  {p.lotes.length} {p.lotes.length === 1 ? 'lote' : 'lotes'}{conVideo > 0 ? ` · ${conVideo} con video` : ''}
                </span>
              </div>
              <div className="mt-2 text-xxs font-terminal uppercase tracking-wider text-positive group-hover:text-ink">
                Ver lotes y dejar tu oferta &rarr;
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
