'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Stylized, schematic Argentina coverage map. Provinces are positioned in their
 * geographic arrangement (north-wide → south-narrow) so the shape reads as the
 * country without a cartographic silhouette. The covered provinces (those with a
 * live /remates/[slug] page) glow amber, are sized by activity, and click through
 * to that province's remates — this IS the province filter. Uncovered provinces
 * render as faint context. One component = filter + coverage visual + less clutter.
 */

// Static geographic-ish layout on a 200×380 canvas (y grows north→south).
interface Node {
  slug: string
  name: string
  x: number
  y: number
}

const COVERED: Node[] = [
  { slug: 'formosa', name: 'Formosa', x: 128, y: 42 },
  { slug: 'misiones', name: 'Misiones', x: 172, y: 62 },
  { slug: 'chaco', name: 'Chaco', x: 120, y: 70 },
  { slug: 'santiago-del-estero', name: 'Sgo. del Estero', x: 95, y: 90 },
  { slug: 'corrientes', name: 'Corrientes', x: 152, y: 95 },
  { slug: 'santa-fe', name: 'Santa Fe', x: 122, y: 120 },
  { slug: 'cordoba', name: 'Córdoba', x: 90, y: 140 },
  { slug: 'entre-rios', name: 'Entre Ríos', x: 148, y: 150 },
  { slug: 'san-luis', name: 'San Luis', x: 72, y: 165 },
  { slug: 'buenos-aires', name: 'Buenos Aires', x: 128, y: 188 },
  { slug: 'la-pampa', name: 'La Pampa', x: 88, y: 202 },
]

// Faint, non-interactive context so the cluster reads as Argentina.
const CONTEXT: { x: number; y: number; r: number }[] = [
  { x: 62, y: 22, r: 5 }, { x: 78, y: 48, r: 7 }, { x: 80, y: 75, r: 5 },
  { x: 60, y: 96, r: 5 }, { x: 55, y: 120, r: 6 }, { x: 45, y: 142, r: 5 },
  { x: 42, y: 176, r: 7 }, { x: 50, y: 216, r: 7 }, { x: 78, y: 246, r: 8 },
  { x: 66, y: 286, r: 8 }, { x: 60, y: 330, r: 8 }, { x: 78, y: 366, r: 5 },
]

export function CoverageMap({ counts }: { counts: Record<string, number> }) {
  const withCounts = COVERED.map((n) => ({ ...n, count: counts[n.slug] ?? 0 }))
  const totalRemates = withCounts.reduce((s, n) => s + n.count, 0)
  const [active, setActive] = useState(withCounts[9]) // Buenos Aires by default

  const radius = (count: number) => Math.min(17, 5 + Math.sqrt(count) * 1.1)

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox="0 0 200 384"
        className="h-[300px] w-auto shrink-0 sm:h-[360px]"
        role="img"
        aria-label={`Mapa de cobertura: ${withCounts.length} provincias con remates`}
      >
        {/* Context provinces — faint */}
        {CONTEXT.map((c, i) => (
          <circle key={`ctx-${i}`} cx={c.x} cy={c.y} r={c.r} fill="#27272a" />
        ))}
        {/* Covered provinces — amber, sized by activity, clickable */}
        {withCounts.map((n) => {
          const r = radius(n.count)
          const on = active.slug === n.slug
          return (
            <Link key={n.slug} href={`/remates/${n.slug}`} aria-label={`Remates en ${n.name}: ${n.count}`}>
              <g
                onMouseEnter={() => setActive(n)}
                onFocus={() => setActive(n)}
                className="cursor-pointer"
                tabIndex={0}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={on ? '#fbbf24' : 'rgba(251,191,36,0.45)'}
                  stroke={on ? '#fde68a' : 'transparent'}
                  strokeWidth={1.5}
                  className="transition-all"
                />
              </g>
            </Link>
          )
        })}
      </svg>

      {/* Readout — replaces the old text-heavy province lists */}
      <div className="text-center sm:text-left">
        <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">Cobertura</div>
        <div className="mt-1 flex items-baseline gap-2 justify-center sm:justify-start">
          <span className="text-3xl font-light tabular-nums text-zinc-100">{withCounts.length}</span>
          <span className="text-sm text-zinc-500">provincias · {totalRemates} remates</span>
        </div>
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.04] px-4 py-3">
          <div className="text-sm font-medium text-zinc-100">{active.name}</div>
          <div className="text-xs text-zinc-500">{active.count} remates indexados</div>
          <Link
            href={`/remates/${active.slug}`}
            className="mt-1 inline-block text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            Ver remates en {active.name} →
          </Link>
        </div>
        <p className="mt-3 text-xxs text-zinc-600">Pasá el mouse o tocá una provincia.</p>
      </div>
    </div>
  )
}
