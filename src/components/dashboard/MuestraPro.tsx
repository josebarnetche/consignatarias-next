'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Gate de pago de los bloques del Mercado.
 *
 * Una firma FREE tiene que **ver qué se está perdiendo** — si no, no hay nada que
 * comprar. Pero lo que ve NO puede ser su dato real tapado con un filtro.
 *
 * POR QUÉ NO SE USA BLUR SOBRE EL DATO REAL
 * `filter: blur()` es maquillaje: el nombre del remitente, las cabezas y el precio
 * siguen en el HTML y se leen desde el inspector con dos clics. Acá eso sería grave
 * por partida doble — es información de terceros (los productores que le consignan a
 * esa casa) y es exactamente el activo que se cobra. El propio PRO Product Standard
 * lo dice: si el render real filtra números PRO, va un `placeholder` no-real, no el
 * blur.
 *
 * Entonces la muestra es **contenido fabricado**, con la forma exacta del bloque real
 * y datos de ejemplo, rotulado como ejemplo para que nadie confunda un nombre
 * inventado con un cliente suyo. Se difumina apenas —para que se lea como preview y
 * no como dato— pero lo que se difumina ya es falso.
 */
export default function MuestraPro({
  children,
  muestra,
  titulo,
  beneficio,
  esPro,
}: {
  /** El bloque real. Sólo se renderiza si `esPro`. */
  children: ReactNode
  /** Preview fabricado, con la forma del bloque pero datos de ejemplo. */
  muestra: ReactNode
  titulo: string
  beneficio: string
  esPro: boolean
}) {
  if (esPro) return <>{children}</>

  return (
    <div className="mb-4 overflow-hidden rounded-terminal border border-accent/25 bg-terminal-bg/40">
      <div className="relative">
        {/* Muestra fabricada. `aria-hidden` + `select-none` porque es decorativa:
            no debe leerse en un lector de pantalla como si fuera información. */}
        <div
          className="pointer-events-none select-none opacity-40 blur-[2px]"
          aria-hidden="true"
        >
          {muestra}
        </div>

        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-terminal-bg via-terminal-bg/85 to-transparent p-4">
          <div className="w-full max-w-md text-center">
            <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-terminal-bg">
              <Lock className="h-4 w-4 text-accent" />
            </span>
            <h4 className="text-sm font-semibold text-zinc-100">{titulo}</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-snug text-zinc-400">{beneficio}</p>
            <Link
              href="/planes?audience=consignataria&from=mercado"
              className="mt-3 inline-block rounded-terminal bg-accent px-4 py-2 text-xs font-semibold text-terminal-bg transition-colors hover:bg-accent-bright"
            >
              Ver PRO
            </Link>
            <p className="mt-2 text-[10px] font-terminal text-zinc-600">
              Los datos de arriba son un ejemplo, no los tuyos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
