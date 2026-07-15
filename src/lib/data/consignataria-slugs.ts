import type { Auction } from '@/lib/db/schema'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export interface ConsignatariaProfile {
  canonicalSlug: string
  displayName: string
  allSlugs: string[]
}

/* ------------------------------------------------------------------ */
/*  PROFILE REGISTRY  (104 unique entities — THE canonical public count;
    getAllProfiles().length feeds landing, /consignatarias, header & /stats)  */
/* ------------------------------------------------------------------ */

const PROFILES: ConsignatariaProfile[] = [
  { canonicalSlug: 'afa', displayName: 'Agricultores Federados Argentinos SCL', allSlugs: ['afa', 'agricultores-federados-argentinos-soc-coop-lt'] },
  { canonicalSlug: 'aj-mendizabal', displayName: 'A.J. Mendizabal', allSlugs: ['aj-mendizabal'] },
  { canonicalSlug: 'aguerre', displayName: 'Aguerre SRL', allSlugs: ['aguerre', 'aguerre-srl', 'aguerre-s-r-l'] },
  { canonicalSlug: 'aguirre-vazquez', displayName: 'Aguirre Vazquez SA', allSlugs: ['aguirre-vazquez', 'aguirre-vazquez-s-a'] },
  
  { canonicalSlug: 'alianza-ganadera', displayName: 'Alianza Ganadera (Coop. Sunchales)', allSlugs: ['alianza-ganadera-coop-sunchale'] },
  { canonicalSlug: 'alzaga-unzue', displayName: 'Alzaga Unzué y Cia. SA', allSlugs: ['alzaga-unzue', 'alzaga-unzue-y-cia-s-a'] },
  { canonicalSlug: 'amoz', displayName: 'Pedro Manuel Amoz y Cia. SA', allSlugs: ['amoz', 'pedro-manuel-amoz-y-cia-s-a'] },
  { canonicalSlug: 'ariel-saenz', displayName: 'Ariel Saenz y Cia', allSlugs: ['ariel-saenz-y-cia'] },
  { canonicalSlug: 'arzoz', displayName: 'Arzoz y Cia SA', allSlugs: ['arzoz'] },
  { canonicalSlug: 'bressan-y-cia', displayName: 'Bressan y Cia. SRL', allSlugs: ['bressan', 'bressan-y-cia-s-r-l', 'bressan-y-cia-srl'] },
  { canonicalSlug: 'campos-y-ganados', displayName: 'Campos y Ganados SA', allSlugs: ['campos-y-ganados', 'campos-y-ganados-s-a', 'campos-y-ganados-sa'] },
  { canonicalSlug: 'casa-usandizaga', displayName: 'Casa Usandizaga SA', allSlugs: ['casa-usandizaga', 'casa-usandizaga-s-a'] },
  { canonicalSlug: 'colombo-y-colombo', displayName: 'Colombo y Colombo SA', allSlugs: ['colombo-y-colombo', 'colombo-y-colombo-sa', 'colombo-y-colombo-s-a'] },
  { canonicalSlug: 'colombo-y-magliano', displayName: 'Colombo y Magliano SA', allSlugs: ['colombo-y-magliano', 'colombo-y-magliano-s-a', 'colombo-y-magliano-sa', 'colombo-y-maliagno2'] },
  { canonicalSlug: 'consignataria-serrano', displayName: 'Consignataria Serrano SA', allSlugs: ['consignataria-serrano', 'consignataria-serrano-s-a'] },
  { canonicalSlug: 'cooperativa-guillermo-lehmann', displayName: 'Cooperativa Guillermo Lehmann', allSlugs: ['cooperativa-guillermo-lehmann', 'coop-agric-ganad-ltda-guillermo-lehmann', 'cooperativa-lehmann', 'coop-lehmann', 'coop-guillermo-lehmann'] },
  { canonicalSlug: 'cooperativa-portena', displayName: 'Cooperativa Porteña Ltda.', allSlugs: ['cooperativa-portena'] },
  { canonicalSlug: 'cripco-obera', displayName: 'CRIPCO Oberá', allSlugs: ['cripco-obera'] },
  { canonicalSlug: 'daniel-blanco', displayName: 'Daniel Blanco y Cia. SA', allSlugs: ['daniel-blanco', 'daniel-blanco-y-cia-s-a'] },
  { canonicalSlug: 'darwash', displayName: 'Darwash SA', allSlugs: ['darwash-s-a'] },
  { canonicalSlug: 'etchevehere-rural', displayName: 'Etchevehere Rural SRL', allSlugs: ['etchevehere-rural', 'etchevehere-rural-s-r-l', 'etchevehere-rural-com-ar'] },
  { canonicalSlug: 'ferias-rauch', displayName: 'Ferias Rauch SA', allSlugs: ['ferias-rauch', 'ferias-rauch-s-a', 'ferias-rauch-sa', 'f-rauch'] },
  { canonicalSlug: 'ferias-rodeo-huinca', displayName: 'Ferias Rodeo Huinca SRL', allSlugs: ['ferias-rodeo-huinca-s-r-l'] },
  { canonicalSlug: 'ferialvarez', displayName: 'Ferialvarez SRL', allSlugs: ['ferialvarez', 'ferialvarez-s-r-l'] },
  { canonicalSlug: 'ferias-rurales-25-de-mayo', displayName: 'Ferias Rurales de 25 de Mayo SA', allSlugs: ['ferias-rurales-de-25-de-mayo-s-a'] },
  { canonicalSlug: 'ganadera-salliquelo', displayName: 'Ganadera Salliqueló SA', allSlugs: ['ganadera-salliquelo', 'ganadera-salliquelo-s-a', 'ganadera-salliquelo-sa'] },
  { canonicalSlug: 'ganaderos-de-elordi', displayName: 'Ganaderos de Elordi SA', allSlugs: ['ganaderos-de-elordi-s-a', 'ganaderos-elordi', 'elordi'] },
  { canonicalSlug: 'ganaderos-de-ceres', displayName: 'Ganaderos de Ceres Coop. Ltda.', allSlugs: ['ganaderos-de-ceres', 'ganaderos-de-ceres-cooperativa-ltda'] },
  { canonicalSlug: 'ganaderos-de-formosa', displayName: 'Ganaderos de Formosa SRL', allSlugs: ['ganaderos-de-formosa', 'ganaderos-formosa', 'ganaderos-de-formosa-s-r-l'] },
  { canonicalSlug: 'ganaderos-de-general-acha', displayName: 'Ganaderos de General Acha SA', allSlugs: ['ganaderos-de-general-acha-s-a', 'ganaderos-de-general-acha-sa', 'ganaderos-gral-acha'] },
  { canonicalSlug: 'ganados-remates', displayName: 'Ganados Remates SA', allSlugs: ['ganados-remates', 'ganados-remates-s-a'] },
  { canonicalSlug: 'gananor-pujol', displayName: 'Gananor Pujol SA', allSlugs: ['gananor-pujol', 'gananor-pujol-s-a'] },
  { canonicalSlug: 'h-nieva', displayName: 'H. Nieva y Asociados', allSlugs: ['h-nieva-y-asociados'] },
  { canonicalSlug: 'haciendas-federales', displayName: 'Haciendas Federales SRL', allSlugs: ['haciendas-federales', 'haciendas-federales-srl'] },
  { canonicalSlug: 'hasenkamp', displayName: 'Consignataria Hasenkamp SRL', allSlugs: ['hasenkamp', 'consignataria-hasenkamp-s-r-l'] },
  { canonicalSlug: 'herrero-hnos', displayName: 'Herrero Hnos. SRL', allSlugs: ['herrero-hnos', 'herrero-hermanos', 'herrero-hnos-srl'] },
  { canonicalSlug: 'hk-agro', displayName: 'HK Agro SRL', allSlugs: ['hk-agro'] },
  { canonicalSlug: 'ildarraz-hnos', displayName: 'Ildarraz Hnos', allSlugs: ['ildarraz-hnos', 'ildarraz-hnos-s-a'] },
  { canonicalSlug: 'j-s-russo', displayName: 'J. S. Russo y Cia. SA', allSlugs: ['j-s-russo-cia-s-a'] },
  { canonicalSlug: 'jauregui-lorda', displayName: 'Jauregui Lorda SRL', allSlugs: ['jauregui-lorda', 'jauregui-lorda-s-r-l', 'jauregui-lorda-haciendas'] },
  { canonicalSlug: 'javier-bardin', displayName: 'Javier Bardin', allSlugs: ['javier-bardin'] },
  { canonicalSlug: 'kofman-y-lissarrague', displayName: 'Kofman y Lissarrague SRL', allSlugs: ['kofman-y-lissarrague', 'kofman-y-lissarrague-srl'] },
  { canonicalSlug: 'javier-ulises-avalos', displayName: 'Javier Ulises Avalos', allSlugs: ['javier-ulises-avalos'] },
  { canonicalSlug: 'la-ganadera', displayName: 'Coop. La Ganadera', allSlugs: ['la-ganadera', 'coop-la-ganadera', 'coop-la-ganadera-gral-ramirez-ltda'] },
  { canonicalSlug: 'lalor', displayName: 'Martin G. Lalor SA', allSlugs: ['lalor', 'martin-g-lalor-s-a', 'martin-g-lalor'] },
  { canonicalSlug: 'lanser', displayName: 'Carlos J. Lanser SA', allSlugs: ['lanser', 'carlos-j-lanser-s-a'] },
  { canonicalSlug: 'marcos-matteucci', displayName: 'Marcos Matteucci', allSlugs: ['marcos-matteucci'] },
  { canonicalSlug: 'mondino', displayName: 'Alfredo Sebastián Mondino', allSlugs: ['mondino', 'alfredo-sebastian-mondino', 'alfredo-smondino', 'alfredo-s-mondino'] },
  { canonicalSlug: 'monasterio-tattersall', displayName: 'Monasterio Tattersall SA', allSlugs: ['monasterio-tattersall', 'monasterio-tattersall-s-a', 'monasterio'] },
  { canonicalSlug: 'nangapiry', displayName: 'Nangapiry SA', allSlugs: ['nangapiry'] },
  { canonicalSlug: 'nestor-fuentes', displayName: 'Nestor Hugo Fuentes', allSlugs: ['nestor-fuentes', 'nestor-hugo-fuentes-s-a', 'nestor-hugo-fuentes-sa'] },
  { canonicalSlug: 'ofarrell', displayName: "Ivan L. O'Farrell Consignataria", allSlugs: ['ofarrell', 'ivan-l-ofarrell-srl', 'ivan-l-o-farrell-s-r-l', 'o-farrell'] },
  { canonicalSlug: 'oregui', displayName: 'Oregui Cia SA', allSlugs: ['oregui', 'oregui-cia-sa'] },
  { canonicalSlug: 'orella', displayName: 'Orella SRL', allSlugs: ['orella'] },
  { canonicalSlug: 'pastore', displayName: 'Edgar E. Pastore y Cia. SRL', allSlugs: ['pastore', 'edgar-e-pastore-y-cia-s-r-l'] },
  { canonicalSlug: 'pedro-noel-irey', displayName: 'Pedro Noel Irey SRL', allSlugs: ['pedro-noel-irey', 'pedro-noel-irey-s-r-l'] },
  { canonicalSlug: 'pepa-knubel-ferrero', displayName: 'Pepa, Knubel y Ferrero SRL', allSlugs: ['pepa-knubel-ferrero', 'pepa-knubel-y-ferrero-s-r-l'] },
  { canonicalSlug: 'productores-rurales-sud', displayName: 'Productores Rurales del Sud Coop. Ltda.', allSlugs: ['productores-rurales-sud'] },
  { canonicalSlug: 'raul-mendizabal', displayName: 'Raul Mendizabal y Cia. SAC', allSlugs: ['raul-mendizabal-y-cia-sac'] },
  { canonicalSlug: 'reggi', displayName: 'Reggi y Cia. SRL', allSlugs: ['reggi', 'reggi-y-cia', 'reggi-y-cia-s-r-l'] },
  { canonicalSlug: 'rodriguez-egana', displayName: 'Horacio Rodriguez Egaña', allSlugs: ['rodriguez-egana', 'horacio-rodriguez-egana-consignaciones-s-r-l', 'hre'] },
  { canonicalSlug: 'rosgan', displayName: 'Rosgan', allSlugs: ['rosgan'] },
  { canonicalSlug: 's-l-ledesma', displayName: 'S. L. Ledesma y Cia. SA', allSlugs: ['s-l-ledesma', 's-l-ledesma-y-cia-s-a', 'ledesma'] },
  { canonicalSlug: 'saenz-valiente-bullrich', displayName: 'Saenz Valiente, Bullrich y Cia. SA', allSlugs: ['saenz-valiente-bullrich', 'saenz-valiente-bullrich-y-cia-', 'saenz-valiente-bullrich-y-cia-s-a'] },
  { canonicalSlug: 'sivero', displayName: 'Sivero y Cia. SA', allSlugs: ['sivero', 'sivero-y-cia-s-a'] },
  { canonicalSlug: 'trade-food', displayName: 'Trade Food SA', allSlugs: ['trade-food-s-a'] },
  { canonicalSlug: 'tradicion-ganadera', displayName: 'Tradición Ganadera SA', allSlugs: ['tradicion-ganadera', 'tradicion-ganadera-sa-porro-srl'] },
  { canonicalSlug: 'travaglia', displayName: 'Eduardo A. Travaglia y Cia. SA', allSlugs: ['travaglia', 'eduardo-a-travaglia-y-cia-s-a', 'eduardo-a-travaglia-y-cia-sa'] },
  { canonicalSlug: 'umc-villaguay', displayName: 'UMC SA - Haciendas Villaguay SRL', allSlugs: ['umc-villaguay', 'umc-haciendas-villaguay'] },
  { canonicalSlug: 'vicar-ganadera', displayName: 'Vicar Ganadera SA', allSlugs: ['vicar-ganadera', 'vicar-ganadera-s-a'] },
  { canonicalSlug: 'wallace-hnos', displayName: 'Wallace Hnos. SA', allSlugs: ['wallace-hnos-s-a', 'wallace-sa'] },

  // Added 2026-05-24 — these had remates but no profile entry, so the detail
  // page 404'd on redirect (data-integrity audit P1 "unresolvable-slugs").
  { canonicalSlug: 'hourcade-albelo', displayName: 'Hourcade, Albelo y Cía. SA', allSlugs: ['hourcade-albelo', 'hourcade-albelo-y-cia-s-a', 'hourcade-albelo-y-cia'] },
  { canonicalSlug: 'consignataria-bh', displayName: 'Consignataria BH SRL', allSlugs: ['consignataria-bh', 'consignataria-bh-s-r-l'] },
  { canonicalSlug: 'paz-hnos', displayName: 'Compañía Consignataria Paz Hnos. SRL', allSlugs: ['paz-hnos', 'compania-consignataria-paz-hnos-s-r-l'] },
  { canonicalSlug: 'lanusse-santillan', displayName: 'Lanusse-Santillán y Cía. SA', allSlugs: ['lanusse-santillan', 'lanusse-santillan-y-cia-s-a'] },
  { canonicalSlug: 'consignataria-galarraga', displayName: 'Consignataria Galarraga SA', allSlugs: ['consignataria-galarraga', 'consignataria-galarraga-s-a'] },
  { canonicalSlug: 'esteban-abelenda', displayName: 'Esteban Abelenda SA', allSlugs: ['esteban-abelenda', 'esteban-abelenda-s-a', 'esteban-i-abelenda-s-a'] },
  { canonicalSlug: 'de-la-serna', displayName: 'Jorge y Martín de la Serna SRL', allSlugs: ['de-la-serna', 'jorge-y-martin-de-la-serna-s-r-l', 'jorge-y-martin-de-la-serna'] },
  { canonicalSlug: 'duhalde', displayName: 'Duhalde y Cía. SRL', allSlugs: ['duhalde', 'duhalde-y-cia-s-r-l'] },
  { canonicalSlug: 'talano-hermanos', displayName: 'Talano Hermanos SRL', allSlugs: ['talano-hermanos', 'talano-hermanos-s-r-l', 'talano-hnos', 'talano-hnos-s-a'] },

  // Curated 2026-05-25 — real consignatarias that had remates but no profile
  // (were rendering as synthesized/uncurated). Now indexable. The 2 junk
  // scraper slugs (sociedad-agricola-ganadera-ltda2, cyg-n-hacienda2) are left
  // uncurated on purpose.
  { canonicalSlug: 'madelan', displayName: 'Madelán y Cía.', allSlugs: ['madelan', 'madelan-y-cia'] },
  { canonicalSlug: 'a-mendizabal', displayName: 'A. Mendizábal', allSlugs: ['a-mendizabal', 'ricardo-mendizabal-consignaciones-s-r-l'] },
  { canonicalSlug: 'lartirigoyen', displayName: 'Lartirigoyen', allSlugs: ['lartirigoyen'] },
  { canonicalSlug: 'arzuaga', displayName: 'Néstor A. Arzuaga y Cía. S.C.A.', allSlugs: ['arzuaga', 'nestor-a-arzuaga-y-cia-s-c-a'] },
  { canonicalSlug: 'melicur-ganados', displayName: 'Melicur Ganados', allSlugs: ['melicur-ganados'] },
  { canonicalSlug: 'melicura', displayName: 'Consignataria Melicura', allSlugs: ['melicura', 'consignataria-melicura'] },
  { canonicalSlug: 'martin-y-alonso', displayName: 'Martín y Alonso', allSlugs: ['martin-y-alonso'] },
  { canonicalSlug: 'sucesores-de-brivio', displayName: 'Sucesores de Brivio', allSlugs: ['sucesores-de-brivio'] },
  { canonicalSlug: 'brivio-y-arzoz', displayName: 'Brivio y Arzoz', allSlugs: ['brivio-y-arzoz'] },
  { canonicalSlug: 'arribere', displayName: 'Arribere', allSlugs: ['arribere'] },
  { canonicalSlug: 'ferias-lito-araneta', displayName: 'Ferias Lito Araneta e Hijos SA', allSlugs: ['ferias-lito-araneta', 'ferias-lito-araneta-e-hijos-s-a'] },
  { canonicalSlug: 'gregorio-aberasturi', displayName: 'Gregorio Aberasturi SRL', allSlugs: ['gregorio-aberasturi', 'gregorio-aberasturi-s-r-l'] },
  { canonicalSlug: 'goenaga', displayName: 'Goenaga', allSlugs: ['goenaga'] },
  { canonicalSlug: 'consignataria-vittori', displayName: 'Consignataria Vittori', allSlugs: ['consignataria-vittori', 'vittori'] },
  { canonicalSlug: 'koerner', displayName: 'Koerner', allSlugs: ['koerner', 'adolfo-s-koerner-y-cia-s-a'] },
  // Lote 2026-07: firmas que ya rematan (aparecían en remates.json sin ficha) —
  // nombre/provincia verificados por web-research antes de curar.
  { canonicalSlug: 'aristegui', displayName: 'Hugo R. Aristegui y Cía. SRL', allSlugs: ['aristegui'] },
  { canonicalSlug: 'atreuco', displayName: 'ATREU-CO Cooperativa Agropecuaria Ltda.', allSlugs: ['atreuco'] },
  { canonicalSlug: 'bermejo-y-cia', displayName: 'Bermejo y Cía. SRL', allSlugs: ['bermejo-y-cia', 'bermejo-y-cia-s-r-l'] },
  { canonicalSlug: 'casalago', displayName: 'Casa Lago SA', allSlugs: ['casalago', 'casa-lago', 'casa-lago-s-a'] },
  { canonicalSlug: 'fraccarolli-y-ronconi', displayName: 'Fraccarolli y Ronconi SRL', allSlugs: ['fraccarolli-y-ronconi', 'fraccarolli-y-ronconi-s-r-l'] },
  { canonicalSlug: 'la-alianza-coop', displayName: 'La Alianza Coop. Agrícola Ganadera Ltda.', allSlugs: ['la-alianza-coop', 'la-alianza-cooperativa-agricola-ganadera-ltda'] },
  { canonicalSlug: 'pedro-y-raul-alonso', displayName: 'Pedro y Raúl Alonso Ganados SA', allSlugs: ['pedro-y-raul-alonso', 'pedro-y-raul-alonso-ganados-s-a'] },
  { canonicalSlug: 'remates-agropecuarios-ciasa', displayName: 'Remates Agropecuarios CIASA SA', allSlugs: ['remates-agropecuarios-ciasa', 'remates-agropecuarios-ciasa-s-a'] },
  { canonicalSlug: 'coop-agricola-ganadera-san-martin', displayName: 'Soc. Coop. Agrícola Ganadera Ltda. (Gral. San Martín)', allSlugs: ['coop-agricola-ganadera-san-martin', 'sociedad-agricola-ganadera-ltda'] },
]

/* ------------------------------------------------------------------ */
/*  LOOKUP MAPS  (built once at import time)                           */
/* ------------------------------------------------------------------ */

/** raw slug → canonical slug */
const slugToCanonical = new Map<string, string>()

/** canonical slug → profile */
const canonicalToProfile = new Map<string, ConsignatariaProfile>()

for (const profile of PROFILES) {
  canonicalToProfile.set(profile.canonicalSlug, profile)
  // Map canonical slug to itself
  slugToCanonical.set(profile.canonicalSlug, profile.canonicalSlug)
  // Map all variant slugs
  for (const slug of profile.allSlugs) {
    slugToCanonical.set(slug, profile.canonicalSlug)
  }
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Entidades que NO son consignatarias aunque el scraper las capture como
 * "organizador" de un remate: la Sociedad Rural es el PREDIO/institución donde
 * se rematiza, no la firma que rematiza (casi cada localidad ganadera tiene la
 * suya). Idem expos (Agroactiva, Expoagro), organismos públicos y el canal de TV.
 * Se filtra por PATRÓN de nombre, no por lista fija, para que generalice.
 * OJO: mantener en sync con la copia en scripts/scrape-auctions.mjs (otro runtime).
 */
export const NON_CONSIGNATARIA_RE =
  /sociedad\s+rural|\bexpoagro\b|\bagroactiva\b|expo\s+(rural|palermo|agro)|ministerio\s+de|instituto\s+de\s+desarrollo|\bidercor\b|canal\s+rural|\bghc\s*logo\b/i

/** True si el nombre corresponde a un predio/institución/evento, no a una consignataria. */
export function isNonConsignataria(name: string | null | undefined): boolean {
  return !!name && NON_CONSIGNATARIA_RE.test(name)
}

/** Get the canonical slug for any raw slug from remates.json. Returns null if unknown. */
export function getCanonicalSlug(rawSlug: string): string | null {
  return slugToCanonical.get(rawSlug) ?? null
}

/** Get the profile for a canonical slug. Returns null if not curated. */
export function getProfile(canonicalSlug: string): ConsignatariaProfile | null {
  return canonicalToProfile.get(canonicalSlug) ?? null
}

/**
 * Synthesize a minimal profile for a consignataria that has remates but isn't
 * in the curated PROFILES registry, so its profile page renders instead of
 * 404'ing. Server-only callers pass the displayName from the remate data.
 * Intentionally not part of the curated maps: these aren't pre-built or
 * sitemapped — they render on-demand (dynamicParams). Curate to promote.
 */
export function synthesizeProfile(slug: string, displayName: string): ConsignatariaProfile {
  return { canonicalSlug: slug, displayName: displayName.trim() || slug, allSlugs: [slug] }
}

/** Get all auctions that belong to a canonical slug (merges all variant slugs). */
export function getAuctionsForProfile(auctions: Auction[], canonicalSlug: string): Auction[] {
  const profile = canonicalToProfile.get(canonicalSlug)
  // Curated profile: merge across all its variant slugs.
  if (profile) {
    const slugSet = new Set(profile.allSlugs)
    return auctions.filter(a => slugSet.has(a.consignatariaSlug))
  }
  // Uncurated consignataria (synthesized profile): match the slug directly so
  // the on-demand page still shows its auctions.
  return auctions.filter(a => a.consignatariaSlug === canonicalSlug)
}

/** Get all canonical slugs (for generateStaticParams). */
export function getAllCanonicalSlugs(): string[] {
  return PROFILES.map(p => p.canonicalSlug)
}

/** Get all profiles. */
export function getAllProfiles(): ConsignatariaProfile[] {
  return PROFILES
}

/**
 * Build a path to the consignataria profile, resolving variant slugs to
 * canonical and gracefully handling null/undefined. Use this everywhere
 * an internal link is generated — avoids variant-slug 308 hops and the
 * `/consignatarias/null` render artifact.
 */
export function consignatariaProfilePath(rawSlug: string | null | undefined): string {
  if (!rawSlug || rawSlug === 'null' || rawSlug === 'undefined') return '/consignatarias'
  const canonical = slugToCanonical.get(rawSlug) ?? rawSlug
  return `/consignatarias/${canonical}`
}

/**
 * Returns variant-slug → canonical-slug entries only (excludes canonical→canonical
 * self-mappings). Intended for edge middleware redirects.
 */
export function getVariantSlugRedirects(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const profile of PROFILES) {
    for (const slug of profile.allSlugs) {
      if (slug !== profile.canonicalSlug) {
        out.push([slug, profile.canonicalSlug])
      }
    }
  }
  return out
}
