import Link from 'next/link'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { remateHref } from '@/lib/remates-enlaces'
import { nombrePropio, provinciaNombre, getCity } from '@/lib/ui/tokens'

export interface RemateFilaData {
  id: number | string
  consignatariaSlug: string
  consignatariaName: string
  type?: string | null
  location?: string | null
  province?: string | null
  date: string
  time?: string | null
  estimatedHeads?: number | null
  mainCategory?: string | null
  status?: string | null
}

/**
 * Fila liviana de un remate para listados largos (anteriores, meses). Con ~200 remates
 * por mes, cada tarjeta completa (íconos SVG, descripción, varios enlaces) viajaba dos
 * veces —HTML y payload RSC— y la página pasaba de 1 MB. El enlace principal va a la
 * ficha del remate (si existe); el perfil de la firma queda al lado.
 */
export function RemateFila({ remate, conFecha = false }: { remate: RemateFilaData; conFecha?: boolean }) {
  const ciudad = nombrePropio(getCity(remate.location ?? ''))
  const provincia = provinciaNombre(remate.province)
  const fecha = conFecha
    ? new Date(`${remate.date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const detalle = [
    fecha,
    [ciudad, provincia].filter(Boolean).join(', ') || null,
    remate.time ? `${remate.time} hs` : null,
    remate.estimatedHeads ? `~${remate.estimatedHeads.toLocaleString('es-AR')} cabezas` : null,
  ].filter(Boolean).join(' · ')
  const titulo = `${nombrePropio(remate.consignatariaName)} — remate ${remate.type ? remate.type.toLowerCase() : 'general'}`
  const href = remateHref(remate as Parameters<typeof remateHref>[0])
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5">
      <div className="min-w-0">
        {href ? (
          <Link href={href} className="font-medium text-zinc-200 transition-colors hover:text-accent">
            {titulo}
          </Link>
        ) : (
          <span className="font-medium text-zinc-200">{titulo}</span>
        )}
        {detalle && <p className="text-xs text-zinc-500">{detalle}</p>}
      </div>
      <Link
        href={consignatariaProfilePath(remate.consignatariaSlug)}
        className="shrink-0 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        Perfil de la firma →
      </Link>
    </li>
  )
}

export default RemateFila
