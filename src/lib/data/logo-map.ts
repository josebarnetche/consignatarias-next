/**
 * Maps canonical slugs to logo filenames
 * Logo files are in /public/logos/
 */
export const LOGO_MAP: Record<string, string> = {
  // Consignatarias
  'afa': 'afa.ico',
  'rosgan': 'rosgan.ico',
  'urien-loza': 'urien-loza.ico',
  'colombo-y-magliano': 'colombo-magliano.png',
  
  // Frigoríficos
  'swift': 'swift.ico',
  'rioplatense': 'rioplatense.png',
  'arrebeef': 'arrebeef.ico',
  'gorina': 'gorina.png',
  'coto': 'coto.png',
  'mattievich': 'mattievich.png',
}

/**
 * Get logo URL for a profile slug
 * Returns null if no logo exists
 */
export function getLogoUrl(slug: string): string | null {
  const filename = LOGO_MAP[slug]
  if (!filename) return null
  return `/logos/${filename}`
}

/**
 * Check if a logo exists for the given slug
 */
export function hasLogo(slug: string): boolean {
  return slug in LOGO_MAP
}
