'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

interface Item {
  slug: string
  name: string
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/**
 * Buscador por nombre de consignataria para la home. El caso típico de la IA es
 * que el usuario ya sabe el nombre de una firma y no tenía dónde tipearlo
 * (la home solo tenía mapa + calendario). Typeahead client-side sobre las ~100
 * firmas (lista chica), link directo al perfil.
 */
export default function ConsignatariaSearch({ items }: { items: Item[] }) {
  const [q, setQ] = useState('')
  const nq = norm(q.trim())

  const matches = useMemo(() => {
    if (nq.length < 2) return []
    return items
      .filter((it) => norm(it.name).includes(nq) || norm(it.slug).includes(nq))
      .slice(0, 8)
  }, [items, nq])

  return (
    <div className="relative z-20 mx-auto mt-10 w-full max-w-xl">
      <label htmlFor="consig-search" className="sr-only">
        Buscar consignataria por nombre
      </label>
      <input
        id="consig-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscá tu consignataria por nombre…"
        autoComplete="off"
        className="w-full rounded-lg border border-white/10 bg-[#0a0a0f]/80 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none backdrop-blur-md focus:border-sky-400/60"
      />
      {matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0f]/95 shadow-xl backdrop-blur-md">
          {matches.map((it) => (
            <li key={it.slug}>
              <Link
                href={`/consignatarias/${it.slug}`}
                className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-sky-400/10 hover:text-white"
              >
                {it.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {nq.length >= 2 && matches.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-lg border border-white/10 bg-[#0a0a0f]/95 px-4 py-2.5 text-sm text-zinc-500 backdrop-blur-md">
          Sin resultados ·{' '}
          <Link href="/consignatarias" className="text-accent hover:text-sky-300">
            ver todas
          </Link>
        </div>
      )}
    </div>
  )
}
