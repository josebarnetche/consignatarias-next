import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import marketData from '@/lib/data/market-prices.json'
import type { MagEntryData } from '../page'

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  // Only generate for consignatarias that have MAG data
  const entries = (marketData as { auctionDayEntries?: { consignatarias: Record<string, MagEntryData> } })
    .auctionDayEntries?.consignatarias || {}
  
  return Object.keys(entries)
    .filter(slug => entries[slug]?.entries?.length > 0)
    .map(slug => ({ slug }))
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  return {
    title: `Remitentes — ${profile.displayName}`,
    description: `Red de productores que comercializan a través de ${profile.displayName}. Localidades de origen, volumen histórico y patrones de remisión.`,
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${canonical}/remitentes`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function RemitentesPage({ params }: Props) {
  const { slug } = await params

  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}/remitentes`)
  }

  const profile = getProfile(canonical)
  if (!profile) notFound()

  const magEntry = (marketData as { auctionDayEntries?: { consignatarias: Record<string, MagEntryData> } })
    .auctionDayEntries?.consignatarias?.[canonical]

  if (!magEntry || magEntry.entries.length === 0) {
    notFound()
  }

  // Group by localidad
  const byLocalidad = magEntry.entries.reduce((acc, entry) => {
    const key = `${entry.localidad}, ${entry.provincia}`
    if (!acc[key]) {
      acc[key] = { localidad: entry.localidad, provincia: entry.provincia, entries: [], totalCabezas: 0 }
    }
    acc[key].entries.push(entry)
    acc[key].totalCabezas += entry.cabezas
    return acc
  }, {} as Record<string, { localidad: string; provincia: string; entries: typeof magEntry.entries; totalCabezas: number }>)

  const sortedLocalidades = Object.values(byLocalidad).sort((a, b) => b.totalCabezas - a.totalCabezas)
  const uniqueProvinces = [...new Set(magEntry.entries.map(e => e.provincia))].sort()

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href={`/consignatarias/${canonical}`}
              className="text-accent hover:text-accent-bright transition-colors"
            >
              ← {profile.displayName}
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 text-xxs tracking-widest">REMITENTES</span>
          </div>
          <span className="text-xxs text-zinc-500 font-terminal">{magEntry.period}</span>
        </div>
        <div className="px-panel py-4">
          <div className="flex flex-wrap items-baseline gap-4 mb-4">
            <div>
              <span className="text-3xl font-terminal text-positive tabular-nums">
                {magEntry.totalCabezas.toLocaleString('es-AR')}
              </span>
              <span className="text-sm text-zinc-500 ml-2">cabezas ingresadas</span>
            </div>
            <div className="text-zinc-600">|</div>
            <div>
              <span className="text-xl font-terminal text-zinc-300 tabular-nums">
                {magEntry.entries.length}
              </span>
              <span className="text-sm text-zinc-500 ml-2">remitentes</span>
            </div>
            <div className="text-zinc-600">|</div>
            <div>
              <span className="text-xl font-terminal text-zinc-300 tabular-nums">
                {sortedLocalidades.length}
              </span>
              <span className="text-sm text-zinc-500 ml-2">localidades</span>
            </div>
          </div>
          
          {/* Province badges */}
          <div className="flex flex-wrap gap-2">
            {uniqueProvinces.map(prov => {
              const count = magEntry.entries.filter(e => e.provincia === prov).length
              return (
                <span 
                  key={prov}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-sm text-xxs font-terminal"
                >
                  <span className="text-zinc-400">{prov}</span>
                  <span className="text-zinc-500">({count})</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* By Localidad */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header">
          <span className="text-zinc-400 text-xxs tracking-widest">POR LOCALIDAD</span>
        </div>
        <div className="divide-y divide-terminal-border">
          {sortedLocalidades.map(loc => (
            <div key={`${loc.localidad}-${loc.provincia}`} className="px-panel py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 font-terminal text-sm">{loc.localidad}</span>
                  <span className="text-xxs text-zinc-600">{loc.provincia}</span>
                </div>
                <span className="text-positive font-terminal tabular-nums">
                  {loc.totalCabezas.toLocaleString('es-AR')} cab
                </span>
              </div>
              <div className="grid gap-1">
                {loc.entries.map((entry, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between text-xxs font-terminal py-1 px-2 bg-zinc-900/30 rounded"
                  >
                    <span className="text-zinc-400 truncate">{entry.remitente}</span>
                    <span className="text-zinc-500 tabular-nums flex-shrink-0 ml-2">
                      {entry.cabezas} cab
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Remitentes */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header">
          <span className="text-zinc-400 text-xxs tracking-widest">TODOS LOS REMITENTES</span>
        </div>
        
        {/* Table header */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Establecimiento</span>
          <span className="w-[160px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Localidad</span>
          <span className="w-[60px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Prov</span>
          <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Cabezas</span>
        </div>

        {magEntry.entries
          .sort((a, b) => b.cabezas - a.cabezas)
          .map((entry, idx) => (
          <div key={idx} className="border-b border-terminal-border last:border-b-0">
            {/* Mobile */}
            <div className="md:hidden px-panel py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-200 font-terminal text-sm truncate">{entry.remitente}</span>
                <span className="text-positive font-terminal tabular-nums">{entry.cabezas} cab</span>
              </div>
              <div className="text-xxs text-zinc-500">
                {entry.localidad}, {entry.provincia}
              </div>
            </div>
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-0 px-cell py-px2">
              <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate">
                {entry.remitente}
              </span>
              <span className="w-[160px] flex-shrink-0 text-data font-terminal text-zinc-400 truncate">
                {entry.localidad}
              </span>
              <span className="w-[60px] flex-shrink-0 text-data font-terminal text-zinc-500 text-center">
                {entry.provincia}
              </span>
              <span className="w-[80px] flex-shrink-0 text-data font-terminal text-positive text-right tabular-nums">
                {entry.cabezas}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Source footer */}
      <div className="terminal-panel mt-px">
        <div className="px-panel py-2 text-xxs text-zinc-600 font-terminal">
          Fuente: Mercado Agroganadero S.A. — Datos públicos de guías de tránsito
        </div>
      </div>
    </div>
  )
}
