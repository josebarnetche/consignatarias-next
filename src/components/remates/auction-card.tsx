import type { Auction } from '@/lib/db/schema'
import { typeLabels, categoryLabels, statusLabels } from '@/lib/db/schema'

interface AuctionCardProps {
  auction: Auction
}

const statusConfig: Record<Auction['status'], { bg: string; dot: string }> = {
  scheduled: { bg: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  live: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500 animate-pulse-live' },
  completed: { bg: 'bg-stone-100 text-stone-500', dot: 'bg-stone-400' },
}

const typeAccent: Record<Auction['type'], string> = {
  invernada: 'border-l-campo-600',
  cria: 'border-l-violet-500',
  reproductores: 'border-l-amber-500',
  general: 'border-l-slate-400',
  especial: 'border-l-rose-500',
}

const typeBadge: Record<Auction['type'], string> = {
  invernada: 'bg-campo-50 text-campo-700 ring-campo-200',
  cria: 'bg-violet-50 text-violet-700 ring-violet-200',
  reproductores: 'bg-amber-50 text-amber-700 ring-amber-200',
  general: 'bg-slate-50 text-slate-600 ring-slate-200',
  especial: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const status = statusConfig[auction.status]

  return (
    <article
      className={`bg-white rounded-xl border border-stone-200 border-l-4 ${typeAccent[auction.type]} card-hover overflow-hidden`}
    >
      {/* Top bar: date + status */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <time className="text-sm font-semibold text-stone-800">
          {formatDate(auction.date)}
          <span className="text-stone-400 font-normal"> &middot; </span>
          <span className="text-campo-700">{auction.time}</span>
        </time>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {statusLabels[auction.status]}
        </span>
      </div>

      {/* Title */}
      <div className="px-5 pb-1">
        <h3 className="font-bold text-stone-900 leading-snug">
          {auction.title}
        </h3>
        <p className="text-sm text-tierra-700 font-medium mt-0.5">
          {auction.consignatariaName}
        </p>
      </div>

      {/* Info row */}
      <div className="px-5 py-3 flex items-center gap-4 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {auction.location}
        </span>
        {auction.estimatedHeads != null && (
          <span className="inline-flex items-center gap-1 font-medium text-stone-700">
            ~{auction.estimatedHeads.toLocaleString('es-AR')} cab.
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${typeBadge[auction.type]}`}
        >
          {typeLabels[auction.type]}
        </span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-50 text-stone-600 ring-1 ring-inset ring-stone-200">
          {categoryLabels[auction.mainCategory]}
        </span>
      </div>

      {/* Actions footer */}
      {(auction.catalogUrl || auction.youtubeUrl) && (
        <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center gap-4">
          {auction.catalogUrl && (
            <a
              href={auction.catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-campo-700 hover:text-campo-900 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cat&aacute;logo
            </a>
          )}
          {auction.youtubeUrl && (
            <a
              href={auction.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Transmisi&oacute;n
            </a>
          )}
          {auction.sourceUrl && (
            <a
              href={auction.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              {(() => { try { return new URL(auction.sourceUrl).hostname } catch { return 'fuente' } })()}
            </a>
          )}
        </div>
      )}
    </article>
  )
}
