'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackInternalNavClick } from '@/lib/analytics'

/**
 * SSG-real <a href> grid to province pages, dropped on the directory hubs
 * (/frigorificos, /consignatarias) ABOVE the listing. The hubs filter
 * client-side via onClick, so they emitted ZERO crawleable links to the
 * province pages that already exist (/frigorificos/[provincia],
 * /consignatarias/[provincia]). This grid is the crawleable surface in
 * parallel with the client filter — anchors are descriptive
 * ("Frigoríficos en Santa Fe (27 plantas)") and prioritised by GSC demand.
 *
 * Items must arrive pre-sorted by the caller (demand first). Renders Top-N
 * with a "ver todas" toggle, and fires trackInternalNavClick on click.
 */

export interface ProvinceLinkItem {
  /** Province slug, e.g. "santa-fe". Must resolve to a real SSG page. */
  slug: string
  /** Display label, e.g. "Santa Fe". */
  name: string
  /** Count for the province (plants / consignatarias). */
  count: number
}

export function ProvinceLinkGrid({
  items,
  hub,
  silo,
  basePath,
  unit,
  heading,
  topN = 8,
}: {
  items: ProvinceLinkItem[]
  /** GA `from_hub` value, e.g. "/frigorificos". */
  hub: string
  /** GA `silo` value, e.g. "frigorificos". */
  silo: string
  /** URL prefix for province pages, e.g. "/frigorificos". */
  basePath: string
  /** Noun for the anchor + count, e.g. "plantas" / "consignatarias". */
  unit: { singular: string; plural: string }
  heading: string
  topN?: number
}) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, topN)
  const hasMore = items.length > topN

  return (
    <nav
      aria-label={heading}
      className="terminal-panel"
    >
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-label tracking-widest text-zinc-300">{heading}</span>
        <span className="text-xxs tabular-nums text-zinc-500 font-terminal">{items.length}</span>
      </div>
      <div className="px-panel py-3">
        <div className="flex flex-wrap gap-2">
          {visible.map((p) => {
            const noun = p.count === 1 ? unit.singular : unit.plural
            return (
              <Link
                key={p.slug}
                href={`${basePath}/${p.slug}`}
                onClick={() =>
                  trackInternalNavClick({ from_hub: hub, to_province: p.slug, silo })
                }
                className="inline-flex items-center gap-1.5 text-data font-terminal text-accent border border-terminal-border hover:border-accent/40 hover:bg-accent/5 rounded-terminal px-2.5 py-1 transition-colors"
              >
                <span>{p.name}</span>
                <span className="tabular-nums text-zinc-500 text-xxs">
                  {p.count} {noun}
                </span>
              </Link>
            )
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 text-xxs font-terminal uppercase tracking-wider text-zinc-500 hover:text-accent transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todas (${items.length})`}
          </button>
        )}
      </div>
    </nav>
  )
}
