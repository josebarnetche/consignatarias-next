import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Piezas del panel de la firma con el lenguaje de la landing (19-10-2026): cada
 * bloque es un frame del lienzo, con su nombre arriba a la izquierda y las manijas
 * de selección al pasar el mouse (CSS LIENZO en globals.css). El nombre queda
 * FUERA de la caja (top: -1.45rem), así que las grillas que los contienen dejan
 * al menos gap-y-10 entre filas.
 *
 * Nada de acá trae datos de ejemplo: un número es real o es cero.
 */

export function Marco({
  nombre,
  titulo,
  accion,
  activo = false,
  className = '',
  cuerpo = 'p-5',
  incrustado = false,
  children,
}: {
  nombre: string
  titulo?: ReactNode
  accion?: ReactNode
  activo?: boolean
  className?: string
  /** Padding del contenido. 'p-0' para listas que van de borde a borde. */
  cuerpo?: string
  /** El contenido es un bloque que ya trae su propia caja y su título (los del
   *  reporte): se le saca el borde y el fondo para que no quede una caja adentro
   *  de otra. */
  incrustado?: boolean
  children: ReactNode
}) {
  const clsCuerpo = incrustado
    ? 'p-1 [&>*]:!m-0 [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none'
    : cuerpo
  return (
    <section className={`frame rounded-xl border border-terminal-border bg-terminal-panel ${activo ? 'frame-activo' : ''} ${className}`}>
      <span className="frame-nombre" aria-hidden="true">
        # {nombre}
      </span>
      {(titulo || accion) && (
        <header className="flex items-start justify-between gap-3 border-b border-terminal-border px-5 py-3.5">
          {titulo ? <h3 className="text-sm font-semibold text-ink">{titulo}</h3> : <span />}
          {accion && <div className="shrink-0 text-xs">{accion}</div>}
        </header>
      )}
      <div className={clsCuerpo}>{children}</div>
      <span className="frame-sel" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </section>
  )
}

export const fmt = (n: number) => n.toLocaleString('es-AR')

/** Un indicador: etiqueta, número y, si hay con qué comparar, el cambio. */
export function Kpi({
  etiqueta,
  valor,
  detalle,
  cambio,
  onClick,
}: {
  etiqueta: string
  valor: number | string
  detalle?: ReactNode
  /** Diferencia contra el período anterior (positivo = subió). */
  cambio?: { delta: number; leyenda?: string } | null
  onClick?: () => void
}) {
  const contenido = (
    <>
      <span className="block text-xxs text-zinc-500">{etiqueta}</span>
      <span className="mt-1.5 block text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
        {typeof valor === 'number' ? fmt(valor) : valor}
      </span>
      {cambio && cambio.delta !== 0 ? (
        <span className={`mt-2 block text-xxs tabular-nums ${cambio.delta > 0 ? 'text-positive' : 'text-negative'}`}>
          {cambio.delta > 0 ? '▲' : '▼'} {fmt(Math.abs(cambio.delta))} {cambio.leyenda ?? 'vs el mes anterior'}
        </span>
      ) : detalle ? (
        <span className="mt-2 block text-xxs text-zinc-500">{detalle}</span>
      ) : null}
    </>
  )
  const cls = 'block min-w-0 px-5 py-4 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors hover:bg-accent/[0.04]`}>
      {contenido}
    </button>
  ) : (
    <div className={cls}>{contenido}</div>
  )
}

/** Estado vacío: dice qué va a aparecer acá y cómo llega, con una acción si la hay. */
export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-zinc-700 px-5 py-6">
      <div className="lienzo-puntos absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        {texto && <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">{texto}</p>}
        {accion && <div className="mt-4">{accion}</div>}
      </div>
    </div>
  )
}

/** Lo que trae PRO, dicho sin datos de ejemplo: qué es y cómo activarlo. */
export function SoloPro({ titulo, beneficio, desde = 'panel' }: { titulo: string; beneficio: string; desde?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-accent/[0.04] px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="rounded-sm border border-accent/50 px-1.5 py-0.5 text-[0.625rem] font-bold text-accent">★ PRO</span>
        <p className="text-sm font-semibold text-ink">{titulo}</p>
      </div>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-zinc-400">{beneficio}</p>
      <Link
        href={`/planes?audience=consignataria&from=${desde}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white oscuro:text-zinc-950 transition-colors hover:bg-accent-bright"
      >
        Activar PRO · ARS 45.000/mes <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

export function BotonPrimario({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    'inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white oscuro:text-zinc-950 transition-colors hover:bg-accent-bright'
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

export function BotonSecundario({
  children,
  onClick,
  href,
  externo = false,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  externo?: boolean
}) {
  const cls =
    'inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-accent hover:text-accent'
  if (href && externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
