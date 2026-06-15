import marketData from '@/lib/data/market-prices.json'

/* ------------------------------------------------------------------
   Shared primitive (P1): map a /mercado & /precios category slug to the
   observed MAG sub-category rows in market-prices.json.detailedCategories.
   Exported so idea #2 (/precios/[categoria] sub-cat AnswerBlock) consumes
   the SAME filter instead of a divergent copy. 'terneros' has no observed
   sub-cat rows at the MAG → empty (the component renders nothing).
   ------------------------------------------------------------------ */
export const CATEGORY_PREFIX: Record<string, string[]> = {
  terneros: [],
  novillos: ['NOVILLOS'],
  novillitos: ['NOVILLITOS'],
  vaquillonas: ['VAQUILLONAS'],
  vacas: ['VACAS'],
  toros: ['TOROS'],
}

export interface DetailedRow {
  category: string
  minPrice: number
  maxPrice: number
  avgPrice: number
  cabezas: number
}

export function getDetailedRowsForCategory(categoria: string): DetailedRow[] {
  const prefixes = CATEGORY_PREFIX[categoria]
  if (!prefixes || prefixes.length === 0) return []
  const rows = ((marketData.detailedCategories?.categories ?? []) as DetailedRow[])
  return rows.filter((r) => {
    if (!r.category) return false
    const up = r.category.toUpperCase()
    if (up === 'TOTALES') return false // aggregate row, not a sub-category
    if (r.minPrice === 0 && r.maxPrice === 0) return false // no observed range
    return prefixes.some((p) => up.startsWith(p)) // excludes MEJ rows (don't map to a slug)
  })
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

/**
 * Observed MAG sub-category price ranges as a semantic, snippet-extractable
 * <table>. Every cell is a real observed value from the latest MAG rueda — no
 * estimate — so the caption names the source + date (brand rule #1). Emits an
 * ItemList/AggregateOffer JSON-LD (low/high = the real min/max range). Returns
 * null when the category has no observed rows (e.g. terneros).
 */
export function PriceRangeTable({ categoria, namePlural }: { categoria: string; namePlural?: string }) {
  const rows = getDetailedRowsForCategory(categoria)
  if (rows.length === 0) return null

  const date = (marketData.detailedCategories as { date?: string })?.date ?? marketData.lastUpdate
  const label = namePlural ?? categoria

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Precios por subcategoría — ${label}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: r.category,
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: r.minPrice,
          highPrice: r.maxPrice,
          priceCurrency: 'ARS',
          offerCount: r.cabezas,
        },
      },
    })),
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-zinc-100 mb-3">Precios por subcategoría ({label})</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <caption className="caption-bottom px-4 py-3 text-left text-xs text-zinc-500">
            Precios observados por subcategoría — Mercado Agroganadero (Cañuelas), rueda del {date}. Mín/máx/promedio
            reales del día; cabezas = volumen operado.
          </caption>
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="px-4 py-2 text-left font-medium">Subcategoría</th>
              <th className="px-4 py-2 text-right font-medium">Mín $/kg</th>
              <th className="px-4 py-2 text-right font-medium">Máx $/kg</th>
              <th className="px-4 py-2 text-right font-medium">Prom $/kg</th>
              <th className="px-4 py-2 text-right font-medium">Cabezas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-b border-zinc-900 last:border-0">
                <td className="px-4 py-2 text-zinc-300">{r.category}</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{r.minPrice > 0 ? `$${fmt(r.minPrice)}` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{r.maxPrice > 0 ? `$${fmt(r.maxPrice)}` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-200">{r.avgPrice > 0 ? `$${fmt(r.avgPrice)}` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{fmt(r.cabezas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </section>
  )
}
