'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

interface DteCTAProps {
  consignatariaName: string
  consignatariaSlug: string
  variant?: 'inline' | 'card'
  className?: string
}

/**
 * DT-e (Documento de Tránsito Electrónico) upload CTA
 * Lock-in strategy: Users invest time uploading their livestock transit documents
 * Once they have data in the platform, switching cost increases dramatically
 */
export default function DteCTA({ consignatariaName, consignatariaSlug, variant = 'card', className = '' }: DteCTAProps) {
  const handleClick = () => {
    trackEvent('dte_cta_click', {
      consignataria: consignatariaSlug,
      source: 'profile',
      variant,
    })
  }

  if (variant === 'inline') {
    return (
      <Link
        href="/mi-cuenta/guias"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-xxs font-terminal">Subir DT-e</span>
      </Link>
    )
  }

  return (
    <div className={`terminal-panel mt-px ${className}`}>
      <div className="px-panel py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-zinc-200 font-terminal text-data uppercase tracking-wider">
                ¿Participaste en un remate de {consignatariaName}?
              </span>
            </div>
            <p className="text-xxs text-zinc-500 font-terminal">
              Subí tus DT-e (Documentos de Tránsito Electrónico) y llevá un registro completo de tus operaciones ganaderas. Organizá tu historial de compras y ventas en un solo lugar.
            </p>
          </div>
          <Link
            href="/mi-cuenta/guias"
            onClick={handleClick}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Subir DT-e
          </Link>
        </div>
      </div>
    </div>
  )
}
