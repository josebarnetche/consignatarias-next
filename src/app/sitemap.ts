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
  'NEUQUEN': 'neuquen',
  'SAN LUIS': 'san-luis',
  'SANTA FE': 'santa-fe',
  'SANTIAGO DEL ESTERO': 'santiago-del-estero',
  'TUCUMAN': 'tucuman',
}

/* ------------------------------------------------------------------ */
/*  TYPE SLUGS (must match tipo/[tipo]/page.tsx)                        */
/* ------------------------------------------------------------------ */

const TYPE_SLUGS = ['invernada', 'cria', 'general', 'especial', 'reproductores']

/* ------------------------------------------------------------------ */
/*  MARKET CATEGORY SLUGS (/mercado/[categoria])                       */
/* ------------------------------------------------------------------ */

const MARKET_CATEGORY_SLUGS = ['terneros', 'novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros']

/* ------------------------------------------------------------------ */
/*  CITY SLUG HELPER (for /remates/ciudad/[ciudad])                    */
/* ------------------------------------------------------------------ */

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getUniqueCitySlugs(auctions: typeof rematesData): string[] {
  const seen = new Set<string>()
  for (const auction of auctions) {
    if (auction.location) {
      seen.add(normalizeCity(auction.location))
    }
  }
  return Array.from(seen)
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
      url: `${baseUrl}/remates/hoy`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates/manana`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/semana`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/anteriores`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/frigorificos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mercado`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/inmag`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/spread`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/liniers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
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
    {
      url: `${baseUrl}/calidad`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/glosario`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/preguntas-frecuentes`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/comparar`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/calculadora`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calendario-exportar`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reporte-semanal`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/exportar`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
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

  // Consignatarias by province landing pages
  const consignatariasByProvincePages: MetadataRoute.Sitemap = Object.entries(PROVINCE_SLUGS)
    .filter(([name]) => provincesWithAuctions.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/consignatarias/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Type landing pages (/remates/tipo/invernada, etc.)
  const typePages: MetadataRoute.Sitemap = TYPE_SLUGS.map((slug) => ({
    url: `${baseUrl}/remates/tipo/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Province + Type combo pages (/remates/cordoba/invernada, etc.)
  // Only include combinations that have auctions
  const remates = rematesData as { province: string; type?: string }[]
  const provinceTypePages: MetadataRoute.Sitemap = []
  for (const [provinceName, provinceSlug] of Object.entries(PROVINCE_SLUGS)) {
    for (const typeSlug of TYPE_SLUGS) {
      const hasAuctions = remates.some(
        (r) => r.province === provinceName && r.type?.toLowerCase() === typeSlug
      )
      if (hasAuctions) {
        provinceTypePages.push({
          url: `${baseUrl}/remates/${provinceSlug}/${typeSlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    }
  }

  // Consignataria profile pages
  const consignatariaPages: MetadataRoute.Sitemap = getAllCanonicalSlugs().map((slug) => ({
    url: `${baseUrl}/consignatarias/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Frigorificos by province landing pages
  const FRIGORIFICO_PROVINCE_SLUGS: Record<string, string> = {
    'BUENOS AIRES': 'buenos-aires',
    'SANTA FE': 'santa-fe',
    'CORDOBA': 'cordoba',
    'ENTRE RIOS': 'entre-rios',
    'LA PAMPA': 'la-pampa',
    'CHACO': 'chaco',
    'CORRIENTES': 'corrientes',
    'SANTIAGO DEL ESTERO': 'santiago-del-estero',
    'FORMOSA': 'formosa',
    'MISIONES': 'misiones',
    'TUCUMAN': 'tucuman',
    'SALTA': 'salta',
    'JUJUY': 'jujuy',
    'CATAMARCA': 'catamarca',
    'MENDOZA': 'mendoza',
    'SAN JUAN': 'san-juan',
    'SAN LUIS': 'san-luis',
    'NEUQUEN': 'neuquen',
    'RIO NEGRO': 'rio-negro',
    'CHUBUT': 'chubut',
    'SANTA CRUZ': 'santa-cruz',
    'TIERRA DEL FUEGO': 'tierra-del-fuego',
  }

  const provincesWithFrigorificos = new Set(
    (frigorificosData as { province: string }[]).map(f => f.province)
  )
  const frigorificosByProvincePages: MetadataRoute.Sitemap = Object.entries(FRIGORIFICO_PROVINCE_SLUGS)
    .filter(([name]) => provincesWithFrigorificos.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/frigorificos/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  // Frigorifico detail pages
  const frigorificoPages: MetadataRoute.Sitemap = (frigorificosData as { cuit: string }[]).map((f) => ({
    url: `${baseUrl}/frigorificos/${f.cuit}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Individual remate detail pages (scheduled/completed only)
  // Slug format: {consignatariaSlug}-{type}-{province}-{date}
  const remateDetailPages: MetadataRoute.Sitemap = (rematesData as {
    consignatariaSlug: string
    type: string
    province: string
    date: string
    status: string
  }[])
    .filter((r) => r.status === 'scheduled' || r.status === 'completed')
    .map((r) => {
      const slug = [
        r.consignatariaSlug || 'remate',
        r.type || 'general',
        r.province?.toLowerCase().replace(/\s+/g, '-') || 'argentina',
        r.date,
      ].join('-')
      return {
        url: `${baseUrl}/remates/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }
    })

  // NOTE: /verificar pages intentionally excluded — thin form pages
  // that dilute crawl budget. They have robots noindex set.

  // Market category price pages (/mercado/terneros, etc.)
  const marketCategoryPages: MetadataRoute.Sitemap = MARKET_CATEGORY_SLUGS.map((slug) => ({
    url: `${baseUrl}/mercado/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // City landing pages (/remates/ciudad/[ciudad]) - HUNTER BATTLE recommendation
  const citySlugs = getUniqueCitySlugs(rematesData as typeof rematesData)
  const cityPages: MetadataRoute.Sitemap = citySlugs.map((slug) => ({
    url: `${baseUrl}/remates/ciudad/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...provincePages,
    ...consignatariasByProvincePages,
    ...typePages,
    ...provinceTypePages,
    ...consignatariaPages,
    ...frigorificosByProvincePages,
    ...frigorificoPages,
    ...remateDetailPages,
    ...marketCategoryPages,
    ...cityPages,
  ]
}
