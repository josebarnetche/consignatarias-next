import type { ReactNode } from 'react'

export type BadgeTone =
  | 'neutral' // default — borde/texto zinc
  | 'live' // tiempo real — borde/texto live
  | 'warning' // alerta / ATH — borde/texto warning + tinte
  | 'positive'
  | 'negative'
  | 'accent'
  | 'pro' // única excepción de MARCA (gradiente dorado)

interface BadgeProps {
  children: ReactNode
  /** Status tone. Default `neutral`. `pro` es la excepción de marca. */
  tone?: BadgeTone
  /** Optional leading status dot (usa `status-dot-*` del tema). */
  dot?: boolean
  className?: string
  title?: string
}

/**
 * Status badge. Consolida `terminal-tag(+live/+warning)`, `live-badge`,
 * `StatusBadge`/`CountdownBadge` inline en UNA primitiva. Envuelve las clases
 * del tema ya existentes (`terminal-tag*`) — no reinventa estilos.
 * `ProBadge` sobrevive aparte como la única excepción de marca; aquí
 * `tone='pro'` cubre el caso inline. DESIGN-SYSTEM.md §2.5.
 *
 *   <Badge tone="live" dot>EN VIVO</Badge>
 *   <Badge tone="warning">ATH</Badge>
 *   <Badge>NÚCLEO</Badge>
 */
const TONE_CLASS: Record<Exclude<BadgeTone, 'pro'>, string> = {
  neutral: 'terminal-tag',
  live: 'terminal-tag-live',
  warning: 'terminal-tag-warning',
  positive: 'terminal-tag border-positive text-positive',
  negative: 'terminal-tag border-negative text-negative',
  accent: 'terminal-tag border-accent text-accent',
}

const DOT_CLASS: Partial<Record<BadgeTone, string>> = {
  live: 'status-dot-live',
  warning: 'status-dot-warning',
  neutral: 'status-dot-offline',
}

export default function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
  title,
}: BadgeProps) {
  if (tone === 'pro') {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xxs font-terminal uppercase tracking-wider rounded-[2px] border border-amber-400/60 text-amber-300 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 ${className}`.trim()}
      >
        {children}
      </span>
    )
  }

  return (
    <span title={title} className={`${TONE_CLASS[tone]} gap-1 ${className}`.trim()}>
      {dot && <span className={DOT_CLASS[tone] ?? 'status-dot-offline'} />}
      {children}
    </span>
  )
}
