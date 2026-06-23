/**
 * digest-content.ts — GENERADOR de contenido del digest semanal "qué cambió".
 *
 * Computa los deltas de la semana a partir de los datos estáticos vivos
 * (market-prices.json + remates.json). NO envía nada: sólo arma el modelo de
 * datos que la plantilla (digest-template.ts) convierte en HTML.
 *
 * Regla de oro WAVE 3: SOFT-FAIL por sección. Si una sección no se puede
 * computar (dato faltante, shape inesperado), se devuelve `null` para esa
 * sección y el resto del digest sigue. Nunca tira.
 */

import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

export const DIGEST_CAMPAIGN = 'que-cambio'

/** INMAG Δ semanal: valor actual vs. el más cercano a 7 días atrás. */
export interface InmagDelta {
  current: number
  prev: number          // valor de referencia ~7 días atrás
  changePct: number     // % vs prev
  prevDate: string | null
}

/** Resumen de remates de la semana entrante. */
export interface RematesSummary {
  weekRange: string         // "23/6 - 30/6"
  upcomingCount: number     // remates en los próximos 7 días
  newCount: number          // remates publicados en los últimos 7 días (por fecha de scrape/id no disponible → se aproxima)
  top: Array<{
    consignataria: string
    slug: string
    title: string
    date: string
    location: string
    heads: number | null
  }>
}

/** Categoría que más se movió esta semana (de categories.*.change). */
export interface TopCategoryMove {
  label: string
  changePct: number
  current: number
}

export interface DigestModel {
  weekRange: string
  generatedAt: string
  inmag: InmagDelta | null
  remates: RematesSummary | null
  topCategory: TopCategoryMove | null
  /** true si TODAS las secciones fallaron → el caller decide no mandar nada. */
  empty: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  novillos: 'Novillos',
  novillitos: 'Novillitos',
  vaquillonas: 'Vaquillonas',
  vacas: 'Vacas',
  toros: 'Toros',
  terneros: 'Terneros',
}

function formatShortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * INMAG Δ% semanal. Usa la serie diaria de market-prices.json: agarra el último
 * punto y lo compara contra el punto más cercano a 7 días antes. Si la serie no
 * existe o es corta, cae al par current/prev del header (Δ diario) como respaldo.
 */
function computeInmagDelta(): InmagDelta | null {
  try {
    const inmag = (marketPrices as { inmag?: {
      current?: number
      prev?: number
      change?: number
      series?: Array<{ date: string; value: number }>
    } }).inmag
    if (!inmag || typeof inmag.current !== 'number') return null

    const series = Array.isArray(inmag.series) ? inmag.series : []
    if (series.length >= 2) {
      const last = series[series.length - 1]
      const current = typeof last?.value === 'number' ? last.value : inmag.current
      // Buscamos el punto más cercano a 7 días atrás respecto del último dato.
      const lastDate = new Date(`${last.date}T00:00:00`)
      const target = new Date(lastDate)
      target.setDate(target.getDate() - 7)
      let best: { date: string; value: number } | null = null
      let bestDiff = Infinity
      for (const p of series) {
        if (typeof p?.value !== 'number' || !p?.date) continue
        const d = new Date(`${p.date}T00:00:00`)
        if (d >= lastDate) continue
        const diff = Math.abs(d.getTime() - target.getTime())
        if (diff < bestDiff) { bestDiff = diff; best = p }
      }
      if (best && best.value > 0) {
        return {
          current,
          prev: best.value,
          changePct: ((current - best.value) / best.value) * 100,
          prevDate: best.date,
        }
      }
    }

    // Respaldo: par current/prev del header (es el Δ que ya publica el sitio).
    if (typeof inmag.prev === 'number' && inmag.prev > 0) {
      return {
        current: inmag.current,
        prev: inmag.prev,
        changePct: typeof inmag.change === 'number'
          ? inmag.change
          : ((inmag.current - inmag.prev) / inmag.prev) * 100,
        prevDate: null,
      }
    }
    return null
  } catch {
    return null
  }
}

/** Resumen de remates de los próximos 7 días + top por cabezas. */
function computeRematesSummary(now: Date): RematesSummary | null {
  try {
    const auctions = rematesData as Auction[]
    if (!Array.isArray(auctions) || auctions.length === 0) return null

    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const todayStr = now.toISOString().slice(0, 10)
    const nextWeekStr = nextWeek.toISOString().slice(0, 10)

    const upcoming = auctions
      .filter((a) => a.date >= todayStr && a.date <= nextWeekStr && a.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date))

    if (upcoming.length === 0) return null

    // "Nuevos/próximos" = remates programados en la ventana que se abre esta
    // semana. No hay timestamp de scrape por fila, así que el proxy honesto es:
    // los que arrancan entre hoy y +7 (= upcoming) que aún están 'scheduled'.
    // Mantenemos el campo para que la plantilla pueda mostrar "N próximos".
    const newCount = upcoming.filter((a) => a.status === 'scheduled').length

    const top = [...upcoming]
      .sort((a, b) => (b.estimatedHeads ?? 0) - (a.estimatedHeads ?? 0))
      .slice(0, 5)
      .map((a) => ({
        consignataria: a.consignatariaName,
        slug: a.consignatariaSlug,
        title: a.title,
        date: a.date,
        location: a.location || a.province || '',
        heads: a.estimatedHeads,
      }))

    return {
      weekRange: `${formatShortDate(now)} - ${formatShortDate(nextWeek)}`,
      upcomingCount: upcoming.length,
      newCount,
      top,
    }
  } catch {
    return null
  }
}

/** La categoría con mayor |Δ%| de la semana (de categories.*.change). */
function computeTopCategory(): TopCategoryMove | null {
  try {
    const categories = (marketPrices as { categories?: Record<string, {
      current?: number
      change?: number
    }> }).categories
    if (!categories) return null

    let best: TopCategoryMove | null = null
    for (const [key, val] of Object.entries(categories)) {
      if (!val || typeof val.change !== 'number' || val.change === 0) continue
      if (!best || Math.abs(val.change) > Math.abs(best.changePct)) {
        best = {
          label: CATEGORY_LABELS[key] ?? key,
          changePct: val.change,
          current: typeof val.current === 'number' ? val.current : 0,
        }
      }
    }
    return best
  } catch {
    return null
  }
}

/**
 * buildDigestModel — arma el modelo completo "qué cambió esta semana".
 * Cada sección es soft-fail e independiente.
 */
export function buildDigestModel(reference?: Date): DigestModel {
  const now = reference ?? new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const inmag = computeInmagDelta()
  const remates = computeRematesSummary(now)
  const topCategory = computeTopCategory()

  return {
    weekRange: `${formatShortDate(now)} - ${formatShortDate(nextWeek)}`,
    generatedAt: now.toISOString(),
    inmag,
    remates,
    topCategory,
    empty: !inmag && !remates && !topCategory,
  }
}
