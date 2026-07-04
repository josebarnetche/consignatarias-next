import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'PRO',
  robots: { index: false, follow: false },
}

/**
 * PRO Usuario fue retirado (2026-07): sus herramientas son ahora gratis para el
 * productor. Ya no hay upgrade que vender → redirigimos a /planes (API-first).
 */
export default function UpgradePage() {
  redirect('/planes')
}
