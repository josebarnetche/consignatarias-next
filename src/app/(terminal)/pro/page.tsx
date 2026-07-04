import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Herramientas del productor',
  robots: { index: false, follow: false },
}

/**
 * El viejo tour de "PRO Usuario" (ARS 7.900) quedó obsoleto: esas herramientas
 * (neto en mano, ¿vendo ahora?, comparador, histórico) son ahora GRATIS para el
 * productor. Redirigimos a /planes (modelo API-first, productor gratis).
 */
export default function ProPage() {
  redirect('/planes')
}
