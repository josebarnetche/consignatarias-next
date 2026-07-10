'use client'

import Image from 'next/image'
import { getLogoUrl, getIdentityColor, getBrandKeepColor } from '@/lib/data/logo-map'

/**
 * IdentityMark — el avatar de una consignataria, intencional SIEMPRE.
 *
 * Reemplaza el patrón viejo (color de marca DETRÁS del logo → lotería que
 * fallaba la mayoría de las veces). La regla nueva:
 *
 *   El color de marca es ACENTO, nunca fondo del logo.
 *
 *   1. Tiene logo  → tarjeta clara (hueso) con padding. El 99% de los logos
 *      están hechos para fondo claro → legible siempre.
 *   2. Sin logo    → el isotipo de consignatarias (blanco) sobre el color de
 *      marca de la firma (curado, o derivado del nombre). Siempre se ve diseñado.
 *
 * `keepColor` (marcas multicolor que leen bien tal cual) se respeta: esos van
 * sobre carbón, no sobre tarjeta blanca.
 */

// Isotipo — misma geometría que src/lib/og/brand.tsx / marca/build_logos.py.
const ISO_RING =
  'M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z'

export default function IdentityMark({
  slug,
  name,
  logoUrl,
  size = 64,
  isPro = false,
  className = '',
}: {
  slug: string
  name: string
  logoUrl?: string | null
  size?: number
  isPro?: boolean
  className?: string
}) {
  const logo = logoUrl ?? getLogoUrl(slug)
  const uploaded = Boolean(logoUrl)
  const keepColor = !uploaded && getBrandKeepColor(slug)
  const radius = Math.round(size * 0.22)
  const pad = Math.round(size * 0.16)

  // Anillo de destaque PRO (cielo, acorde al ProBadge de marca).
  const ring = isPro
    ? { boxShadow: `0 8px 24px -8px rgba(0,0,0,.6), 0 0 0 2px var(--terminal-bg,#0b0b0e), 0 0 0 4px rgba(56,189,248,.55)` }
    : { boxShadow: `0 6px 18px -8px rgba(0,0,0,.55)` }

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    ...ring,
  }

  // ── Caso 1: logo ────────────────────────────────────────────────────────
  if (logo) {
    // keepColor → sobre carbón (la marca ya lee); resto → tarjeta hueso.
    const onCard = !keepColor
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
        style={{
          ...base,
          background: onCard ? '#f4f4f5' : 'var(--terminal-bg,#0b0b0e)',
          boxShadow: onCard ? ring.boxShadow : `${ring.boxShadow}, inset 0 0 0 1px var(--terminal-border,#27272a)`,
        }}
      >
        <Image
          src={logo}
          alt={`Logo ${name}`}
          width={size}
          height={size}
          unoptimized
          className="object-contain"
          style={{ padding: pad, width: '100%', height: '100%' }}
        />
      </div>
    )
  }

  // ── Caso 2: sin logo → isotipo sobre color de marca ─────────────────────
  const color = getIdentityColor(slug, name)
  const iso = Math.round(size * 0.62)
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
      style={{ ...base, background: color }}
      role="img"
      aria-label={`${name} — consignataria`}
    >
      {/* brillo sutil para dar volumen sobre el color plano */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(150deg,rgba(255,255,255,.16),transparent 55%)' }}
      />
      <svg width={iso} height={iso} viewBox="0 0 512 512" className="relative">
        <path d={ISO_RING} fill="#fafafa" />
        <rect x="379.7" y="168.1" width="118" height="118" fill="#fafafa" />
      </svg>
    </div>
  )
}
