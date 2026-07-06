import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Nombre del pictograma en /marca/iconos-color/ (ej. "martillo"), o
   *  "glifo-*" para /marca/glifos-color/ (ej. "glifo-novillo"). */
  icon: string
  title: string
  sub?: string
  cta?: ReactNode
  className?: string
  /** Compacto para celdas de tabla / paneles chicos. */
  compact?: boolean
}

/**
 * EmptyState — el momento vacío con marca (patrón del 404: pictograma COLOR
 * en chip hueso). Reemplaza los "No hay…" de texto pelado.
 * Doctrina: íconos color en chip bg-zinc-100, nunca tinta plana.
 */
export default function EmptyState({ icon, title, sub, cta, className = '', compact = false }: EmptyStateProps) {
  const dir = icon.startsWith('glifo-') ? 'glifos-color' : 'iconos-color'
  return (
    <div className={`px-panel ${compact ? 'py-5' : 'py-10'} text-center ${className}`}>
      <span
        className={`inline-flex ${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-lg bg-zinc-100 items-center justify-center select-none`}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/marca/${dir}/${icon}.png`} alt="" className={compact ? 'w-6 h-6' : 'w-9 h-9'} />
      </span>
      <p className={`text-zinc-300 text-sm font-terminal ${compact ? 'mt-2' : 'mt-3'}`}>{title}</p>
      {sub && <p className="text-xxs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">{sub}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}
