'use client'

import Link from 'next/link'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * La salida de una página-respuesta.
 *
 * EL PROBLEMA, MEDIDO
 * Las páginas que contestan una pregunta son las que mejor rankean del sitio —"cuanto
 * sale una vaca viva en argentina 2026" está en posición 1,7— y las que peor terminan:
 *
 *   /cuanto-vale-una-vaca ............ 95,5 % se va sin ver otra página
 *   /cuanto-cuesta-el-flete-de-hacienda 94,6 %
 *   /que-es-la-capitalizacion-de-hacienda 93,5 %
 *
 * Y no es que aburran: son las de mayor lectura del sitio (55 a 144 segundos, con 55-66 %
 * llegando al 75 % de la página). La gente lee todo, entiende, y se va. Ya tenían un
 * bloque de "seguir con el dato" al pie, con enlaces de texto, y no alcanzó.
 *
 * LA DIFERENCIA CON LO QUE SÍ FUNCIONA
 * `/mercado/arrendamiento` convierte al 6,85 % porque no ofrece un enlace: ofrece una
 * herramienta que usa el dato del visitante. La respuesta general genera la pregunta
 * particular —"¿y lo MÍO cuánto vale?"— y ahí es donde hay que estar.
 *
 * Por eso este bloque va DESPUÉS de la respuesta pero ANTES del desarrollo largo, ofrece
 * una herramienta concreta y no una sección, y emite evento: sin medición no se sabe si
 * mover el callejón sirvió de algo.
 */

interface Props {
  /** Qué se ofrece, en la voz de quien acaba de leer la respuesta. */
  titulo: string
  /** Qué agrega respecto de lo que ya leyó. Una línea. */
  detalle: string
  href: string
  /** Texto del botón. Verbo, no sustantivo. */
  accion: string
  /** De qué página sale — es la métrica que dice si el callejón se abrió. */
  desde: string
}

export function SiguientePaso({ titulo, detalle, href, accion, desde }: Props) {
  return (
    <aside className="my-8 rounded-lg border border-accent/30 bg-accent/[0.05] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-accent">Con tus números</p>
      <h2 className="mt-2 text-lg font-medium text-zinc-100">{titulo}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{detalle}</p>
      <Link
        href={href}
        onClick={() => {
          const meta = { desde, destino: href }
          trackEvent('siguiente_paso_click', meta)
          emitValueBeacon('siguiente_paso_click', { meta })
        }}
        className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-accent-bright"
      >
        {accion}
      </Link>
    </aside>
  )
}
