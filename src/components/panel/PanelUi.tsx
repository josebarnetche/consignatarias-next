'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Piezas del panel de la firma (v2, 18-10-2026). Diseño de producto moderno: tarjetas
 * limpias, mucho aire, una sola acción fuerte por bloque. Quien lo usa no es técnico y
 * no quiere llenar formularios: cada bloque dice qué es en una línea y ofrece el botón.
 *
 * Nada de acá trae datos de ejemplo: un número es real o es cero.
 */

export function Tarjeta({
  titulo,
  bajada,
  accion,
  className = '',
  cuerpo = 'p-5 sm:p-6',
  incrustado = false,
  children,
}: {
  titulo?: ReactNode
  bajada?: ReactNode
  accion?: ReactNode
  className?: string
  /** Padding del contenido. 'p-0' para listas que van de borde a borde. */
  cuerpo?: string
  /** El contenido ya trae su propia caja (bloques del reporte): se le saca. */
  incrustado?: boolean
  children: ReactNode
}) {
  const clsCuerpo = incrustado
    ? 'p-1 [&>*]:!m-0 [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none'
    : cuerpo
  return (
    <section className={`rounded-2xl border border-terminal-border bg-terminal-panel shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.08)] ${className}`}>
      {(titulo || accion) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            {titulo && <h3 className="text-base font-semibold tracking-tight text-ink">{titulo}</h3>}
            {bajada && <p className="mt-0.5 text-sm text-zinc-500">{bajada}</p>}
          </div>
          {accion && <div className="shrink-0 text-sm">{accion}</div>}
        </header>
      )}
      <div className={clsCuerpo}>{children}</div>
    </section>
  )
}

export const fmt = (n: number) => n.toLocaleString('es-AR')

/** Un número grande con su etiqueta. Sin cajas: va dentro de una tarjeta. */
export function Numero({
  etiqueta,
  valor,
  detalle,
  tono = 'ink',
}: {
  etiqueta: string
  valor: number | string
  detalle?: ReactNode
  tono?: 'ink' | 'accent' | 'positive'
}) {
  const color = { ink: 'text-ink', accent: 'text-accent', positive: 'text-positive' }[tono]
  return (
    <div className="min-w-0">
      <p className="text-sm text-zinc-500">{etiqueta}</p>
      <p className={`mt-1 text-3xl font-semibold leading-none tracking-tight tabular-nums ${color}`}>
        {typeof valor === 'number' ? fmt(valor) : valor}
      </p>
      {detalle && <p className="mt-1.5 text-xs text-zinc-500">{detalle}</p>}
    </div>
  )
}

/** Estado vacío: qué va a aparecer acá y cómo llega, con una acción si la hay. */
export function Vacio({ titulo, texto, accion, icono }: { titulo: string; texto?: ReactNode; accion?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl bg-zinc-800/40 px-5 py-6 sm:flex-row sm:items-center">
      {icono && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">{icono}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        {texto && <p className="mt-0.5 max-w-lg text-sm text-zinc-500">{texto}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}

/** Lo que trae PRO, dicho sin datos de ejemplo: qué es y cómo activarlo. */
export function SoloPro({ titulo, beneficio, desde = 'panel' }: { titulo: string; beneficio: string; desde?: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-accent/[0.08] to-transparent px-5 py-5 ring-1 ring-inset ring-accent/20">
      <p className="text-xs font-semibold text-accent">★ PRO</p>
      <p className="mt-1 text-base font-semibold text-ink">{titulo}</p>
      <p className="mt-1 max-w-lg text-sm text-zinc-400">{beneficio}</p>
      <Link
        href={`/planes?audience=consignataria&from=${desde}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white oscuro:text-zinc-950 transition-colors hover:bg-accent-bright"
      >
        Activar PRO <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

const BASE_BOTON = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50'

export function BotonPrimario({ children, onClick, href, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  const cls = `${BASE_BOTON} bg-accent text-white oscuro:text-zinc-950 hover:bg-accent-bright`
  return href ? (
    <Link href={href} className={cls}>{children}</Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>
  )
}

export function BotonSecundario({
  children,
  onClick,
  href,
  externo = false,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  externo?: boolean
  disabled?: boolean
}) {
  const cls = `${BASE_BOTON} bg-zinc-800/70 font-medium text-ink hover:bg-zinc-700/70`
  if (href && externo) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
  }
  return href ? (
    <Link href={href} className={cls}>{children}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>{children}</button>
  )
}

/**
 * Hoja lateral: lo que antes era un formulario en el medio de la página ahora se abre
 * al costado (abajo en el celular), con el resto del panel quieto detrás. Escape cierra.
 */
export function Hoja({ abierta, titulo, bajada, onCerrar, children }: { abierta: boolean; titulo: string; bajada?: ReactNode; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflow
    }
  }, [abierta, onCerrar])
  // Va al <body>: adentro del panel hay contenedores con transform (la transición de
  // sección) y un `fixed` ahí adentro se posiciona contra ellos, no contra la pantalla.
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  if (!abierta || !montado) return null
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-terminal-panel shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(560px,100vw)] sm:rounded-none sm:rounded-l-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-terminal-border px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{titulo}</h2>
            {bajada && <p className="mt-0.5 text-sm text-zinc-500">{bajada}</p>}
          </div>
          <button type="button" onClick={onCerrar} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700" aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Fecha en bloque (mes arriba, día grande), para listas de remates. */
export function BloqueFecha({ fecha }: { fecha: string }) {
  const d = new Date(fecha + 'T12:00:00')
  return (
    <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-zinc-800/60 py-2 text-center leading-none">
      <span className="text-[0.6875rem] font-medium uppercase text-accent">{d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
      <span className="mt-1 text-xl font-semibold tabular-nums text-ink">{d.getDate()}</span>
      <span className="mt-0.5 text-[0.625rem] text-zinc-500">{d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</span>
    </span>
  )
}
