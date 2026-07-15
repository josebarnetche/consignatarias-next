'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { RemateEspecial } from '@/lib/data/remates-especiales'
import { normalizeUrl } from '@/lib/utils/url'
import { trackOutboundClick } from '@/lib/analytics'
import { Badge } from '@/components/ui'

/** Cuenta regresiva compacta a un instante ISO. */
function Countdown({ to, label }: { to: string; label: string }) {
  const target = new Date(to).getTime()
  const [now, setNow] = useState(target)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const d = Math.max(0, target - now)
  const dd = Math.floor(d / 864e5)
  const hh = Math.floor((d % 864e5) / 36e5)
  const mm = Math.floor((d % 36e5) / 6e4)
  const vencido = d <= 0
  return (
    <div className="flex-1 min-w-[130px] rounded-terminal border border-terminal-border bg-black/30 px-2.5 py-2">
      <div className="text-[10px] font-terminal uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-mono tabular-nums text-sm font-bold ${vencido ? 'text-zinc-500' : 'text-zinc-100'}`}>
        {vencido ? '—' : `${dd}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`}
      </div>
    </div>
  )
}

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
      <span className="inline-flex items-center h-9 px-2.5 rounded-terminal border border-terminal-border bg-white">
        <Image
          src={brandLogo}
          alt={brand}
          width={132}
          height={28}
          className="h-7 w-auto object-contain"
          unoptimized
        />
      </span>
    )
  }
  return (
    <Badge tone="warning" className="h-7 px-2.5">
      {brand}
    </Badge>
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
          <Badge tone="warning" className="text-[10px] tracking-widest">
            REMATE ESPECIAL
          </Badge>
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
            <Badge key={b} tone="neutral" className="text-zinc-300 normal-case tracking-normal">
              {b}
            </Badge>
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

      {/* ── Módulo de pre-oferta integrado ── */}
      {remate.preofertaSlug && (
        <div className="mt-3 pt-3 border-t border-terminal-border/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xxs font-terminal uppercase tracking-widest text-positive inline-flex items-center gap-1.5">
              <span className="status-dot bg-positive animate-pulse-live" /> Pre-oferta abierta
            </span>
            <span className="text-xxs text-zinc-500">el puente al remate · conocé los lotes</span>
          </div>
          <div className="flex gap-2">
            {remate.remateAt && <Countdown to={remate.remateAt} label="Al remate" />}
            {remate.cierrePreoferta && <Countdown to={remate.cierrePreoferta} label="Cierra pre-oferta" />}
          </div>
          {remate.preofertaThumbs && remate.preofertaThumbs.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
              {remate.preofertaThumbs.map((v) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={v} src={`https://i.ytimg.com/vi/${v}/mqdefault.jpg`} alt="" loading="lazy"
                  className="w-[74px] h-[44px] object-cover rounded shrink-0 border border-terminal-border bg-zinc-800" />
              ))}
            </div>
          )}
          <Link
            href={`/preoferta/${remate.preofertaSlug}`}
            className="mt-2.5 inline-flex items-center justify-center w-full rounded-terminal bg-positive/[0.08] border border-positive/40 text-positive font-terminal text-xxs uppercase tracking-wider py-2.5 hover:bg-positive/[0.14] transition-colors"
          >
            Ver los {remate.preofertaLotes ?? ''} lotes con video y pre-ofertar &rarr;
          </Link>
        </div>
      )}

      {/* CTAs — only when a URL exists */}
      {(catalogUrl || youtubeUrl) && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-terminal-border/60">
          {catalogUrl && (
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundClick(catalogUrl, 'catalog')}
              className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright motion-hover"
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
              className="text-xxs font-terminal uppercase tracking-wider text-negative hover:text-negative/80 motion-hover"
            >
              Ver streaming &rarr;
            </a>
          )}
        </div>
      )}
    </section>
  )
}
