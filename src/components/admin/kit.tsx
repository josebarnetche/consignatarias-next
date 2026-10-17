import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Kit visual del panel admin. Una sola manera de hacer encabezado, panel,
 * pestañas y fila de "pendiente" en todas las páginas de /admin.
 * Server-safe (sin hooks): las piezas interactivas viven en kit-client.tsx.
 *
 * Reglas (DESIGN-SYSTEM.md + tema claro): colores SOLO por token
 * (zinc-*, terminal-*, ink, positive/negative/warning/accent), nunca hex.
 */

const nf = (n: number) => n.toLocaleString('es-AR')

/** Encabezado de página: título, una línea de para qué sirve y acciones a la derecha. */
export function AdminPageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Dato chico a la derecha del título (fecha, "actualiza cada 45 s"). */
  meta?: ReactNode
}) {
  return (
    <header className="terminal-panel px-panel py-3 flex flex-wrap items-start gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-lg font-terminal text-ink leading-tight">{title}</h1>
          {meta && <span className="text-xxs text-zinc-500 font-terminal tabular-nums">{meta}</span>}
        </div>
        {description && <p className="mt-0.5 text-xxs text-zinc-500 font-terminal">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Panel con rótulo. `action` va a la derecha del rótulo (link "ver todo", botón). */
export function AdminSection({
  title,
  action,
  children,
  flush = false,
  className = '',
  id,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Sin padding interno: para tablas que llegan al borde. */
  flush?: boolean
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`terminal-panel ${className}`.trim()}>
      {title && (
        <div className="terminal-panel-header flex items-center justify-between gap-3">
          <span>{title}</span>
          {action && <span className="normal-case tracking-normal">{action}</span>}
        </div>
      )}
      <div className={flush ? '' : 'terminal-panel-body'}>{children}</div>
    </section>
  )
}

export interface AdminTab {
  key: string
  label: string
  count?: number | null
  href?: string
}

/**
 * Pestañas de filtro con contador. Si los tabs traen `href` son links
 * (filtro por URL, server); si no, `onSelect` lo maneja el cliente vía
 * <AdminTabsClient>.
 */
export function AdminTabsLinks({ tabs, active }: { tabs: AdminTab[]; active: string }) {
  return (
    <div role="tablist" className="terminal-panel px-panel flex flex-wrap gap-x-4 border-b border-terminal-border">
      {tabs.map((t) => (
        <Link
          key={t.key}
          role="tab"
          aria-selected={t.key === active}
          href={t.href ?? '#'}
          className={tabClass(t.key === active)}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 tabular-nums text-zinc-500">{nf(t.count)}</span>}
        </Link>
      ))}
    </div>
  )
}

export function tabClass(active: boolean) {
  return `py-2 -mb-px border-b-2 text-xxs font-terminal uppercase tracking-wider transition-colors ${
    active ? 'border-accent text-ink' : 'border-transparent text-zinc-500 hover:text-zinc-300'
  }`
}

/** Fila de KPIs: misma grilla de 1px en todas las páginas. */
export function KpiRow({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6 }) {
  const grid = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }[cols]
  // En 2 columnas (móvil), una última celda impar ocupa la fila entera en vez de quedar sola a la izquierda.
  return (
    <div className={`grid grid-cols-2 ${grid} gap-px [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1`}>
      {children}
    </div>
  )
}

export function KpiCell({ children }: { children: ReactNode }) {
  return <div className="terminal-panel px-panel py-3">{children}</div>
}

/**
 * Ítem de la bandeja "Hoy": qué hay que hacer, cuántos, y adónde ir.
 * `count === null` = la consulta falló ("s/d"), nunca un 0 inventado.
 */
export function TodoRow({
  href,
  label,
  hint,
  count,
  tone = 'accent',
}: {
  href: string
  label: string
  hint?: string
  count: number | null
  tone?: 'accent' | 'negative' | 'warning'
}) {
  const clear = count === 0
  const TONE = { accent: 'text-accent', negative: 'text-negative', warning: 'text-warning' } as const
  const color = count == null || clear ? 'text-zinc-500' : TONE[tone]
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-panel py-2.5 border-b border-terminal-border last:border-b-0 hover:bg-zinc-800/20 transition-colors"
    >
      <span className={`w-10 text-right text-lg font-terminal tabular-nums ${color}`}>
        {count == null ? 's/d' : clear ? '✓' : nf(count)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-data font-terminal ${clear ? 'text-zinc-500' : 'text-ink'}`}>{label}</span>
        {hint && <span className="block text-xxs text-zinc-500 font-terminal truncate">{hint}</span>}
      </span>
      <span className="text-zinc-500 group-hover:text-accent font-terminal" aria-hidden>
        →
      </span>
    </Link>
  )
}

/** Vacío útil: dice qué significa que no haya nada, no solo "sin datos". */
export function AdminEmpty({ children }: { children: ReactNode }) {
  return <div className="px-panel py-8 text-center text-data text-zinc-500 font-terminal">{children}</div>
}
