import marketPrices from '@/lib/data/market-prices.json'

/**
 * Provincias con página de origen (/mercado/origen/[provincia]): las que tienen
 * ProvinceCluster. Única fuente para la página y el sitemap — el sitemap tenía su
 * propio mapa y emitía /mercado/origen/santiago-del-estero, que daba 404.
 */
export const PROVINCIAS_ORIGEN: Record<string, { name: string; display: string }> = {
  'buenos-aires': { name: 'BUENOS AIRES', display: 'Buenos Aires' },
  'santa-fe': { name: 'SANTA FE', display: 'Santa Fe' },
  'la-pampa': { name: 'LA PAMPA', display: 'La Pampa' },
  'cordoba': { name: 'CORDOBA', display: 'Córdoba' },
  'san-luis': { name: 'SAN LUIS', display: 'San Luis' },
  'entre-rios': { name: 'ENTRE RIOS', display: 'Entre Ríos' },
}

const NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCIAS_ORIGEN).map(([slug, v]) => [v.name, slug]),
)

/** Slugs con página: provincia con cluster Y con fila en la última rueda. */
export function getOrigenSlugs(): string[] {
  return (marketPrices.provinceEntry.provinces as { province: string }[])
    .map((p) => NAME_TO_SLUG[p.province])
    .filter((slug): slug is string => Boolean(slug))
}
