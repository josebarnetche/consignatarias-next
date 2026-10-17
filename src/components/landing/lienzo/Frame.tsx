import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Un frame del lienzo, como en Figma: el nombre arriba a la izquierda y las cuatro
 * manijas de selección que aparecen al pasar el mouse o con foco (CSS en globals.css,
 * sección LIENZO). Con `href` es un enlace a la sección del sitio que representa.
 */
export function Frame({
  nombre,
  href,
  activo = false,
  className = '',
  children,
}: {
  nombre: string
  href?: string
  activo?: boolean
  className?: string
  children: ReactNode
}) {
  const cls = `frame block rounded-xl border border-terminal-border bg-terminal-panel ${activo ? 'frame-activo' : ''} ${className}`
  const inner = (
    <>
      <span className="frame-nombre" aria-hidden="true">
        # {nombre}
      </span>
      {children}
      <span className="frame-sel" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={`${cls} focus:outline-none`}>
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

/** Cursor multijugador: flecha + etiqueta con nombre. Las posiciones del recorrido
 *  van como variables CSS (--x0..--x3 / --y0..--y3). */
export function CursorMp({
  nombre,
  tono,
  ruta,
  dur = 14,
  delay = 0,
}: {
  nombre: string
  tono: 'accent' | 'positive' | 'warning'
  ruta: [string, string][]
  dur?: number
  delay?: number
}) {
  const color = { accent: 'text-accent', positive: 'text-positive', warning: 'text-warning' }[tono]
  const tag = { accent: 'bg-accent', positive: 'bg-positive', warning: 'bg-warning' }[tono]
  const vars: Record<string, string> = { '--dur': `${dur}s`, '--delay': `${delay}s` }
  ruta.forEach(([x, y], i) => {
    vars[`--x${i}`] = x
    vars[`--y${i}`] = y
  })
  return (
    <div className="cursor-mp left-0 top-0 hidden lg:block" style={vars} aria-hidden="true">
      <svg width="18" height="20" viewBox="0 0 18 20" className={color}>
        <path d="M1 1l15 7.2-6.6 1.9L6.6 17z" fill="currentColor" stroke="rgb(var(--t-panel))" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span className={`cursor-mp-tag ${tag} text-white oscuro:text-zinc-950`}>{nombre}</span>
    </div>
  )
}
