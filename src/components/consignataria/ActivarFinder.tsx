'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

/**
 * Buscador "encontrá tu firma" — la puerta de entrada SELF-SERVE a PRO Consignataria.
 * La consignataria busca su firma en el directorio y cae en /consignatarias/<slug>/activar
 * (email → checkout de Rebill → paga → el webhook la activa). Cero humano en el medio.
 * Si su firma no está listada, un WhatsApp para sumarla (el único caso que pide manual).
 */

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function ActivarFinder({
  firms,
}: {
  firms: Array<{ slug: string; name: string }>
}) {
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const nq = norm(q.trim())
    if (nq.length < 2) return []
    return firms.filter((f) => norm(f.name).includes(nq)).slice(0, 8)
  }, [q, firms])

  const wa = `https://wa.me/5493773418130?text=${encodeURIComponent(
    'Hola! No encuentro mi consignataria en el directorio y quiero activar PRO. ¿Me la suman?',
  )}`

  return (
    <div className="terminal-panel" style={{ borderColor: 'rgba(251,191,36,0.35)' }}>
      <div className="terminal-panel-header" style={{ color: '#fbbf24', borderBottomColor: 'rgba(251,191,36,0.25)' }}>
        Encontrá tu firma
      </div>
      <div className="px-panel py-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Escribí el nombre de tu consignataria…"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/60 font-terminal"
        />

        {q.trim().length >= 2 && (
          <ul className="mt-3 divide-y divide-terminal-border">
            {results.length === 0 && (
              <li className="py-3 text-xxs text-zinc-500 font-terminal">
                No encontramos esa firma. Probá con otro nombre.
              </li>
            )}
            {results.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/consignatarias/${f.slug}/activar`}
                  className="group flex items-center justify-between py-2.5 px-1 hover:bg-zinc-900/40 transition-colors"
                >
                  <span className="text-sm text-zinc-200 font-terminal">{f.name}</span>
                  <span className="text-xxs text-amber-300 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Activar PRO →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xxs text-zinc-600 font-terminal leading-relaxed">
          ¿Tu firma no está en el directorio?{' '}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">
            Escribinos y la sumamos
          </a>
          .
        </p>
      </div>
    </div>
  )
}
