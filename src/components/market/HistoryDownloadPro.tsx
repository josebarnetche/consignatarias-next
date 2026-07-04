'use client'

import { trackEvent } from '@/lib/analytics'

/**
 * Descarga del histórico completo del INMAG (2015 →) en CSV.
 * PRO Usuario fue retirado (2026-07): es GRATIS. Link directo a
 * /api/market/inmag-export (que también quedó de-gateado) + track de la descarga.
 */
export default function HistoryDownloadPro() {
  return (
    <a
      href="/api/market/inmag-export"
      onClick={() => trackEvent('inmag_csv_download', {})}
      className="text-xs text-accent hover:text-accent-bright transition-colors flex items-center gap-1"
    >
      Descargar histórico completo (CSV, 2015→)
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  )
}
