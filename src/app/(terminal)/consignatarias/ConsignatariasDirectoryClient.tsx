'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { nombrePropio, provinciaNombre } from '@/lib/ui/tokens'
import { TopFollowed } from '@/components/ui/TopFollowed'
import { type ProvinceLinkItem } from '@/components/seo/ProvinceLinkGrid'
import { typeLabel } from '@/components/remates/RematesFilterBar'
import { trackInternalNavClick } from '@/lib/analytics'
import ProBadge from '@/components/badges/ProBadge'
import IdentityMark from '@/components/consignataria/IdentityMark'

interface DirectoryEntry {
  slug: string
  displayName: string
  auctionCount: number
  upcoming: number
  provinces: string[]
  types: string[]
  isPro?: boolean
}

type SortKey = 'auctions' | 'name' | 'upcoming'

export default function ConsignatariasDirectoryClient({
  entries,
  provinceLinks = [],
}: {
  entries: DirectoryEntry[]
  provinceLinks?: ProvinceLinkItem[]
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('upcoming')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = entries
    if (q) {
      list = list.filter(e =>
        e.displayName.toLowerCase().includes(q) ||
        e.slug.includes(q) ||
        e.provinces.some(p => p.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) => {
      // PRO firms keep priority across every sort mode.
      const pro = Number(b.isPro) - Number(a.isPro)
      if (pro !== 0) return pro
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortBy === 'upcoming') return b.upcoming - a.upcoming || b.auctionCount - a.auctionCount
      return b.auctionCount - a.auctionCount
    })
  }, [entries, search, sortBy])

  return (
    <div className="mx-auto max-w-5xl px-2 py-3 sm:px-6">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="terminal-panel">
            {/* Buscar + ordenar: lo único que hace falta para encontrar una firma */}
            <div className="space-y-3 border-b border-terminal-border px-panel py-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Buscar por nombre o provincia"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar consignatarias"
                    className="terminal-input w-full min-h-[44px] rounded-terminal pl-9 pr-3 text-base sm:text-sm placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                  />
                </div>
                <label className="sr-only" htmlFor="orden-consignatarias">Ordenar</label>
                <select
                  id="orden-consignatarias"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="terminal-input w-full min-h-[44px] cursor-pointer rounded-terminal px-3 text-base sm:text-sm focus:border-accent focus:outline-none"
                >
                  <option value="upcoming">Con remates próximos</option>
                  <option value="auctions">Con más remates</option>
                  <option value="name">Por nombre (A-Z)</option>
                </select>
              </div>

              {/* Provincias: enlaces reales (indexables) a la página de cada una */}
              {provinceLinks.length > 0 && (
                <nav aria-label="Consignatarias por provincia" className="-mx-panel flex items-center gap-2 overflow-x-auto px-panel pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  <span className="flex-shrink-0 text-sm text-zinc-500">Por provincia:</span>
                  {provinceLinks.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/consignatarias/${p.slug}`}
                      onClick={() =>
                        trackInternalNavClick({ from_hub: '/consignatarias', to_province: p.slug, silo: 'consignatarias' })
                      }
                      className="inline-flex min-h-[36px] flex-shrink-0 items-center gap-1.5 rounded-full border border-terminal-border px-3 text-sm text-zinc-300 transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      {p.name}
                      <span className="tabular-nums text-zinc-500">{p.count}</span>
                    </Link>
                  ))}
                </nav>
              )}
            </div>

            {/* Listado */}
            <ul>
              {filtered.map((entry) => {
                const provincias = entry.provinces.map(provinciaNombre).filter(Boolean)
                return (
                  <li key={entry.slug}>
                    <Link
                      href={`/consignatarias/${entry.slug}`}
                      className="group flex items-center gap-3 border-b border-terminal-border px-panel py-4 transition-colors hover:bg-zinc-900/60 sm:gap-4"
                    >
                      <IdentityMark slug={entry.slug} name={entry.displayName} size={40} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold leading-snug text-ink group-hover:text-accent">
                            {nombrePropio(entry.displayName)}
                          </span>
                          {entry.isPro && <ProBadge size="sm" className="flex-shrink-0" />}
                        </div>
                        {provincias.length > 0 && (
                          <p className="text-sm text-zinc-400">
                            {provincias.slice(0, 3).join(', ')}
                            {provincias.length > 3 && ` y ${provincias.length - 3} más`}
                          </p>
                        )}
                        <p className={`text-sm font-medium sm:hidden ${entry.upcoming > 0 ? 'text-positive' : 'text-zinc-500'}`}>
                          {entry.upcoming > 0
                            ? `${entry.upcoming} ${entry.upcoming === 1 ? 'remate próximo' : 'remates próximos'}`
                            : 'Sin remates próximos'}
                        </p>
                        {entry.types.length > 0 && (
                          <p className="line-clamp-2 text-sm text-zinc-500">
                            Remates de {entry.types.map((t) => typeLabel(t).toLowerCase()).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="hidden flex-shrink-0 text-right sm:block">
                        {entry.upcoming > 0 ? (
                          <>
                            <div className="text-lg font-semibold tabular-nums text-positive">{entry.upcoming}</div>
                            <div className="text-xs text-zinc-500">
                              {entry.upcoming === 1 ? 'remate próximo' : 'remates próximos'}
                            </div>
                          </>
                        ) : (
                          <div className="max-w-[90px] text-xs leading-tight text-zinc-500">Sin remates próximos</div>
                        )}
                      </div>
                      <svg className="h-5 w-5 flex-shrink-0 text-zinc-600 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {filtered.length === 0 && (
              <div className="space-y-4 px-panel py-10 text-center">
                <p className="text-base font-medium text-ink">No encontramos consignatarias con ese nombre</p>
                <p className="text-sm text-zinc-500">
                  {search ? `No hay resultados para "${search}".` : 'Probá con otra búsqueda.'} Probá con el nombre de la
                  provincia o de la localidad.
                </p>
                {search && (
                  <button onClick={() => setSearch('')} className="terminal-btn-primary min-h-[44px] px-4">
                    Borrar búsqueda
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between px-panel py-3 text-sm">
              <span className="text-zinc-500">
                {filtered.length} consignataria{filtered.length !== 1 ? 's' : ''}
              </span>
              <Link href="/remates" className="font-medium text-accent hover:text-accent-bright">
                Ver todos los remates →
              </Link>
            </div>
          </div>
        </div>

        {/* Lateral — las más seguidas (solo escritorio ancho) */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-4">
            <TopFollowed />
          </div>
        </aside>
      </div>
    </div>
  )
}
