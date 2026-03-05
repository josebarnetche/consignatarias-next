import { MetadataRoute } from 'next'

// TODO: Import these from your data sources
// import { getRemates } from '@/lib/remates'
// import { getFrigorificos } from '@/lib/frigorificos'

const PROVINCES = [
  'buenos-aires', 'cordoba', 'santa-fe', 'corrientes', 'entre-rios',
  'chaco', 'formosa', 'misiones', 'la-pampa', 'san-luis', 'mendoza',
  'salta', 'jujuy', 'tucuman', 'santiago-del-estero', 'catamarca',
  'la-rioja', 'san-juan', 'neuquen', 'rio-negro', 'chubut',
  'santa-cruz', 'tierra-del-fuego'
]

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
  ]

  // Province pages for remates
  const provincePages: MetadataRoute.Sitemap = PROVINCES.map((province) => ({
    url: `${baseUrl}/remates/${province}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // Province pages for frigorificos
  const frigorificoProvincePages: MetadataRoute.Sitemap = PROVINCES.map((province) => ({
    url: `${baseUrl}/frigorificos/${province}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // TODO: When you have dynamic data, uncomment and use:
  // const remates = await getRemates()
  // const rematePages: MetadataRoute.Sitemap = remates.map((remate) => ({
  //   url: `${baseUrl}/remates/${remate.id}`,
  //   lastModified: new Date(remate.updatedAt),
  //   changeFrequency: 'daily',
  //   priority: 0.6,
  // }))

  return [
    ...staticPages,
    ...provincePages,
    ...frigorificoProvincePages,
    // ...rematePages,
  ]
}
