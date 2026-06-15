import marketPrices from '@/lib/data/market-prices.json'

/**
 * Quality-segment slug machinery (P2) — shared so the route's generateStaticParams,
 * the page lookup, and the sitemap agree exactly. Drives /precios/[categoria]/calidad/[segmento]
 * off the observed MAG sub-category rows. 100% observed data (no estimate).
 */

// Below this sample size a segment page is too thin → noindex + excluded from sitemap.
export const CABEZAS_INDEX_THRESHOLD = 50

// MEJ (mestizo/cruza) is intentionally absent: no parent /precios/[categoria] slug exists,
// so a MEJ page would have a broken breadcrumb + unanswerable parent price.
const PARENT_PREFIX_TO_CATEGORIA: Record<string, string> = {
  NOVILLOS: 'novillos',
  NOVILLITOS: 'novillitos',
  VAQUILLONAS: 'vaquillonas',
  VACAS: 'vacas',
  TOROS: 'toros',
}

const TOKEN_MAP: Record<string, string> = { esp: 'especial', h: 'hasta' }

/** 'NOVILLOS Esp.Joven + 430' → 'especial-joven-mas-430'. Deterministic. */
export function slugifySegment(label: string): string {
  const rest = label.includes(' ') ? label.slice(label.indexOf(' ') + 1) : label
  let s = rest.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  s = s.replace(/\+/g, ' mas ')
  s = s.replace(/[^a-z0-9]+/g, ' ').trim()
  return s
    .split(/\s+/)
    .map((t) => TOKEN_MAP[t] || t)
    .join('-')
}

export interface QualitySegment {
  categoria: string
  segmento: string
  label: string
  minPrice: number
  maxPrice: number
  avgPrice: number
  cabezas: number
}

interface DetailedRow {
  category: string
  minPrice: number
  maxPrice: number
  avgPrice: number
  cabezas: number
}

export function getQualitySegments(): QualitySegment[] {
  const rows = (marketPrices.detailedCategories?.categories ?? []) as DetailedRow[]
  const out: QualitySegment[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (!r.category || r.category === 'Totales') continue
    const prefix = r.category.split(' ')[0].toUpperCase()
    const categoria = PARENT_PREFIX_TO_CATEGORIA[prefix]
    if (!categoria) continue // MEJ and any unmapped prefix
    const segmento = slugifySegment(r.category)
    const key = `${categoria}/${segmento}`
    if (seen.has(key)) throw new Error(`quality-segments slug collision: ${key} (${r.category})`)
    seen.add(key)
    out.push({
      categoria,
      segmento,
      label: r.category,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      avgPrice: r.avgPrice,
      cabezas: r.cabezas,
    })
  }
  return out
}

export function getQualitySegmentByParams(categoria: string, segmento: string): QualitySegment | null {
  return getQualitySegments().find((s) => s.categoria === categoria && s.segmento === segmento) ?? null
}
