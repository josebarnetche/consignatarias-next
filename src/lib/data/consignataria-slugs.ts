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
/*  PROFILE REGISTRY  (~60 unique entities)                            */
/* ------------------------------------------------------------------ */

const PROFILES: ConsignatariaProfile[] = [
  { canonicalSlug: 'afa', displayName: 'Agricultores Federados Argentinos SCL', allSlugs: ['afa', 'agricultores-federados-argentinos-soc-coop-lt'] },
  { canonicalSlug: 'agroactiva', displayName: 'Agroactiva', allSlugs: ['agroactiva'] },
  { canonicalSlug: 'alianza-ganadera', displayName: 'Alianza Ganadera (Coop. Sunchales)', allSlugs: ['alianza-ganadera-coop-sunchale'] },
  { canonicalSlug: 'alzaga-unzue', displayName: 'Alzaga Unzué y Cia. SA', allSlugs: ['alzaga-unzue'] },
  { canonicalSlug: 'amoz', displayName: 'Pedro Manuel Amoz y Cia. SA', allSlugs: ['amoz', 'pedro-manuel-amoz-y-cia-s-a'] },
  { canonicalSlug: 'ariel-saenz', displayName: 'Ariel Saenz y Cia', allSlugs: ['ariel-saenz-y-cia'] },
  { canonicalSlug: 'arzoz', displayName: 'Arzoz y Cia SA', allSlugs: ['arzoz'] },
  { canonicalSlug: 'bressan-y-cia', displayName: 'Bressan y Cia. SRL', allSlugs: ['bressan', 'bressan-y-cia-s-r-l', 'bressan-y-cia-srl'] },
  { canonicalSlug: 'campos-y-ganados', displayName: 'Campos y Ganados SA', allSlugs: ['campos-y-ganados', 'campos-y-ganados-s-a', 'campos-y-ganados-sa'] },
  { canonicalSlug: 'casa-usandizaga', displayName: 'Casa Usandizaga SA', allSlugs: ['casa-usandizaga', 'casa-usandizaga-s-a'] },
  { canonicalSlug: 'colombo-y-colombo', displayName: 'Colombo y Colombo SA', allSlugs: ['colombo-y-colombo', 'colombo-y-colombo-sa'] },
  { canonicalSlug: 'colombo-y-magliano', displayName: 'Colombo y Magliano SA', allSlugs: ['colombo-y-magliano', 'colombo-y-magliano-s-a', 'colombo-y-magliano-sa'] },
  { canonicalSlug: 'consignataria-serrano', displayName: 'Consignataria Serrano SA', allSlugs: ['consignataria-serrano', 'consignataria-serrano-s-a'] },
  { canonicalSlug: 'cooperativa-guillermo-lehmann', displayName: 'Cooperativa Guillermo Lehmann', allSlugs: ['cooperativa-guillermo-lehmann'] },
  { canonicalSlug: 'cooperativa-portena', displayName: 'Cooperativa Porteña Ltda.', allSlugs: ['cooperativa-portena'] },
  { canonicalSlug: 'cripco-obera', displayName: 'CRIPCO Oberá', allSlugs: ['cripco-obera'] },
  { canonicalSlug: 'daniel-blanco', displayName: 'Daniel Blanco y Cia. SA', allSlugs: ['daniel-blanco', 'daniel-blanco-y-cia-s-a'] },
  { canonicalSlug: 'darwash', displayName: 'Darwash SA', allSlugs: ['darwash-s-a'] },
  { canonicalSlug: 'etchevehere-rural', displayName: 'Etchevehere Rural SRL', allSlugs: ['etchevehere-rural'] },
  { canonicalSlug: 'ferias-rauch', displayName: 'Ferias Rauch SA', allSlugs: ['ferias-rauch', 'ferias-rauch-s-a', 'ferias-rauch-sa'] },
  { canonicalSlug: 'ferias-rodeo-huinca', displayName: 'Ferias Rodeo Huinca SRL', allSlugs: ['ferias-rodeo-huinca-s-r-l'] },
  { canonicalSlug: 'ferias-rurales-25-de-mayo', displayName: 'Ferias Rurales de 25 de Mayo SA', allSlugs: ['ferias-rurales-de-25-de-mayo-s-a'] },
  { canonicalSlug: 'ganadera-salliquelo', displayName: 'Ganadera Salliqueló SA', allSlugs: ['ganadera-salliquelo', 'ganadera-salliquelo-s-a', 'ganadera-salliquelo-sa'] },
  { canonicalSlug: 'ganaderos-de-elordi', displayName: 'Ganaderos de Elordi SA', allSlugs: ['ganaderos-de-elordi-s-a', 'ganaderos-elordi'] },
  { canonicalSlug: 'ganaderos-de-formosa', displayName: 'Ganaderos de Formosa SRL', allSlugs: ['ganaderos-de-formosa', 'ganaderos-formosa'] },
  { canonicalSlug: 'ganaderos-de-general-acha', displayName: 'Ganaderos de General Acha SA', allSlugs: ['ganaderos-de-general-acha-s-a', 'ganaderos-de-general-acha-sa', 'ganaderos-gral-acha'] },
  { canonicalSlug: 'ganados-remates', displayName: 'Ganados Remates SA', allSlugs: ['ganados-remates'] },
  { canonicalSlug: 'gananor-pujol', displayName: 'Gananor Pujol SA', allSlugs: ['gananor-pujol'] },
  { canonicalSlug: 'h-nieva', displayName: 'H. Nieva y Asociados', allSlugs: ['h-nieva-y-asociados'] },
  { canonicalSlug: 'hasenkamp', displayName: 'Consignataria Hasenkamp SRL', allSlugs: ['hasenkamp', 'consignataria-hasenkamp-s-r-l'] },
  { canonicalSlug: 'hk-agro', displayName: 'HK Agro SRL', allSlugs: ['hk-agro'] },
  { canonicalSlug: 'idercor', displayName: 'IderCor', allSlugs: ['idercor'] },
  { canonicalSlug: 'j-s-russo', displayName: 'J. S. Russo y Cia. SA', allSlugs: ['j-s-russo-cia-s-a'] },
  { canonicalSlug: 'jauregui-lorda', displayName: 'Jauregui Lorda SRL', allSlugs: ['jauregui-lorda', 'jauregui-lorda-s-r-l'] },
  { canonicalSlug: 'javier-bardin', displayName: 'Javier Bardin', allSlugs: ['javier-bardin'] },
  { canonicalSlug: 'javier-ulises-avalos', displayName: 'Javier Ulises Avalos', allSlugs: ['javier-ulises-avalos'] },
  { canonicalSlug: 'la-ganadera', displayName: 'Coop. La Ganadera', allSlugs: ['la-ganadera', 'coop-la-ganadera'] },
  { canonicalSlug: 'lalor', displayName: 'Martin G. Lalor SA', allSlugs: ['lalor', 'martin-g-lalor-s-a'] },
  { canonicalSlug: 'lanser', displayName: 'Carlos J. Lanser SA', allSlugs: ['lanser', 'carlos-j-lanser-s-a'] },
  { canonicalSlug: 'marcos-matteucci', displayName: 'Marcos Matteucci', allSlugs: ['marcos-matteucci'] },
  { canonicalSlug: 'mondino', displayName: 'Alfredo Sebastián Mondino', allSlugs: ['mondino', 'alfredo-sebastian-mondino'] },
  { canonicalSlug: 'monasterio-tattersall', displayName: 'Monasterio Tattersall SA', allSlugs: ['monasterio-tattersall', 'monasterio-tattersall-s-a'] },
  { canonicalSlug: 'nangapiry', displayName: 'Nangapiry SA', allSlugs: ['nangapiry'] },
  { canonicalSlug: 'nestor-fuentes', displayName: 'Nestor Hugo Fuentes', allSlugs: ['nestor-fuentes'] },
  { canonicalSlug: 'ofarrell', displayName: "Ivan L. O'Farrell Consignataria", allSlugs: ['ofarrell'] },
  { canonicalSlug: 'oregui', displayName: 'Oregui Cia SA', allSlugs: ['oregui-cia-sa'] },
  { canonicalSlug: 'orella', displayName: 'Orella SRL', allSlugs: ['orella'] },
  { canonicalSlug: 'pastore', displayName: 'Edgar E. Pastore y Cia. SRL', allSlugs: ['pastore', 'edgar-e-pastore-y-cia-s-r-l'] },
  { canonicalSlug: 'pedro-noel-irey', displayName: 'Pedro Noel Irey SRL', allSlugs: ['pedro-noel-irey', 'pedro-noel-irey-s-r-l'] },
  { canonicalSlug: 'pepa-knubel-ferrero', displayName: 'Pepa, Knubel y Ferrero SRL', allSlugs: ['pepa-knubel-ferrero', 'pepa-knubel-y-ferrero-s-r-l'] },
  { canonicalSlug: 'produccion-chaco', displayName: 'Ministerio de Producción del Chaco', allSlugs: ['produccion-chaco'] },
  { canonicalSlug: 'productores-rurales-sud', displayName: 'Productores Rurales del Sud Coop. Ltda.', allSlugs: ['productores-rurales-sud'] },
  { canonicalSlug: 'raul-mendizabal', displayName: 'Raul Mendizabal y Cia. SAC', allSlugs: ['raul-mendizabal-y-cia-sac'] },
  { canonicalSlug: 'reggi', displayName: 'Reggi y Cia. SRL', allSlugs: ['reggi', 'reggi-y-cia', 'reggi-y-cia-s-r-l'] },
  { canonicalSlug: 'rodriguez-egana', displayName: 'Horacio Rodriguez Egaña', allSlugs: ['rodriguez-egana'] },
  { canonicalSlug: 'rosgan', displayName: 'Rosgan', allSlugs: ['rosgan'] },
  { canonicalSlug: 'rural-chaco', displayName: 'Sociedad Rural del Chaco', allSlugs: ['rural-chaco'] },
  { canonicalSlug: 'rural-corrientes', displayName: 'Sociedad Rural de Corrientes', allSlugs: ['rural-corrientes'] },
  { canonicalSlug: 'rural-gualeguaychu', displayName: 'Sociedad Rural de Gualeguaychú', allSlugs: ['rural-gualeguaychu'] },
  { canonicalSlug: 'rural-misiones', displayName: 'Sociedad Rural de Misiones', allSlugs: ['rural-misiones'] },
  { canonicalSlug: 'rural-rafaela', displayName: 'Sociedad Rural de Rafaela', allSlugs: ['rural-rafaela'] },
  { canonicalSlug: 's-l-ledesma', displayName: 'S. L. Ledesma y Cia. SA', allSlugs: ['s-l-ledesma-y-cia-s-a'] },
  { canonicalSlug: 'saenz-valiente-bullrich', displayName: 'Saenz Valiente, Bullrich y Cia. SA', allSlugs: ['saenz-valiente-bullrich', 'saenz-valiente-bullrich-y-cia-', 'saenz-valiente-bullrich-y-cia-s-a'] },
  { canonicalSlug: 'sivero', displayName: 'Sivero y Cia. SA', allSlugs: ['sivero', 'sivero-y-cia-s-a'] },
  { canonicalSlug: 'trade-food', displayName: 'Trade Food SA', allSlugs: ['trade-food-s-a'] },
  { canonicalSlug: 'tradicion-ganadera', displayName: 'Tradición Ganadera SA', allSlugs: ['tradicion-ganadera'] },
  { canonicalSlug: 'travaglia', displayName: 'Eduardo A. Travaglia y Cia. SA', allSlugs: ['travaglia', 'eduardo-a-travaglia-y-cia-s-a', 'eduardo-a-travaglia-y-cia-sa'] },
  { canonicalSlug: 'umc-villaguay', displayName: 'UMC SA - Haciendas Villaguay SRL', allSlugs: ['umc-villaguay', 'umc-haciendas-villaguay'] },
  { canonicalSlug: 'vicar-ganadera', displayName: 'Vicar Ganadera SA', allSlugs: ['vicar-ganadera', 'vicar-ganadera-s-a'] },
  { canonicalSlug: 'wallace-hnos', displayName: 'Wallace Hnos. SA', allSlugs: ['wallace-hnos-s-a'] },
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

/** Get the canonical slug for any raw slug from remates.json. Returns null if unknown. */
export function getCanonicalSlug(rawSlug: string): string | null {
  return slugToCanonical.get(rawSlug) ?? null
}

/** Get the profile for a canonical slug. Returns null if not found. */
export function getProfile(canonicalSlug: string): ConsignatariaProfile | null {
  return canonicalToProfile.get(canonicalSlug) ?? null
}

/** Get all auctions that belong to a canonical slug (merges all variant slugs). */
export function getAuctionsForProfile(auctions: Auction[], canonicalSlug: string): Auction[] {
  const profile = canonicalToProfile.get(canonicalSlug)
  if (!profile) return []
  const slugSet = new Set(profile.allSlugs)
  return auctions.filter(a => slugSet.has(a.consignatariaSlug))
}

/** Get all canonical slugs (for generateStaticParams). */
export function getAllCanonicalSlugs(): string[] {
  return PROFILES.map(p => p.canonicalSlug)
}

/** Get all profiles. */
export function getAllProfiles(): ConsignatariaProfile[] {
  return PROFILES
}
