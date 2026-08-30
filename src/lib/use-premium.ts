'use client'

import { useEffect, useState } from 'react'

/**
 * use-premium.ts — el tier REAL de la cuenta.
 *
 * POR QUÉ EXISTE, TENIENDO `useSessionTier`
 * Son dos gates distintos y confundirlos rompe el sitio:
 *
 *  · **`useSessionTier` → gate de LOGIN.** Fuerza `tier: 'pro'` a propósito desde que se
 *    retiró PRO Usuario: las herramientas del productor (neto en mano, ¿vendo ahora?,
 *    comparador) son gratis y sólo piden cuenta. Ese comportamiento no se toca.
 *  · **`usePremium` → gate de PAGO.** Lee el tier que devuelve `/api/me` sin forzar nada,
 *    y se usa sólo en las funciones que sí se cobran.
 *
 * QUÉ SE COBRA Y QUÉ NO
 * Se gatean tres cosas: el histórico profundo de las series, la exportación de datos y
 * las alertas más allá de la primera.
 *
 * **No** se gatean —y no se van a gatear— el número del día, los precios observados de
 * cada firma con su `DatasetSchema`, los feeds `webcal`, las guías, el comparador ni
 * `/mercado/spread`. Eso es lo que hace que los asistentes nos citen y lo que trae los
 * registros: `/mercado/spread` es la página más leída del sitio y la que mejor convierte
 * (5,7 %). Cerrarla sería cambiar conversión por unos pesos.
 */

export interface EstadoPremium {
  loggedIn: boolean
  /** true sólo con suscripción paga vigente. */
  premium: boolean
  email: string | null
  loading: boolean
}

const INICIAL: EstadoPremium = { loggedIn: false, premium: false, email: null, loading: true }

export function usePremium(): EstadoPremium {
  const [estado, setEstado] = useState<EstadoPremium>(INICIAL)

  useEffect(() => {
    let cancelado = false
    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelado || !data) return
        setEstado({
          loggedIn: !!data.loggedIn,
          premium: data.tier === 'pro',
          email: data.email ?? null,
          loading: false,
        })
      })
      .catch(() => {
        // Ante un fallo se asume NO premium. Es la opción segura: mostrar de más lo que
        // se cobra es peor que pedirle a alguien que entre de nuevo.
        if (!cancelado) setEstado({ ...INICIAL, loading: false })
      })
    return () => {
      cancelado = true
    }
  }, [])

  return estado
}
