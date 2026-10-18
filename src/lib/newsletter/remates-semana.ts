import type { Auction } from '@/lib/db/schema'
import { canonicoDeRemate } from '@/lib/remates-pro'
import { rematePath } from '@/lib/remate-slug'

/** Tope de remates del newsletter semanal (el mail no crece con la semana). */
export const NEWSLETTER_CAP = 10

export interface RemateNewsletter {
  title: string
  date: string
  time: string | null
  location: string
  consignataria: string
  /** Slug CANÓNICO de la firma: es el que lee el panel de distribución. */
  slug: string
  heads: number | null
  isPro: boolean
  /** Qué se remata, si la firma lo cargó. Lo usa el destacado. */
  description?: string | null
  /** Ficha del remate en el sitio (ruta relativa). */
  path: string
}

/**
 * Remates del newsletter semanal (17-10-2026).
 *
 * - PRO = `getFeaturedSlugs()` (la fuente única), comparado contra el slug
 *   CANÓNICO del remate: el de remates.json suele ser una variante y antes una
 *   firma que paga podía quedar como "regular".
 * - Los PRO van primero, en el orden de fecha que ya traen, pero DENTRO del tope:
 *   si hay más remates PRO que lugares, entran los más próximos y el resto queda
 *   afuera — el mail no se estira.
 * - `slug` sale canónico para que `promotion_campaigns` quede a nombre de la
 *   firma tal como la consulta su panel ("registro de envíos").
 */
export function armarRematesNewsletter(
  upcoming: Auction[],
  proSlugs: ReadonlySet<string>,
  cap = NEWSLETTER_CAP,
): { remates: RemateNewsletter[]; proCount: number } {
  const fila = (a: Auction, isPro: boolean): RemateNewsletter => ({
    title: a.title,
    date: a.date,
    time: a.time,
    location: a.location || '',
    consignataria: a.consignatariaName,
    slug: canonicoDeRemate(a.consignatariaSlug) ?? a.consignatariaSlug,
    heads: a.estimatedHeads,
    isPro,
    description: a.description || null,
    path: rematePath(a),
  })
  const pro: RemateNewsletter[] = []
  const regulares: RemateNewsletter[] = []
  for (const a of upcoming) {
    const canonico = canonicoDeRemate(a.consignatariaSlug)
    const esPro = !!canonico && proSlugs.has(canonico)
    ;(esPro ? pro : regulares).push(fila(a, esPro))
  }
  const remates = [...pro, ...regulares].slice(0, Math.max(0, cap))
  return { remates, proCount: remates.filter((r) => r.isPro).length }
}

/**
 * El remate que encabeza el mail (19-10-2026): uno PRO, el que más dice de sí mismo.
 * Primero el que tiene descripción cargada (la firma contó qué remata), después el de
 * más cabezas, después el más próximo. Sin PRO en la semana, no hay destacado.
 */
export function elegirDestacado(remates: RemateNewsletter[]): RemateNewsletter | null {
  const pro = remates.filter((r) => r.isPro)
  if (!pro.length) return null
  return [...pro].sort(
    (a, b) =>
      Number(!!b.description) - Number(!!a.description) ||
      (b.heads ?? 0) - (a.heads ?? 0) ||
      a.date.localeCompare(b.date),
  )[0]
}
