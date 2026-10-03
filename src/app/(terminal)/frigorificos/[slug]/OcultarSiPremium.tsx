'use client'

import { usePremium } from '@/lib/use-premium'

/**
 * Tapa el aviso PRO solo cuando la cuenta ya paga. Mientras resuelve (y para el bot,
 * que nunca tiene sesión) se muestra: es lo mismo que veía el anónimo cuando la ficha
 * leía la sesión en el server, sin volver dinámica la página.
 */
export default function OcultarSiPremium({ children }: { children: React.ReactNode }) {
  const { premium } = usePremium()
  if (premium) return null
  return <>{children}</>
}
