/**
 * Índice de Calidad de la Hacienda (IQ) — indicador derivado propietario.
 *
 * QUÉ MIDE: el premio porcentual que el mercado paga por hacienda de calidad
 * "Especial/Joven" sobre la "Regular" equivalente, ponderado por volumen (cabezas).
 * Un IQ alto significa que la terminación/calidad se paga caro (mercado exigente,
 * demanda de gordo bien terminado / exportación); un IQ bajo, que la brecha de
 * calidad se achica (mercado tomador, o falta de oferta de calidad).
 *
 * FUENTE: las sub-categorías DIARIAS del Mercado Agroganadero (`detailedCategories`
 * de market-prices.json — el mismo dato que publica el MAG, con precio y cabezas por
 * grado). NO usa la serie mensual `mej` (stale 2024) ni proxies: es dato real de rueda.
 *
 * METODOLOGÍA (v1):
 *  - Se agrupan las sub-categorías por TIPO base (Novillos, Novillitos, Vaquillonas,
 *    Vacas) y por GRADO: "Esp"/"Joven" = premium; "Regular" = estándar. "Conserva"
 *    se EXCLUYE (es un piso de descarte, no el comparable "Regular" del mismo animal).
 *  - Por tipo: espAvg = promedio de precios de sus grados Esp PONDERADO por cabezas;
 *    regAvg = ídem para Regular. premio_tipo % = espAvg/regAvg − 1.
 *  - IQ = media de premio_tipo PONDERADA por el volumen (cabezas Esp+Reg) de cada tipo.
 *  - Solo se computa un tipo si tiene AL MENOS un grado Esp y uno Regular con cabezas.
 *
 * Es determinista y auditable: mismo `detailedCategories` → mismo IQ.
 */

export interface DetailedCategory {
  category: string
  avgPrice: number
  cabezas?: number
  minPrice?: number
  maxPrice?: number
}

export interface DetailedCategories {
  date: string
  categories: DetailedCategory[]
}

export interface QualityByType {
  type: string
  premiumPct: number
  espAvg: number
  regAvg: number
  cabezas: number
}

export interface QualityIndex {
  date: string
  /** Premio de calidad ponderado por volumen, en %. El titular del índice. */
  indexPct: number
  /** Desglose por tipo base. */
  byType: QualityByType[]
  /** Cabezas totales de la muestra (Esp+Reg de los tipos computados). */
  sampleCabezas: number
  method: string
}

const BASE_TYPES = ['NOVILLOS', 'NOVILLITOS', 'VAQUILLONAS', 'VACAS'] as const

// El nombre de grado se detecta en el texto de la sub-categoría del MAG.
// "Esp." (Especial) y "Joven" → premium. "Regular" → estándar. "Conserva" → excluido.
function gradeOf(category: string): 'esp' | 'reg' | null {
  const c = category.toLowerCase()
  if (c.includes('conserva')) return null
  if (c.includes('esp') || c.includes('joven')) return 'esp'
  if (c.includes('regular')) return 'reg'
  return null
}

function typeOf(category: string): (typeof BASE_TYPES)[number] | null {
  const up = category.toUpperCase()
  return BASE_TYPES.find((t) => up.startsWith(t)) ?? null
}

/** Promedio de precio ponderado por cabezas de un conjunto de sub-categorías. */
function weightedAvg(items: DetailedCategory[]): { avg: number; cabezas: number } {
  let num = 0
  let cab = 0
  for (const it of items) {
    const c = it.cabezas ?? 0
    if (c <= 0 || !it.avgPrice) continue
    num += it.avgPrice * c
    cab += c
  }
  return { avg: cab > 0 ? num / cab : 0, cabezas: cab }
}

export function computeQualityIndex(detailed: DetailedCategories | null | undefined): QualityIndex | null {
  if (!detailed?.categories?.length) return null

  const byType: QualityByType[] = []

  for (const type of BASE_TYPES) {
    const esp: DetailedCategory[] = []
    const reg: DetailedCategory[] = []
    for (const cat of detailed.categories) {
      if (typeOf(cat.category) !== type) continue
      const g = gradeOf(cat.category)
      if (g === 'esp') esp.push(cat)
      else if (g === 'reg') reg.push(cat)
    }
    const e = weightedAvg(esp)
    const r = weightedAvg(reg)
    // Requiere ambos grados con volumen real para ser comparable.
    if (e.cabezas === 0 || r.cabezas === 0 || r.avg === 0) continue
    byType.push({
      type: type.charAt(0) + type.slice(1).toLowerCase(),
      premiumPct: (e.avg / r.avg - 1) * 100,
      espAvg: e.avg,
      regAvg: r.avg,
      cabezas: e.cabezas + r.cabezas,
    })
  }

  if (byType.length === 0) return null

  const totalCab = byType.reduce((s, t) => s + t.cabezas, 0)
  const indexPct = byType.reduce((s, t) => s + t.premiumPct * t.cabezas, 0) / totalCab

  return {
    date: detailed.date,
    indexPct: Math.round(indexPct * 10) / 10,
    byType: byType.map((t) => ({ ...t, premiumPct: Math.round(t.premiumPct * 10) / 10 })),
    sampleCabezas: totalCab,
    method:
      'Premio de calidad (Especial/Joven vs Regular) por tipo, ponderado por cabezas. ' +
      'Fuente: sub-categorías diarias del Mercado Agroganadero. Conserva excluida.',
  }
}
