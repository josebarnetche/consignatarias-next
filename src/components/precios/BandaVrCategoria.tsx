import Link from 'next/link'
import { getBandaPorSlug, vrCobertura, VR_VENTANA_DIAS } from '@/lib/vr'

/** Slug de /precios (plural) → slug de /vr (singular). Terneros no tiene: el MAG no los opera. */
export const PRECIO_A_VR: Record<string, string | undefined> = {
  novillos: 'novillo',
  novillitos: 'novillito',
  vaquillonas: 'vaquillona',
  vacas: 'vaca',
  toros: 'toro',
  terneros: undefined,
}

const fmt = (n: number) => '$' + n.toLocaleString('es-AR')

/**
 * Banda de lo que realmente se pagó (P10, mediana, P90) para la categoría, arriba
 * de las páginas de precio. Junta en la página canónica de "precio de X hoy" el
 * número del día con el rango observado, y manda a /vr y a Mi Ganado.
 * Sin banda (terneros, o una categoría sin base esta semana) lo dice y enlaza a /vr.
 */
export function BandaVrCategoria({ categoria, nombre }: { categoria: string; nombre: string }) {
  const slugVr = PRECIO_A_VR[categoria]
  const b = slugVr ? getBandaPorSlug(slugVr) : null
  const cob = vrCobertura()

  if (!b) {
    return (
      <section className="mb-6 rounded-terminal border border-terminal-border bg-terminal-panel p-4 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-ink mb-1">Lo que realmente se pagó</h2>
        <p className="text-zinc-400">
          {categoria === 'terneros'
            ? 'El Mercado Agroganadero no opera terneros, así que no tenemos lotes vendidos con los que armar un rango observado. El precio del ternero se forma en los remates de invernada.'
            : `Esta semana no hay lotes suficientes de ${nombre} para publicar un rango que el dato sostenga.`}{' '}
          <Link href="/vr" className="text-accent hover:underline">
            Ver el precio de las demás categorías, por peso →
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="mb-6 rounded-terminal border border-accent/40 bg-accent/[0.05] p-4 sm:p-5">
      <h2 className="text-base font-medium text-ink">
        A cuánto se vendió {nombre} en los últimos {VR_VENTANA_DIAS} días
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Rango de los {b.lotes.toLocaleString('es-AR')} lotes vendidos en el Mercado Agroganadero
        hasta el {cob.hasta}: el 10 % más barato, el del medio y el 10 % más caro.
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-terminal bg-terminal-border">
        <div className="bg-terminal-panel p-3">
          <dt className="text-xs text-zinc-500">Los más baratos</dt>
          <dd className="text-lg font-terminal tabular-nums text-zinc-200">{fmt(b.p10)}</dd>
        </div>
        <div className="bg-terminal-panel p-3">
          <dt className="text-xs text-zinc-500">Precio del medio</dt>
          <dd className="text-lg font-terminal tabular-nums text-ink">{fmt(b.mediana)}</dd>
        </div>
        <div className="bg-terminal-panel p-3">
          <dt className="text-xs text-zinc-500">Los más caros</dt>
          <dd className="text-lg font-terminal tabular-nums text-zinc-200">{fmt(b.p90)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-zinc-500">Pesos por kilo vivo.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/mi-ganado"
          className="inline-flex min-h-[44px] items-center justify-center rounded-terminal bg-accent px-4 text-sm font-semibold text-terminal-bg hover:bg-accent-bright transition-colors"
        >
          Valuar mi rodeo →
        </Link>
        <Link href={`/vr/${slugVr}`} className="text-sm text-accent hover:underline">
          El precio de {nombre} por peso →
        </Link>
      </div>
    </section>
  )
}
