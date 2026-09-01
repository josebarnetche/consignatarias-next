'use client'

import Link from 'next/link'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'
import { getProducto } from '@/lib/productos-datos'

/**
 * El puente entre una página de tema y el informe que vende ese tema.
 *
 * POR QUÉ EXISTE
 * Medido el 31-ago-2026: `/mercado/arrendamiento` tuvo **1.839 sesiones** y
 * `/informes/canon-de-arrendamiento` **una**. Sumando los cuatro temas, 4.303 sesiones
 * sobre lo que efectivamente vendemos contra 1 visita a una landing de producto. Los
 * siete productos existían con landing, FAQ, imágenes y circuito de pago —probado y
 * funcionando— colgados en pasillos por los que no pasa nadie.
 *
 * No era un problema de mensaje: con n=1 una explicación perfecta y una pésima son
 * indistinguibles. Era que no había puente.
 *
 * CÓMO SE COMPORTA
 * La página sigue entregando su valor completo y gratis; esto va DESPUÉS, nunca antes.
 * El informe se presenta como lo que la pantalla no puede dar —la dispersión con su
 * muestra, las zonas de al lado, la fuente de cada cifra, en papel para la reunión—, no
 * como un muro ni como un anuncio. Y dice explícitamente que lo de arriba sigue siendo
 * gratis: sin esa línea el bloque se lee como "ahora esto se paga" y espanta al que ya
 * estaba usando la herramienta.
 *
 * Cada bloque emite `informe_cta_click` y deja la atribución en `sessionStorage`, para
 * que una venta se pueda rastrear hasta la página que la trajo — del otro lado del
 * checkout, si no, todo aparece como "direct".
 */

interface Props {
  /** Slug en `productos-datos.ts`. Si no está publicado, el bloque no se dibuja. */
  producto: string
  /** De dónde sale el clic — es la métrica que dice qué página trabaja para el producto. */
  desde: string
  /** El titular, en la voz de la página. */
  titulo: string
  /** Qué da el informe que esta pantalla no puede dar. Tres o cuatro, no más. */
  loQueAgrega: string[]
  /** Qué sigue siendo gratis acá. Sin esto el bloque se lee como un cierre. */
  gratisAca: string
}

export function OfrecerInforme({ producto, desde, titulo, loQueAgrega, gratisAca }: Props) {
  const p = getProducto(producto)
  // Nunca ofrecer lo que no se puede entregar: si el producto no está publicado, no hay
  // bloque. Es la misma regla que sostiene el test de `productos-datos`.
  if (!p?.publicado) return null

  function alHacerClic() {
    const meta = { desde, producto }
    trackEvent('informe_cta_click', meta)
    emitValueBeacon('informe_cta_click', { meta })
    try {
      sessionStorage.setItem(`informe_source:${producto}`, desde)
    } catch {
      /* sin storage se pierde la atribución, no la visita */
    }
  }

  return (
    <section className="my-8 rounded-lg border border-sky-700/60 bg-sky-950/30 p-6 shadow-lg shadow-sky-950/20">
      <p className="text-xs font-medium uppercase tracking-widest text-sky-400">Informe por zona</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-50 sm:text-2xl">{titulo}</h2>

      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
        {loQueAgrega.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={p.landing}
          onClick={alHacerClic}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          {p.modalidad === 'suscripcion' ? 'Ver qué trae' : 'Ver el informe'}
        </Link>
        <span className="text-sm text-slate-400">
          {p.modalidad === 'suscripcion'
            ? `ARS ${p.precio.toLocaleString('es-AR')} por mes · cancelás cuando quieras`
            : `ARS ${p.precio.toLocaleString('es-AR')} · pago único · PDF`}
        </span>
      </div>

      <p className="mt-4 border-t border-sky-900/40 pt-3 text-xs leading-relaxed text-slate-500">
        {gratisAca}
        {p.modalidad !== 'suscripcion' &&
          ' Podés bajarte un informe entero de muestra, gratis, antes de decidir.'}
      </p>
    </section>
  )
}
