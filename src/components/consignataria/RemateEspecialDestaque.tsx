'use client'

import Image from 'next/image'
import type { RemateEspecial } from '@/lib/data/remates-especiales'
import { normalizeUrl } from '@/lib/utils/url'
import { trackOutboundClick } from '@/lib/analytics'

/* ------------------------------------------------------------------ */
/*  REMATE ESPECIAL — DESTAQUE                                         */
/*                                                                     */
/*  Reusable, subtle premium card for a cabaña/expositor special       */
/*  auction operated by a consignataria. Terminal-dark, deliberately   */
/*  understated (no loud colors). Driven entirely by config — nothing  */
/*  is hardcoded to a specific brand.                                  */
/* ------------------------------------------------------------------ */

/** Expositor badge: logo when available, text fallback otherwise. */
function BrandBadge({ brand, brandLogo }: { brand: string; brandLogo: string | null }) {
  if (brandLogo) {
    return (
      <span className="inline-flex items-center h-7 px-2 rounded-terminal border border-terminal-border bg-terminal-bg/60">
        <Image
          src={brandLogo}
          alt={brand}
          width={96}
          height={20}
          className="h-5 w-auto object-contain"
          unoptimized
        />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-7 px-2.5 rounded-terminal border border-amber-500/30 bg-amber-500/[0.06] text-xxs font-terminal uppercase tracking-wider text-amber-300/90">
      {brand}
    </span>
  )
}

function fmtDate(dstr: string): string {
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const d = new Date(dstr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function RemateEspecialDestaque({ remate }: { remate: RemateEspecial }) {
  const catalogUrl = normalizeUrl(remate.catalogUrl ?? null)
  const youtubeUrl = normalizeUrl(remate.youtubeUrl ?? null)

  return (
    <section
      aria-label={`Remate especial — ${remate.brand}`}
      className="rounded-terminal border border-terminal-border bg-gradient-to-br from-amber-500/[0.03] to-transparent p-3 sm:p-4"
    >
      {/* Header — tag + expositor badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="terminal-tag border-amber-500/40 text-amber-300/90 text-[10px] tracking-widest">
            REMATE ESPECIAL
          </span>
          <span className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Expositor
          </span>
        </div>
        <BrandBadge brand={remate.brand} brandLogo={remate.brandLogo} />
      </div>

      {/* Title */}
      <h2 className="text-data sm:text-base font-medium text-zinc-100 leading-snug">
        {remate.title}
      </h2>

      {/* Breeds as chips */}
      {remate.breeds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {remate.breeds.map((b) => (
            <span
              key={b}
              className="text-xxs font-terminal text-zinc-300 px-1.5 py-0.5 border border-terminal-border rounded-terminal"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Date · location · lotes */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xxs font-terminal">
        <span className="text-zinc-300 tabular-nums">{fmtDate(remate.date)}</span>
        {remate.time && <span className="text-zinc-400 tabular-nums">{remate.time}</span>}
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">
          {remate.location}
          {remate.province ? `, ${remate.province}` : ''}
        </span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-300">{remate.lotes}</span>
      </div>

      {/* Modality + pre-offer */}
      <div className="flex flex-wrap items-center gap-2 mt-2.5">
        {remate.modality && (
          <span className="inline-flex items-center gap-1.5 text-xxs font-terminal text-negative/90 px-1.5 py-0.5 border border-negative/30 rounded-terminal">
            <span className="status-dot bg-negative animate-pulse-live" />
            {remate.modality}
          </span>
        )}
        {remate.preOffer && (
          <span className="text-xxs font-terminal text-positive px-1.5 py-0.5 border border-positive/30 bg-positive/[0.05] rounded-terminal">
            {remate.preOffer}
          </span>
        )}
      </div>

      {/* CTAs — only when a URL exists */}
      {(catalogUrl || youtubeUrl) && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-terminal-border/60">
          {catalogUrl && (
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundClick(catalogUrl, 'catalog')}
              className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright transition-colors"
            >
              Ver catálogo &rarr;
            </a>
          )}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundClick(youtubeUrl, 'youtube')}
              className="text-xxs font-terminal uppercase tracking-wider text-negative hover:text-red-300 transition-colors"
            >
              Ver streaming &rarr;
            </a>
          )}
        </div>
      )}
    </section>
  )
}
