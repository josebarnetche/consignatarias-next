/**
 * Logo + brand-color map for the landing "brand wall".
 *
 * Each consignataria tile uses its PRIMARY BRAND COLOR as the tile background
 * with its logo on top (the showcase forces the logo to white or black for
 * contrast). Logos were fetched from each firm's official site (favicon /
 * apple-touch-icon / header logo) and verified transparent. These are the most
 * active casas de remate in the directory — they are NOT clients.
 *
 * Logo files live in /public/logos/. Firms without a usable logo are omitted
 * (they render as plain name tiles and are slated to be dropped from the wall).
 */

// keepColor: render the logo in its own colors instead of forcing it white
// (for multicolor marks that read fine on the black tile, e.g. UMC's mascot).
// whiteLogo: el logo es BLANCO/monocromo claro → en el avatar (IdentityMark) va
// sobre el COLOR DE MARCA, no sobre la tarjeta clara (donde un logo blanco
// desaparece). Regla de Jose: el bg del avatar puede ser el color de la firma
// cuando el logotipo es blanco.
export const CONSIGNATARIA_BRANDS: Record<string, { logo: string; color: string; keepColor?: boolean; whiteLogo?: boolean; wordmark?: boolean }> = {
  'colombo-y-magliano': { logo: 'colombo-y-magliano.svg', color: '#215732', whiteLogo: true },
  'colombo-y-colombo': { logo: 'colombo-y-colombo.png', color: '#b30738', whiteLogo: true },
  'bressan-y-cia': { logo: 'bressan-y-cia.png', color: '#a99134' },
  'ofarrell': { logo: 'ofarrell.svg', color: '#183048' },
  'cooperativa-guillermo-lehmann': { logo: 'cooperativa-guillermo-lehmann.png', color: '#00924d', whiteLogo: true, wordmark: true },
  'ferias-rauch': { logo: 'ferias-rauch.png', color: '#936f54' },
  'pedro-noel-irey': { logo: 'pedro-noel-irey.svg', color: '#ff6600' },
  'daniel-blanco': { logo: 'daniel-blanco.png', color: '#81a74b' },
  'campos-y-ganados': { logo: 'campos-y-ganados.png', color: '#003c55' },
  'jauregui-lorda': { logo: 'jauregui-lorda.png', color: '#f2b705', whiteLogo: true, wordmark: true },
  // umc-villaguay omitted: multicolor mascot, doesn't read as a clean white logo.
  'etchevehere-rural': { logo: 'etchevehere-rural.png', color: '#0e2f60', whiteLogo: true, wordmark: true },
  'rosgan': { logo: 'rosgan.png', color: '#002e5f' },
  'hasenkamp': { logo: 'hasenkamp.png', color: '#fa1100' },
  'afa': { logo: 'afa.png', color: '#007848' },
  'saenz-valiente-bullrich': { logo: 'saenz-valiente-bullrich.png', color: '#003060', whiteLogo: true },
  'travaglia': { logo: 'travaglia.png', color: '#1d0a66' },
  'mondino': { logo: 'mondino.png', color: '#e06000' },
  'ganaderos-de-general-acha': { logo: 'ganaderos-de-general-acha.png', color: '#4878d8' },
  'lanser': { logo: 'lanser.png', color: '#0030a8' },
  'reggi': { logo: 'reggi.png', color: '#001830', whiteLogo: true, wordmark: true },
  'gananor-pujol': { logo: 'gananor-pujol.svg', color: '#8a1e41' },
  'hk-agro': { logo: 'hk-agro.png', color: '#e8731c' },
  'talano-hermanos': { logo: 'talano-hermanos.png', color: '#a81818' },
  'casa-usandizaga': { logo: 'casa-usandizaga.png', color: '#d81818', whiteLogo: true, wordmark: true },
  'darwash': { logo: 'darwash.svg', color: '#0d6c79', whiteLogo: true },
  'ganadera-salliquelo': { logo: 'ganadera-salliquelo.png', color: '#a08020' },
  'ganaderos-de-elordi': { logo: 'ganaderos-de-elordi.png', color: '#a81830' },
  'ganaderos-de-formosa': { logo: 'ganaderos-de-formosa.png', color: '#487830' },
  'ildarraz-hnos': { logo: 'ildarraz-hnos.png', color: '#f01800' },
  'javier-ulises-avalos': { logo: 'javier-ulises-avalos.png', color: '#001860' },
  'la-ganadera': { logo: 'la-ganadera.svg', color: '#059146' },
  'lalor': { logo: 'lalor.png', color: '#183060', whiteLogo: true, wordmark: true },
  'monasterio-tattersall': { logo: 'monasterio-tattersall.png', color: '#186030' },
  'wallace-hnos': { logo: 'wallace-hnos.png', color: '#e1251b', whiteLogo: true, wordmark: true },
  'paz-hnos': { logo: 'paz-hnos.png', color: '#24a4db', whiteLogo: true },
  'esteban-abelenda': { logo: 'esteban-abelenda.png', color: '#b33a3a', whiteLogo: true, wordmark: true },
  'consignataria-galarraga': { logo: 'consignataria-galarraga.svg', color: '#00253c' },
  'de-la-serna': { logo: 'de-la-serna.png', color: '#1f3d2e' },
  'pepa-knubel-ferrero': { logo: 'pepa-knubel-ferrero.png', color: '#0078c0' },
  'vicar-ganadera': { logo: 'vicar-ganadera.png', color: '#006090' },
}

/** Frigorífico logos (used elsewhere; no brand-wall color treatment). */
const FRIGORIFICO_LOGOS: Record<string, string> = {
  'swift': 'swift.ico',
  'rioplatense': 'rioplatense.png',
  'arrebeef': 'arrebeef.ico',
  'gorina': 'gorina.png',
  'coto': 'coto.png',
  'mattievich': 'mattievich.png',
}

/** Maps canonical slugs to logo filenames in /public/logos/. */
export const LOGO_MAP: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(CONSIGNATARIA_BRANDS).map(([slug, v]) => [slug, v.logo])
  ),
  ...FRIGORIFICO_LOGOS,
}

/** Get logo URL for a slug. Returns null if no logo exists. */
export function getLogoUrl(slug: string): string | null {
  const filename = LOGO_MAP[slug]
  return filename ? `/logos/${filename}` : null
}

/** Primary brand color (hex) for a consignataria, or null. */
export function getBrandColor(slug: string): string | null {
  return CONSIGNATARIA_BRANDS[slug]?.color ?? null
}

/**
 * Banda de hues que leen bien sobre carbón (verdes campo, azules, teja, vino,
 * ocre) — sin amarillos/limas chillones. Con S/L fijos, el color derivado NUNCA
 * sale feo ni ilegible. Esto es lo que hace que TODA firma sin color curado
 * tenga igual un color de marca estable y agradable, sin cargar nada.
 */
const IDENTITY_HUE_BAND = [152, 158, 205, 215, 224, 258, 12, 352, 28, 190]

/** Color determinístico derivado del nombre (hash → banda controlada). */
export function deriveBrandColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const hue = IDENTITY_HUE_BAND[h % IDENTITY_HUE_BAND.length]
  return `hsl(${hue} 42% 34%)`
}

/**
 * Color de IDENTIDAD de una firma: el curado si existe, si no uno derivado del
 * nombre. SIEMPRE devuelve un color válido — nunca null. Se usa como acento
 * (monograma, wash del cover) y, EXCEPCIÓN, como fondo del avatar cuando el logo
 * es blanco (whiteLogo) — donde un logo blanco necesita el color detrás.
 */
export function getIdentityColor(slug: string, name: string): string {
  return CONSIGNATARIA_BRANDS[slug]?.color ?? deriveBrandColor(name)
}

/** Whether the logo should keep its own colors (not be forced white). */
export function getBrandKeepColor(slug: string): boolean {
  return CONSIGNATARIA_BRANDS[slug]?.keepColor ?? false
}

// Logo blanco → el avatar va sobre el color de marca (no sobre tarjeta clara).
export function getBrandWhiteLogo(slug: string): boolean {
  return CONSIGNATARIA_BRANDS[slug]?.whiteLogo ?? false
}

// Wordmark ancho (horizontal) → en un avatar cuadrado queda una tirita. Se muestra
// el isotipo sobre el color de marca en su lugar (limpio y legible).
export function getBrandWordmark(slug: string): boolean {
  return CONSIGNATARIA_BRANDS[slug]?.wordmark ?? false
}

/** Check if a logo exists for the given slug. */
export function hasLogo(slug: string): boolean {
  return slug in LOGO_MAP
}
