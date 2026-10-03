import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, ExternalLink, Play, FileText } from 'lucide-react'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'
import { CAT_LABELS, getCity, nombrePropio, provinciaNombre } from '@/lib/ui/tokens'
import { remateAnchor, remateHref, tipoNombre } from '@/lib/remates-enlaces'
import type { Auction } from '@/lib/db/schema'

export interface RemateCardData {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string
  time: string | null
  location: string
  province: string
  type: string
  mainCategory: string
  estimatedHeads: number | null
  description: string
  youtubeUrl: string | null
  catalogUrl: string | null
  sourceUrl: string | null
  status: string
}

const TYPE_COLORS: Record<string, string> = {
  invernada: 'bg-positive/10 text-positive border-positive/30',
  cria: 'bg-warning/10 text-warning border-warning/30',
  general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  especial: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
  reproductores: 'bg-accent/10 text-accent border-accent/30',
}

/**
 * Tarjeta de remate de los listados server-side (/remates/hoy, mañana, semana,
 * fin de semana). El nombre de la firma es el enlace a la ficha del remate y se
 * estira sobre toda la tarjeta; la web de la firma queda como acción aparte.
 * Si el remate no tiene ficha, el enlace va al perfil de la consignataria.
 */
export function RemateCardSimple({
  remate,
  fecha,
  etiquetaVivo = 'Ver en vivo',
}: {
  remate: RemateCardData
  /** Fecha visible ("Sábado 4 de octubre"); se omite en los listados de un solo día. */
  fecha?: string
  etiquetaVivo?: string
}) {
  const ficha = remateHref(remate)
  const perfil = consignatariaProfilePath(remate.consignatariaSlug)
  const href = ficha ?? perfil
  const anchor = ficha ? remateAnchor(remate) : `Consignataria ${nombrePropio(remate.consignatariaName)}`
  const youtube = normalizeUrl(remate.youtubeUrl)
  const catalogo = normalizeUrl(remate.catalogUrl)
  const web = normalizeUrl(remate.sourceUrl)
  const lugar = [nombrePropio(getCity(remate.location)), provinciaNombre(remate.province)].filter(Boolean).join(', ')
  const categoria = remate.mainCategory && remate.mainCategory !== 'mixto'
    ? CAT_LABELS[remate.mainCategory as Auction['mainCategory']]
    : null

  return (
    <article className="relative bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 focus-within:border-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={href}
            aria-label={anchor}
            title={anchor}
            className="text-lg font-medium text-zinc-100 hover:text-accent transition-colors line-clamp-1 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {nombrePropio(remate.consignatariaName)}
          </Link>
          {lugar && (
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              <span>{lugar}</span>
            </div>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium border rounded ${TYPE_COLORS[remate.type?.toLowerCase()] || TYPE_COLORS.general} shrink-0`}>
          {tipoNombre(remate.type)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-3">
        {fecha && (
          <div className="flex items-center gap-1.5 text-accent/80">
            <Calendar className="w-3.5 h-3.5" aria-hidden />
            <span className="font-medium">{fecha}</span>
          </div>
        )}
        {remate.time && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden />
            <span>{remate.time} hs</span>
          </div>
        )}
        {remate.estimatedHeads ? (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" aria-hidden />
            <span>~{remate.estimatedHeads.toLocaleString('es-AR')} cabezas</span>
          </div>
        ) : null}
        {categoria && <span className="text-zinc-500">• {categoria}</span>}
      </div>

      {remate.description && (
        <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{remate.description}</p>
      )}

      {/* Acciones por encima del enlace estirado */}
      <div className="relative z-[1] flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
        {youtube && (
          <a
            href={youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-negative/10 text-negative border border-negative/30 rounded hover:bg-negative/20 transition-colors"
          >
            <Play className="w-3 h-3" aria-hidden />
            {etiquetaVivo}
          </a>
        )}
        {catalogo && (
          <a
            href={catalogo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <FileText className="w-3 h-3" aria-hidden />
            Catálogo
          </a>
        )}
        {web && web !== catalogo && (
          <a
            href={web}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" aria-hidden />
            Web de la firma
          </a>
        )}
        {ficha && (
          <Link
            href={perfil}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          >
            Ver consignataria →
          </Link>
        )}
      </div>
    </article>
  )
}
