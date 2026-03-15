/**
 * Profile-specific SEO enhancements for top consignatarias
 * These profiles have high impressions but low CTR - optimize for search intent
 */

export interface ProfileSEO {
  /** Enhanced title suffix */
  titleSuffix: string
  /** Rich description with keywords */
  description: string
  /** Additional keywords for meta */
  keywords: string[]
}

/**
 * SEO-optimized metadata for high-traffic profiles
 * Based on GSC data March 2026
 */
export const PROFILE_SEO: Record<string, ProfileSEO> = {
  rosgan: {
    titleSuffix: 'Catálogo y Remates de Hacienda',
    description:
      'Rosgan: calendario completo de remates ganaderos, catálogo de hacienda, precios y subastas en vivo. Consignataria líder del mercado rosarino con cobertura en Santa Fe, Córdoba y Buenos Aires.',
    keywords: [
      'rosgan catalogo',
      'rosgan remates',
      'rosgan subastas',
      'rosgan precios',
      'rosgan hacienda',
      'rosgan tv',
      'remates rosgan',
    ],
  },
  'campos-y-ganados': {
    titleSuffix: 'Remates Ganaderos y Subastas',
    description:
      'Campos y Ganados SA: remates de invernada, cría y hacienda general en Buenos Aires y La Pampa. Calendario de subastas, catálogos y transmisiones en vivo. Tradición y experiencia en consignación.',
    keywords: [
      'campos y ganados remates',
      'campos y ganados sa',
      'campos y ganados subastas',
      'campos y ganados catalogo',
    ],
  },
  reggi: {
    titleSuffix: 'Consignataria de Hacienda',
    description:
      'Reggi y Cia. SRL: consignataria de hacienda con trayectoria en el mercado ganadero argentino. Remates de cría, invernada y hacienda general. Calendario completo de subastas programadas.',
    keywords: [
      'reggi y cia',
      'reggi remates',
      'reggi consignataria',
      'reggi subastas',
      'reggi hacienda',
    ],
  },
  'bressan-y-cia': {
    titleSuffix: 'Remates de Hacienda Entre Ríos',
    description:
      'Bressan y Cia. SRL: consignataria líder en Entre Ríos con más de 50 remates anuales. Especialistas en hacienda de invernada y cría. Calendario, catálogos y transmisiones en vivo.',
    keywords: [
      'bressan remates',
      'bressan entre rios',
      'bressan consignataria',
      'bressan subastas',
    ],
  },
  'colombo-y-colombo': {
    titleSuffix: 'Remates Ganaderos Santa Fe',
    description:
      'Colombo y Colombo SA: consignataria tradicional de Santa Fe con décadas de experiencia. Remates semanales de hacienda, catálogos online y transmisiones en vivo.',
    keywords: [
      'colombo y colombo',
      'colombo remates',
      'colombo santa fe',
    ],
  },
  ofarrell: {
    titleSuffix: 'Remates de Hacienda Buenos Aires',
    description:
      "Ivan L. O'Farrell Consignataria: remates de hacienda de primera calidad en Buenos Aires. Especialistas en ganado de cabaña, invernada y cría. Calendario completo de subastas.",
    keywords: [
      'ofarrell remates',
      'ofarrell consignataria',
      'ofarrell hacienda',
    ],
  },
}

/**
 * Get SEO data for a profile, returns null if no custom SEO defined
 */
export function getProfileSEO(slug: string): ProfileSEO | null {
  return PROFILE_SEO[slug] || null
}
