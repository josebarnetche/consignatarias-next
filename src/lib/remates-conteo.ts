import rematesData from '@/lib/data/remates.json'

/**
 * Cuántos remates quedan por delante, contando los de HOY.
 *
 * El scraper marca `live` a los remates del día y `scheduled` a los de mañana en
 * adelante. La home filtraba sólo `scheduled` y por eso publicaba 181 cuando había
 * 195: se comía justo los 14 del día, que son los únicos a los que alguien todavía
 * llega. Vive acá, y no suelto en `page.tsx`, para que haya UN criterio y un test.
 */
export type RemateConteo = { date: string; status?: string }

export function esProximo(r: RemateConteo, hoy: string): boolean {
  return r.date >= hoy && (r.status === 'scheduled' || r.status === 'live')
}

export function rematesDesdeHoy<T extends RemateConteo>(remates: readonly T[], hoy: string): T[] {
  return remates.filter((r) => esProximo(r, hoy))
}

/** Los del día, que son los que pueden estar al aire o por empezar. */
export function rematesDeHoy<T extends RemateConteo>(remates: readonly T[], hoy: string): T[] {
  return remates.filter((r) => r.date === hoy && r.status !== 'completed')
}

export const TODOS_LOS_REMATES = rematesData as RemateConteo[]
