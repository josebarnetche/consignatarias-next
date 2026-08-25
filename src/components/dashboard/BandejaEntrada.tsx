'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Bandeja, EntradaBandeja, TipoEntrada, Urgencia } from '@/lib/reports/bandeja'

/**
 * La bandeja de entrada de la casa: qué hay que atender hoy, en una sola lista.
 *
 * Es lo primero del panel a propósito. Antes la información estaba repartida en cinco
 * bloques y la conclusión la tenía que armar la firma; acá ya viene armada y ordenada
 * por lo que está en juego.
 *
 * ICONOGRAFÍA: se usan los íconos de marca de `public/marca/iconos-color/` en chip
 * hueso, que es la doctrina del manual — no emojis ni una librería suelta, para que el
 * panel se vea del mismo universo que el resto del sitio.
 */

/** Ícono de marca por tipo de entrada. Todos existen en `public/marca/iconos-color/`. */
const ICONO: Record<TipoEntrada, string> = {
  lead: 'buscador-lupa.png',
  cliente_fuga: 'alerta.png',
  cliente_ganado: 'casa-remates.png',
  precio_bajo: 'bascula.png',
  precio_alto: 'dolar-billete.png',
  cuota: 'indice.png',
  remate: 'martillo.png',
  perfil: 'guia-dte.png',
}

const URGENCIA_ESTILO: Record<Urgencia, { borde: string; punto: string; label: string }> = {
  urgente: { borde: 'border-l-negative', punto: 'bg-negative', label: 'Urgente' },
  atencion: { borde: 'border-l-amber-400', punto: 'bg-amber-400', label: 'Atención' },
  buena: { borde: 'border-l-positive', punto: 'bg-positive', label: 'Buena' },
  info: { borde: 'border-l-zinc-600', punto: 'bg-zinc-600', label: 'Agenda' },
}

function Fila({ e }: { e: EntradaBandeja }) {
  const est = URGENCIA_ESTILO[e.urgencia]

  const cuerpo = (
    <>
      <span
        className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center rounded bg-zinc-100"
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/marca/iconos-color/${ICONO[e.tipo]}`} alt="" className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm font-medium leading-snug text-zinc-100">{e.titulo}</span>
          {e.dato && (
            <span className="shrink-0 font-terminal tabular-nums text-xs text-zinc-400">{e.dato}</span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{e.detalle}</span>
        {e.accion && (
          <span className="mt-1 inline-block text-xxs font-terminal text-accent">{e.accion} →</span>
        )}
      </span>
    </>
  )

  const clases = `flex items-start gap-3 border-l-2 ${est.borde} bg-zinc-900/40 px-3 py-2.5 transition-colors`

  return e.href ? (
    <Link href={e.href} className={`${clases} hover:bg-zinc-800/50`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clases}>{cuerpo}</div>
  )
}

export default function BandejaEntrada({ b }: { b: Bandeja }) {
  const [verTodo, setVerTodo] = useState(false)
  const MOSTRAR = 6
  const visibles = verTodo ? b.entradas : b.entradas.slice(0, MOSTRAR)

  if (b.entradas.length === 0) {
    return (
      <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-100" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/campana.png" alt="" className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">Bandeja</h3>
        </div>
        <p className="text-xs text-zinc-500">
          No hay nada para atender. Ni consultas sin responder, ni clientes que se estén
          yendo, ni precios por debajo del mercado.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4 overflow-hidden rounded-terminal border border-terminal-border bg-terminal-bg/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-100" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/campana.png" alt="" className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-200">
            Bandeja de entrada
          </h3>
          {b.urgentes > 0 && (
            <span className="rounded-full bg-negative px-2 py-0.5 font-terminal text-[10px] font-bold text-white">
              {b.urgentes}
            </span>
          )}
        </div>

        {b.cabezasEnRiesgo > 0 && (
          <span className="font-terminal text-xxs text-zinc-500">
            <span className="text-negative">{b.cabezasEnRiesgo.toLocaleString('es-AR')} cabezas</span>{' '}
            en clientes que se están yendo
          </span>
        )}
      </div>

      <div className="divide-y divide-terminal-border">
        {visibles.map((e) => <Fila key={e.id} e={e} />)}
      </div>

      {b.entradas.length > MOSTRAR && (
        <button
          onClick={() => setVerTodo((v) => !v)}
          className="w-full border-t border-terminal-border px-4 py-2 text-xxs font-terminal text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
        >
          {verTodo ? 'Mostrar menos' : `Ver las ${b.entradas.length} novedades`}
        </button>
      )}
    </div>
  )
}
