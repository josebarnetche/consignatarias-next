import type { CSSProperties } from 'react'

/* ================================================================== */
/*  Skeleton — loading states (DESIGN-SYSTEM.md §5)                    */
/*  Reusa el sweep `.terminal-skeleton` (globals.css). REGLA DURA:     */
/*  jamás esconde contenido server-rendered/Organic — solo cubre lo    */
/*  client-side async (perfiles que cargan Supabase, follow state,     */
/*  reseñas, charts). CLS cero: alturas fijas por rampa.               */
/*  Degrada limpio con prefers-reduced-motion (bloque estático).       */
/* ================================================================== */

interface SkeletonProps {
  /** Ancho (clase Tailwind ej. "w-24" o CSS ej. "60%"). Default "100%". */
  width?: string
  /** Alto (CSS ej. "0.75rem"). Default "0.75rem" (línea de dato). */
  height?: string
  /** Forma redonda (avatares / dots). */
  circle?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Bloque base de carga. Una barra que late con el sweep del tema.
 *
 *   <Skeleton width="w-24" height="0.875rem" />
 *   <Skeleton circle width="2rem" height="2rem" />
 */
export default function Skeleton({
  width = '100%',
  height = '0.75rem',
  circle = false,
  className = '',
  style,
}: SkeletonProps) {
  // Si `width` parece una clase Tailwind (empieza con w-) la pasamos a className;
  // si no, va inline. Esto deja usar ambas formas sin pelearse con Tailwind.
  const isWidthClass = width.startsWith('w-')
  return (
    <span
      aria-hidden
      className={`terminal-skeleton inline-block align-middle ${
        circle ? 'rounded-full' : ''
      } ${isWidthClass ? width : ''} ${className}`.trim()}
      style={{
        height,
        ...(isWidthClass ? {} : { width }),
        ...style,
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonText — N líneas de texto (última más corta).               */
/* ------------------------------------------------------------------ */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.75rem"
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonStat — placeholder de un bloque <Stat> (label + número).   */
/*  Misma altura que el Stat real → no hay salto al resolver.          */
/* ------------------------------------------------------------------ */
export function SkeletonStat({
  center = false,
  className = '',
}: {
  center?: boolean
  className?: string
}) {
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`.trim()} aria-hidden>
      <Skeleton width="w-16" height="0.6875rem" className="mb-2" />
      <div className={`flex items-baseline gap-2 ${center ? 'justify-center' : ''}`.trim()}>
        <Skeleton width="w-28" height="1.5rem" />
        <Skeleton width="w-10" height="0.8125rem" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonTable — N filas × M columnas dentro de `.terminal-table`.   */
/*  Para usar suelto (la DataTable ya tiene su propio `loading`).       */
/* ------------------------------------------------------------------ */
export function SkeletonTable({
  rows = 6,
  cols = 4,
  className = '',
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={`overflow-x-auto ${className}`.trim()} aria-hidden>
      <table className="terminal-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className={c > 0 ? 'num' : ''}>
                  <Skeleton width={c === 0 ? 'w-32' : 'w-12'} height="0.75rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonCard — panel terminal con header + cuerpo de líneas.       */
/* ------------------------------------------------------------------ */
export function SkeletonCard({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`terminal-panel ${className}`.trim()} aria-hidden>
      <div className="terminal-panel-header">
        <Skeleton width="w-40" height="0.75rem" />
      </div>
      <div className="terminal-panel-body">
        <SkeletonText lines={lines} />
      </div>
    </div>
  )
}
