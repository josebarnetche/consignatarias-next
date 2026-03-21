'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TYPE_COLORS, TYPE_LABELS_SHORT } from '@/lib/ui/tokens'
import { TopFollowed } from '@/components/ui/TopFollowed'

interface DirectoryEntry {
  slug: string
  displayName: string
  auctionCount: number
  upcoming: number
  provinces: string[]
  types: string[]
}

type SortKey = 'auctions' | 'name' | 'upcoming'

export default function ConsignatariasDirectoryClient({ entries }: { entries: DirectoryEntry[] }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('auctions')

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
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortBy === 'upcoming') return b.upcoming - a.upcoming || b.auctionCount - a.auctionCount
      return b.auctionCount - a.auctionCount
    })
  }, [entries, search, sortBy])

  const totalAuctions = entries.reduce((s, e) => s + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((s, e) => s + e.upcoming, 0)

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <div className="flex gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-0">
      {/* HEADER */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <h1 className="section-heading text-label tracking-widest">DIRECTORIO DE CONSIGNATARIAS</h1>
          <span className="text-xxs tabular-nums text-zinc-500 font-terminal">
            {entries.length} consignatarias
          </span>
        </div>

        {/* Stats bar */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-4 md:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Total remates:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{totalAuctions}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Proximos:</span>
            <span className={`text-data tabular-nums font-terminal ${totalUpcoming > 0 ? 'text-positive' : 'text-zinc-500'}`}>
              {totalUpcoming}
            </span>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="border-b border-terminal-border px-panel py-2 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por nombre o provincia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-transparent border border-terminal-border px-2.5 py-1.5 text-data font-terminal text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-accent transition-colors"
          />
          <div className="flex items-center gap-1">
            {(['auctions', 'upcoming', 'name'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-2 py-1 text-xxs font-terminal uppercase tracking-wider transition-colors rounded-terminal ${
                  sortBy === key
                    ? 'bg-accent/10 border border-accent/30 text-accent'
                    : 'border border-terminal-border text-zinc-500 hover:text-zinc-400'
                }`}
              >
                {key === 'auctions' ? 'REMATES' : key === 'upcoming' ? 'PROX' : 'A-Z'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="terminal-panel mt-px">
        {/* Column headers (desktop) */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[40px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">#</span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Consignataria</span>
          <span className="w-[120px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipos</span>
          <span className="w-[130px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">Provincias</span>
          <span className="w-[60px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">Prox</span>
          <span className="w-[60px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Total</span>
        </div>

        {filtered.map((entry, i) => (
          <Link
            key={entry.slug}
            href={`/consignatarias/${entry.slug}`}
            className={`group border-b border-terminal-border hover:bg-zinc-800/50 hover:shadow-panel-hover transition-colors block rounded-terminal row-enter`}
            style={i < 20 ? { animationDelay: `${i * 30}ms` } : undefined}
          >
            {/* MOBILE */}
            <div className="md:hidden p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-data font-terminal text-zinc-200 group-hover:text-accent transition-colors truncate">
                  {entry.displayName}
                </span>
                <span className="text-data tabular-nums font-terminal text-zinc-300 flex-shrink-0 ml-2">
                  {entry.auctionCount}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {entry.upcoming > 0 && (
                  <span className="inline-flex items-center gap-1 text-xxs font-terminal text-positive tabular-nums">
                    <span className="live-indicator" style={{ width: '6px', height: '6px' }} />
                    {entry.upcoming} prox
                  </span>
                )}
                <span className="text-xxs text-zinc-500">{entry.provinces.slice(0, 2).join(', ')}</span>
                {entry.types.slice(0, 3).map(t => (
                  <span key={t} className={`terminal-tag ${TYPE_COLORS[t] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
                    {TYPE_LABELS_SHORT[t] || t.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden md:flex items-center gap-0 px-cell py-2">
              <span className="w-[40px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-500 text-right pr-2">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors">
                {entry.displayName}
              </span>
              <span className="w-[120px] flex-shrink-0 flex items-center gap-1 overflow-hidden">
                {entry.types.slice(0, 3).map(t => (
                  <span key={t} className={`terminal-tag ${TYPE_COLORS[t] || 'border-zinc-500 text-zinc-400'} text-[10px] flex-shrink-0`}>
                    {TYPE_LABELS_SHORT[t] || t.toUpperCase()}
                  </span>
                ))}
              </span>
              <span className="w-[130px] flex-shrink-0 text-xxs font-terminal text-zinc-500 text-right pr-2 truncate">
                {entry.provinces.slice(0, 2).join(', ')}
              </span>
              <span className={`w-[60px] flex-shrink-0 text-data tabular-nums font-terminal text-right pr-2 inline-flex items-center justify-end gap-1 ${
                entry.upcoming > 0 ? 'text-positive' : 'text-zinc-500'
              }`}>
                {entry.upcoming > 0 && (
                  <span className="live-indicator" style={{ width: '6px', height: '6px' }} />
                )}
                {entry.upcoming > 0 ? entry.upcoming : '\u2014'}
              </span>
              <span className="w-[60px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-300 text-right">
                {entry.auctionCount}
              </span>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="px-panel py-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-800/50 border border-zinc-700/50 mb-2">
              <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="text-data text-zinc-400 font-terminal font-medium">
                No se encontraron consignatarias
              </p>
              <p className="text-xxs text-zinc-600 font-terminal mt-1">
                {search ? `No hay resultados para "${search}"` : 'Probá con otra búsqueda'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-1.5 text-xxs text-accent hover:text-accent-bright font-terminal transition-colors border border-accent/30 rounded hover:bg-accent/10"
                >
                  LIMPIAR BÚSQUEDA
                </button>
              )}
              <Link
                href="/remates"
                className="px-3 py-1.5 text-xxs text-zinc-400 hover:text-zinc-300 font-terminal transition-colors border border-zinc-700 rounded hover:bg-zinc-800/50"
              >
                VER REMATES →
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
          <span className="text-xxs text-zinc-500 font-terminal">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
          <Link href="/remates" className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors">
            VER REMATES
          </Link>
        </div>
      </div>
        </div>
        
        {/* Sidebar — Social Proof */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <TopFollowed />
          </div>
        </aside>
      </div>
    </div>
  )
}
