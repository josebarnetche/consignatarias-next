import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Page title — rendered with `section-heading` (sans-serif jerarquía). */
  title: ReactNode
  /** Optional subtitle / dek under the title. */
  subtitle?: ReactNode
  /** Optional eyebrow above the title (e.g. breadcrumb slot or tag). */
  eyebrow?: ReactNode
  /** Right-aligned actions slot (buttons, DataStamp, etc). */
  actions?: ReactNode
  /** Title size class. Default `text-2xl`. */
  size?: string
  className?: string
}

/**
 * Consistent page header: eyebrow? + title (`section-heading`) + subtitle? +
 * actions slot. Estandariza el patrón hoy divergente (inmag `text-sm` vs
 * frigoríficos `text-xxs`). DESIGN-SYSTEM.md §3.6.
 *
 *   <PageHeader title="INMAG hoy" subtitle="Índice de referencia"
 *     actions={<DataStamp … />} />
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  size = 'text-2xl',
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
    >
      <div className="min-w-0">
        {eyebrow != null && (
          <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className={`section-heading ${size} font-semibold leading-tight`}>{title}</h1>
        {subtitle != null && (
          <p className="text-zinc-400 text-data mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  )
}
