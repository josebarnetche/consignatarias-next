'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { memolaUrl, trackMemolaBlockView, trackMemolaClick, type MemolaPlacement } from '@/lib/analytics'

/**
 * `memola_block_view`: una vez por bloque y por página vista, cuando el bloque queda
 * ≥50 % visible durante ≥1 s. Solo cliente (no toca el SSR ni el markup); no-op si el
 * navegador no tiene IntersectionObserver. El pathname reinicia el conteo en navegación
 * SPA (el footer no se desmonta entre páginas).
 */
function useMemolaBlockView(el: HTMLElement | null, placement: MemolaPlacement) {
  const pathname = usePathname()
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)
        if (visible && !timer) {
          timer = setTimeout(() => {
            trackMemolaBlockView({ placement, page_path: pathname })
            io.disconnect()
          }, 1000)
        } else if (!visible && timer) {
          clearTimeout(timer)
          timer = undefined
        }
      },
      { threshold: [0, 0.5] },
    )
    io.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      io.disconnect()
    }
  }, [el, placement, pathname])
}

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
  const [el, setEl] = useState<HTMLElement | null>(null)
  useMemolaBlockView(el, placement)

  if (variant === 'linea') {
    return (
      <a
        ref={setEl}
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
      <p ref={setEl} className={`text-xs leading-relaxed text-zinc-500 ${className}`}>
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
        ref={setEl}
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
      ref={setEl}
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
