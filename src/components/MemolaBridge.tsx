'use client'

import type { ReactNode } from 'react'
import { memolaUrl, trackMemolaClick, type MemolaPlacement } from '@/lib/analytics'

/**
 * Puente consignatarias.com.ar → memola.com.ar. Un solo componente para todos los
 * links, así la UTM (utm_campaign=puente_memola, utm_medium=<placement>) y el evento
 * `memola_click` salen iguales en todas partes.
 *
 * - `link`: envuelve `children` (texto en el cuerpo de una página).
 * - `linea`: la línea del footer.
 * - `bloque`: bloque con título, texto y CTA.
 * - `inline`: línea compacta para el primer pantallazo de las plantillas de cola larga
 *   (guías, /mercado/*, fichas de frigorífico, remates por plaza). Sin montos.
 *   El arranque NO dice «Índice … creado por MEMOLA»: el INMAG y el índice de
 *   arrendamiento los publica el Mercado Agroganadero; MEMOLA hace la plataforma.
 *
 * Sin `noreferrer`: así memola.com.ar ve el referrer además de la UTM.
 */
export function MemolaBridge({
  placement,
  variant = 'link',
  children,
  titulo,
  lead = 'Plataforma creada y operada por',
  cta = 'Conocé MEMOLA →',
  className = '',
}: {
  placement: MemolaPlacement
  variant?: 'link' | 'linea' | 'bloque' | 'inline'
  children?: ReactNode
  titulo?: string
  lead?: string
  cta?: string
  className?: string
}) {
  const href = memolaUrl(placement)
  const onClick = () => trackMemolaClick(placement)

  if (variant === 'linea') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        onClick={onClick}
        data-memola-placement={placement}
        className={`text-zinc-300 hover:text-accent motion-hover ${className}`}
      >
        Plataforma creada y operada por <span className="font-medium text-ink">MEMOLA</span>
        <span className="text-zinc-500"> · datos y marketing para el agro →</span>
      </a>
    )
  }

  if (variant === 'inline') {
    return (
      <p className={`text-xs leading-relaxed text-zinc-500 ${className}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          onClick={onClick}
          data-memola-placement={placement}
          className="hover:text-accent motion-hover"
        >
          {lead} <span className="font-medium text-zinc-300">MEMOLA</span>, datos y marketing para el agro{' '}
          <span className="text-accent">→</span>
        </a>
      </p>
    )
  }

  if (variant === 'bloque') {
    return (
      <div
        className={`rounded-xl border border-terminal-border bg-terminal-panel/60 p-5 ${className}`}
        data-memola-placement={placement}
      >
        {titulo && <h2 className="text-zinc-100 text-lg font-medium mb-2">{titulo}</h2>}
        <div className="text-zinc-400 text-sm leading-relaxed mb-4">{children}</div>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          onClick={onClick}
          className="terminal-btn inline-block text-accent"
        >
          {cta}
        </a>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={onClick}
      data-memola-placement={placement}
      className={`text-accent hover:underline ${className}`}
    >
      {children}
    </a>
  )
}

export default MemolaBridge
