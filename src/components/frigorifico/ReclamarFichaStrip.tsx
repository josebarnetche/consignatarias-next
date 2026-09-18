'use client'

import Link from 'next/link'
import { trackClaimCTA, trackValueEvent } from '@/lib/analytics'

/**
 * El reclamo de la ficha, arriba y medido.
 *
 * POR QUÉ EXISTE
 * Search Console (28 días al 13-sep-2026): las fichas de frigorífico son 70.008
 * impresiones y 1.424 clics —el segundo bloque de tráfico del sitio— y son todas
 * búsquedas de CUIT. Entre esa gente está la propia planta (el contador, el
 * administrativo, el dueño googleando su razón social). El bloque "¿ES TU FRIGORIFICO?"
 * ya existía, pero al FINAL de la ficha, detrás de nueve paneles, y era un Link de
 * servidor: no registraba el clic en ningún lado. En 18 días (31-ago → 17-sep) la tabla
 * `frigorifico_claims` no recibió un solo reclamo con 1.388 sesiones sobre fichas.
 *
 * Es la misma lección de `/mercado/arrendamiento`: la posición manda más que el copy.
 * Este strip va inmediatamente después de la identidad —cuando la persona ya confirmó
 * que el CUIT es el suyo— y emite `claim_cta_click` (grupo b2b) con el CUIT como
 * entidad, que es lo que permite saber qué fichas producen reclamos. El formulario y la
 * tabla son los que ya existen (`/frigorificos/verificar` → `frigorifico_claims`): no
 * hay circuito nuevo, sólo un puente medido hacia el que había.
 *
 * Es un lead B2B para nosotros: la ficha reclamada es la puerta del Frigorífico
 * Destacado (ARS 30.000/mes) que se ofrece sólo a perfiles verificados.
 */
export default function ReclamarFichaStrip({ cuit, name }: { cuit: string; name: string }) {
  function alHacerClic() {
    trackClaimCTA(cuit, name)
    trackValueEvent('claim_cta_click', {
      entityType: 'frigorifico',
      entitySlug: cuit,
      meta: { source: 'ficha-top' },
    })
  }

  return (
    <div className="terminal-panel border-sky-500/30 bg-sky-500/5">
      <div className="px-panel py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-data font-terminal text-zinc-200">¿Este frigorífico es tuyo?</p>
          <p className="text-xxs font-terminal text-zinc-500 mt-0.5">
            Reclamá la ficha gratis: contacto visible, badge de verificado y las consultas de compradores llegan a tu correo.
          </p>
        </div>
        <Link
          href={`/frigorificos/verificar?cuit=${cuit}`}
          rel="nofollow"
          onClick={alHacerClic}
          className="shrink-0 inline-block px-4 py-2 bg-sky-500/20 border border-sky-500/40 text-accent text-data font-terminal rounded-terminal hover:bg-sky-500/30 transition-colors"
        >
          Reclamar la ficha →
        </Link>
      </div>
    </div>
  )
}
