import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'

/**
 * Remate de una firma PRO (17-10-2026).
 *
 * El slug que trae remates.json suele ser una VARIANTE de la firma ("…-sa",
 * "…-y-cia"), mientras que `getFeaturedSlugs()` devuelve slugs CANÓNICOS.
 * Comparar el crudo contra el set dejaba afuera a firmas que sí pagan. Se mapea
 * al canónico y, si el slug no está en el mapa, se usa el crudo.
 *
 * Es la regla única para los listados server-side de /remates (hoy, semana,
 * en vivo, mes, anteriores, provincia), la ficha del remate y el newsletter.
 */
export function canonicoDeRemate(rawSlug: string | null | undefined): string | null {
  if (!rawSlug) return null
  return getCanonicalSlug(rawSlug) ?? rawSlug
}

export function esRematePro(
  remate: { consignatariaSlug?: string | null },
  proSlugs: ReadonlySet<string>,
): boolean {
  const canonico = canonicoDeRemate(remate.consignatariaSlug)
  return !!canonico && proSlugs.has(canonico)
}
