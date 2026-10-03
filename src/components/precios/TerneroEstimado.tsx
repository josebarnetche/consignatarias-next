import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import { getCity, nombrePropio, provinciaNombre } from '@/lib/ui/tokens'
import { fechaCorta, remateAnchor, remateHref } from '@/lib/remates-enlaces'

/**
 * El precio del ternero que publicamos NO es observado: el scraper lo calcula
 * como INMAG × 1,10 (scripts/scrape-auctions.mjs) porque el Mercado Agroganadero
 * no opera terneros. Toda superficie que lo muestre tiene que decirlo, con el
 * mismo tono de /vr: preferimos rotularlo antes que hacerlo pasar por dato.
 */
export const TERNERO_ESTIMADO_NOTA =
  'Estimado: INMAG × 1,10. El Mercado Agroganadero no opera terneros; no es un precio observado.'

type Remate = {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string
  time: string | null
  location: string
  province: string
  type: string
  mainCategory: string
  estimatedHeads: number | null
  status: string
}

/** Próximos remates de invernada o con terneros como categoría principal. */
export function proximosRematesDeInvernada(max = 6): Remate[] {
  const hoy = new Date().toISOString().slice(0, 10)
  return (rematesData as Remate[])
    .filter((r) => r.date >= hoy && r.status === 'scheduled' && (r.type === 'invernada' || r.mainCategory === 'terneros'))
    .filter((r) => remateHref(r))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, max)
}

/** Bloque "para saber el precio real" con enlaces a las fichas de los próximos remates de invernada. */
export function RematesDeInvernada({ max = 6 }: { max?: number }) {
  const remates = proximosRematesDeInvernada(max)
  if (remates.length === 0) return null
  return (
    <section className="mb-6 terminal-panel">
      <h2 className="terminal-panel-header">Para saber el precio real: estos remates de invernada</h2>
      <p className="px-panel pt-3 text-sm text-zinc-400">
        El ternero se vende en remates de invernada y ferias de campo. Lo que se paga ahí es el precio de verdad.
      </p>
      <ul className="divide-y divide-terminal-border">
        {remates.map((r) => (
          <li key={r.id}>
            <Link
              href={remateHref(r)!}
              aria-label={remateAnchor(r)}
              className="flex items-center justify-between gap-3 px-panel py-3 hover:bg-zinc-900/50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm text-zinc-200 truncate">{nombrePropio(r.consignatariaName)}</span>
                <span className="block text-xs text-zinc-500">
                  {[nombrePropio(getCity(r.location)), provinciaNombre(r.province)].filter(Boolean).join(', ')}
                  {r.estimatedHeads ? ` · ~${r.estimatedHeads.toLocaleString('es-AR')} cabezas` : ''}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-zinc-300">
                {fechaCorta(r.date)}
                {r.time ? ` · ${r.time}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="px-panel py-3 text-sm">
        <Link href="/remates/tipo/invernada" className="text-accent hover:underline">
          Todos los remates de invernada →
        </Link>
      </p>
    </section>
  )
}
