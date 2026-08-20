'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackGuiaView } from '@/lib/analytics'

/**
 * Mide la llegada al sales page y de dónde vino.
 *
 * El `?ref=banner-inmag` que ponen los banners internos se lee acá y se guarda en
 * sessionStorage: cuando la compra se confirme (en /cuenta/guias, del otro lado
 * de Rebill) el evento `purchase` va a poder decir QUÉ superficie vendió. Sin
 * este puente el origen se pierde en el salto al checkout externo y todas las
 * ventas quedan como "direct".
 */
export function GuiaViewTracker({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  useEffect(() => {
    const source = ref || 'direct'
    trackGuiaView(slug, source)
    if (ref) {
      try {
        sessionStorage.setItem(`guia_source:${slug}`, ref)
      } catch {
        /* storage no disponible — se pierde el origen, no la venta */
      }
    }
  }, [slug, ref])

  return null
}
