import { MetadataRoute } from 'next'
import { getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import frigorificosData from '@/lib/data/frigorificos.json'
import marketPrices from '@/lib/data/market-prices.json'
import { getQualitySegments, CABEZAS_INDEX_THRESHOLD } from '@/lib/data/quality-segments'

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
/*  MONTH SLUGS (/remates/mes/[mes])                                   */
/* ------------------------------------------------------------------ */

const MONTH_SLUGS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

/* ------------------------------------------------------------------ */
/*  CITY SLUG HELPER (for /remates/ciudad/[ciudad])                    */
/* ------------------------------------------------------------------ */

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

  /* ----------------------------------------------------------------
     Honest <lastmod>: per-URL-family data dates, not a blanket
     "changed today" (which told crawlers EVERY url updates daily — a
     freshness lie that wastes crawl budget). Three sources:
       - priceDate      → INMAG/price-backed pages (market-prices.json freshness)
       - latestRemateDate → remate listing/hub pages (freshest auction in the set)
       - buildDate      → genuinely static/legal/directory pages (change on rebuild)
     Per-remate detail pages and closed INMAG year pages get their own true date.
     ---------------------------------------------------------------- */
  const buildDate = new Date()
  const priceDate = new Date(marketPrices.lastUpdate)
  // <lastmod> must never be in the future (Google ignores future lastmod). Remate
  // listing/detail pages can reference scheduled auctions months ahead, so clamp any
  // data-derived date to today — these pages are rebuilt daily anyway.
  const todayStr = new Date().toISOString().slice(0, 10)
  const clampToday = (d: string) => new Date(d > todayStr ? todayStr : d)
  const maxRemate = (rematesData as { date: string }[]).reduce((max, r) => (r.date > max ? r.date : max), '0000-00-00')
  const latestRemateDate = clampToday(maxRemate)
  const currentYear = priceDate.getFullYear()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    // Answer-pages + landings de arrendamiento creadas por el swarm GEO (2026-07-10).
    { url: `${baseUrl}/que-es-una-consignataria`, lastModified: buildDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/cuanto-vale-una-vaca`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/mercado/arrendamiento/liniers`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/mercado/arrendamiento/canuelas`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    {
      url: `${baseUrl}/overview`,
      lastModified: priceDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates/hoy`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates/manana`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/semana`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/fin-de-semana`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/anteriores`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/remates/en-vivo`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // NOTE: /mercado/vender-ahora intentionally excluded — it is noindex
    // (PRO-only calculator behind paywall).
    {
      url: `${baseUrl}/frigorificos`,
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mercado`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/inmag`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/spread`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/liniers`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/mercado/canuelas`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/indices`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/consignatarias`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/como-elegir-consignataria`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/quienes-somos`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/planes`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/enterprise`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calidad`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/metodologia`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/glosario`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/preguntas-frecuentes`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/el-corredor`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/el-oraculo`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mercado/inmag-dolares`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/mercado/novillo-historico`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mercado/internacional`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mercado/arrendamiento`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: buildDate,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: buildDate,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/aviso-legal`,
      lastModified: buildDate,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/arrepentimiento`,
      lastModified: buildDate,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/dte`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/comparar`,
      lastModified: buildDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pro`,
      lastModified: buildDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/precios`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/precios/hacienda-en-pie`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.95,
    },
    ...(['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'].map(
      (c) => ({
        url: `${baseUrl}/precios/${c}`,
        lastModified: priceDate,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      }),
    )),
    {
      url: `${baseUrl}/precios.json`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculadora`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calendario-exportar`,
      lastModified: buildDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reporte-semanal`,
      lastModified: priceDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/exportar`,
      lastModified: buildDate,
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
      lastModified: latestRemateDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Consignatarias by province landing pages
  const consignatariasByProvincePages: MetadataRoute.Sitemap = Object.entries(PROVINCE_SLUGS)
    .filter(([name]) => provincesWithAuctions.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/consignatarias/${slug}`,
      lastModified: buildDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Type landing pages (/remates/tipo/invernada, etc.)
  const typePages: MetadataRoute.Sitemap = TYPE_SLUGS.map((slug) => ({
    url: `${baseUrl}/remates/tipo/${slug}`,
    lastModified: latestRemateDate,
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
          lastModified: latestRemateDate,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    }
  }

  // Consignataria profile pages
  const consignatariaPages: MetadataRoute.Sitemap = getAllCanonicalSlugs().map((slug) => ({
    url: `${baseUrl}/consignatarias/${slug}`,
    lastModified: buildDate,
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
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  // Frigorifico detail pages
  const frigorificoPages: MetadataRoute.Sitemap = (frigorificosData as { cuit: string }[]).map((f) => ({
    url: `${baseUrl}/frigorificos/${f.cuit}`,
    lastModified: buildDate,
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
        lastModified: clampToday(r.date),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }
    })

  // NOTE: /verificar pages intentionally excluded — thin form pages
  // that dilute crawl budget. They have robots noindex set.

  // Market category price pages (/mercado/terneros, etc.)
  const marketCategoryPages: MetadataRoute.Sitemap = MARKET_CATEGORY_SLUGS.map((slug) => ({
    url: `${baseUrl}/mercado/${slug}`,
    lastModified: priceDate,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Geo × category price pages (/precios/[categoria]/[provincia]) — long-tail
  const preciosGeoPages: MetadataRoute.Sitemap = MARKET_CATEGORY_SLUGS.flatMap((cat) =>
    Object.values(PROVINCE_SLUGS).map((provSlug) => ({
      url: `${baseUrl}/precios/${cat}/${provSlug}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  )

  // Pairwise category comparison pages (/precios/comparar/[a]-vs-[b]) — 15 canonical
  // pairs. COMPARE_ORDER must match the route's order + the middleware 308 target.
  const COMPARE_ORDER = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros']
  const preciosComparePages: MetadataRoute.Sitemap = []
  for (let i = 0; i < COMPARE_ORDER.length; i++) {
    for (let j = i + 1; j < COMPARE_ORDER.length; j++) {
      preciosComparePages.push({
        url: `${baseUrl}/precios/comparar/${COMPARE_ORDER[i]}-vs-${COMPARE_ORDER[j]}`,
        lastModified: priceDate,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })
    }
  }

  // Quality-segment pages (/precios/[categoria]/calidad/[segmento]) — only the
  // substantive (non-thin) ones; thin segments are noindex and stay out of the sitemap.
  const qualitySegmentPages: MetadataRoute.Sitemap = getQualitySegments()
    .filter((s) => s.cabezas >= CABEZAS_INDEX_THRESHOLD)
    .map((s) => ({
      url: `${baseUrl}/precios/${s.categoria}/calidad/${s.segmento}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    }))

  // INMAG historical year pages (/mercado/inmag/[anio]) — compounding long-tail.
  // Closed years carry their true upper bound (Dec 31); the current year tracks priceDate.
  const inmagYearPages: MetadataRoute.Sitemap = Array.from(
    { length: 2026 - 2015 + 1 },
    (_, i) => 2015 + i,
  ).map((y) => ({
    url: `${baseUrl}/mercado/inmag/${y}`,
    lastModified: y < currentYear ? new Date(`${y}-12-31`) : priceDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // City landing pages (/remates/ciudad/[ciudad]) - HUNTER BATTLE recommendation
  const citySlugs = getUniqueCitySlugs(rematesData as typeof rematesData)
  const cityPages: MetadataRoute.Sitemap = citySlugs.map((slug) => ({
    url: `${baseUrl}/remates/ciudad/${slug}`,
    lastModified: latestRemateDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Monthly landing pages (/remates/mes/[mes]) - SEO for "remates marzo", "remates abril" etc.
  const monthPages: MetadataRoute.Sitemap = MONTH_SLUGS.map((slug) => ({
    url: `${baseUrl}/remates/mes/${slug}`,
    lastModified: latestRemateDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Origin (procedencia) pages (/mercado/origen/[provincia]) — gated to provinces in
  // PROVINCE_SLUGS (drops Chubut/Mendoza, which lack a ProvinceCluster entry).
  const origenPages: MetadataRoute.Sitemap = (marketPrices.provinceEntry.provinces as { province: string }[])
    .map((p) => PROVINCE_SLUGS[p.province])
    .filter(Boolean)
    .map((slug) => ({
      url: `${baseUrl}/mercado/origen/${slug}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
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
    ...preciosGeoPages,
    ...preciosComparePages,
    ...qualitySegmentPages,
    ...inmagYearPages,
    ...cityPages,
    ...monthPages,
    ...origenPages,
  ]
}
