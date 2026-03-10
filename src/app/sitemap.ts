import { MetadataRoute } from 'next'
import { getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import frigorificosData from '@/lib/data/frigorificos.json'

/* ------------------------------------------------------------------ */
/*  PROVINCE SLUG MAP (must match [provincia]/page.tsx)                 */
/* ------------------------------------------------------------------ */

const PROVINCE_SLUGS: Record<string, string> = {
  'BUENOS AIRES': 'buenos-aires',
  'CHACO': 'chaco',
  'CORDOBA': 'cordoba',
  'CORRIENTES': 'corrientes',
  'ENTRE RIOS': 'entre-rios',
  'FORMOSA': 'formosa',
  'LA PAMPA': 'la-pampa',
  'MISIONES': 'misiones',
  'SAN LUIS': 'san-luis',
  'SANTA FE': 'santa-fe',
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.consignatarias.com.ar'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/overview`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/frigorificos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/consignatarias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quienes-somos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/planes`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]

  // Province landing pages — only for provinces with auctions
  const provincesWithAuctions = new Set(
    (rematesData as { province: string }[]).map(a => a.province)
  )
  const provincePages: MetadataRoute.Sitemap = Object.entries(PROVINCE_SLUGS)
    .filter(([name]) => provincesWithAuctions.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/remates/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Consignataria profile pages
  const consignatariaPages: MetadataRoute.Sitemap = getAllCanonicalSlugs().map((slug) => ({
    url: `${baseUrl}/consignatarias/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Frigorifico detail pages
  const frigorificoPages: MetadataRoute.Sitemap = (frigorificosData as { cuit: string }[]).map((f) => ({
    url: `${baseUrl}/frigorificos/${f.cuit}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // NOTE: /verificar pages intentionally excluded — thin form pages
  // that dilute crawl budget. They have robots noindex set.

  return [
    ...staticPages,
    ...provincePages,
    ...consignatariaPages,
    ...frigorificoPages,
  ]
}
