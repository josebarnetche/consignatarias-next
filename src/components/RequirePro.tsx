import React from 'react'

interface RequireProProps {
  children: React.ReactNode
  /** Compat: paywall UI del viejo gate (ignorado). */
  fallback?: React.ReactNode
  /** Compat (ignorado). */
  feature?: string
  /** Compat (ignorado). */
  redirectTo?: string
}

/**
 * (Ex-)gate PRO server-side. PRO Usuario fue retirado (2026-07): estas secciones
 * (exports, reporte semanal, calendario) son ahora GRATIS. Passthrough — se mantiene
 * la firma para no tocar los callers.
 */
export async function RequirePro({ children }: RequireProProps) {
  return <>{children}</>
}

export { PaywallCard } from './Paywall'
