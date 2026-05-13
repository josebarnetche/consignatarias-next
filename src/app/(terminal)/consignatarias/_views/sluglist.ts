import { getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'

// Province slugs hardcoded to guarantee inclusion in generateStaticParams
// across all sibling route files. Must match _views/ProvinceView PROVINCE_MAP.
const PROVINCE_SLUGS = [
  'buenos-aires',
  'chaco',
  'cordoba',
  'corrientes',
  'entre-rios',
  'formosa',
  'la-pampa',
  'misiones',
  'neuquen',
  'san-luis',
  'santa-fe',
  'santiago-del-estero',
  'tucuman',
] as const

/**
 * Merged static params for any route file under /consignatarias/[slug]/*.
 * All sibling routes (page.tsx, opengraph-image.tsx, twitter-image.tsx,
 * verificar/page.tsx, remitentes/*) MUST return this same set, otherwise
 * Next 15 dedupes and only materializes the intersection.
 */
export function mergedSlugStaticParams(): Array<{ slug: string }> {
  const profileSlugs = getAllCanonicalSlugs()
  const all = Array.from(new Set([...PROVINCE_SLUGS, ...profileSlugs]))
  return all.map((slug) => ({ slug }))
}
