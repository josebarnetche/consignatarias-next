'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * Mide la visita a una ficha pública de productividad.
 *
 * POR QUÉ HACE FALTA UN COMPONENTE PARA ESTO
 * Las 478 fichas son server components estáticos: no corren nada en el navegador, así que
 * GA4 registra el pageview pero el sistema interno de eventos de valor no se entera de
 * nada. Sin esto, el activo de búsqueda entero es invisible para nuestra propia medición
 * y no hay forma de saber **si la ficha lleva al informe**, que es el eslabón que decide
 * si las 478 páginas sirven para algo más que tráfico.
 *
 * El beacon interno además no depende de que el visitante acepte cookies, que es la mitad
 * de lo que GA4 pierde.
 *
 * Va envuelto en Suspense: `useSearchParams` en una página estática obliga a Next a
 * hacerlo o falla el build. Queda acá adentro para que la ficha no tenga que saberlo.
 */
export function FichaTracker(props: { provincia: string; departamento: string }) {
  return (
    <Suspense fallback={null}>
      <FichaTrackerInterno {...props} />
    </Suspense>
  )
}

function FichaTrackerInterno({
  provincia,
  departamento,
}: {
  provincia: string
  departamento: string
}) {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  useEffect(() => {
    const meta = { provincia, departamento, source: ref || 'organico' }
    trackEvent('ficha_productividad_view', meta)
    emitValueBeacon('ficha_productividad_view', { meta })

    // El origen se guarda para que, si termina comprando el informe, la venta se pueda
    // atribuir a la ficha que la trajo. Sin este puente todo queda como "direct" del
    // otro lado del checkout.
    try {
      sessionStorage.setItem(
        'informe_source:informe-productivo-departamento',
        `ficha:${provincia}/${departamento}`,
      )
    } catch {
      /* sin storage se pierde la atribución, no la visita */
    }
  }, [provincia, departamento, ref])

  return null
}

/**
 * El clic desde una ficha (o desde un hub) hacia el sales page del informe.
 *
 * Es el escalón que convierte tráfico en intención, y el único número que dice si las
 * fichas trabajan para el producto o sólo traen visitas que se van.
 */
export function CtaInformeTracker({
  desde,
  children,
}: {
  desde: string
  children: React.ReactNode
}) {
  return (
    <span
      onClick={() => {
        const meta = { desde }
        trackEvent('informe_cta_click', meta)
        emitValueBeacon('informe_cta_click', { meta })
      }}
    >
      {children}
    </span>
  )
}
