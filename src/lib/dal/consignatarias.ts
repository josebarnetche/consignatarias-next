import { getProfile as getStaticProfile, getAllProfiles, type ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { createServiceClient } from '@/lib/supabase'
import { unstable_cache } from 'next/cache'

/** Stable, build-deterministic offset from a slug (no Math.random / Date). */
function slugOffset(slug: string, mod: number): number {
  if (mod <= 0) return 0
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return h % mod
}

export interface MedioPago {
  metodo: string                // 'transferencia' | 'cheque' | 'efectivo' | 'al-rinde' | 'usd-billete' | etc.
  plazo_dias?: number | null    // plazo típico de cobro
  comentario?: string | null    // condiciones, restricciones, observaciones
}

export interface EnrichedProfile {
  canonicalSlug: string
  displayName: string
  allSlugs: string[]
  // Supabase fields
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  logoUrl?: string | null
  whatsapp?: string | null
  cuit?: string | null
  category?: string | null
  province?: string | null
  location?: string | null
  verified: boolean
  featured: boolean
  claimedAt?: string | null
  mediosPago?: MedioPago[]      // PRO-gated content

  // "Persona detrás" — Sprint 1B fields. Optional, fall back gracefully in UI.
  // These exist to support the platform positioning that "el consignatario importa":
  // every profile should read as a person, not a generic SEO page.
  regionOperativa?: string | null
  especialidad?: string | null      // cria | invernada | general | reproductores | lechera | mixto
  anosOficio?: number | null
  bioReferente?: string | null
  referenteNombre?: string | null
  referenteCargo?: string | null
  fotoReferenteUrl?: string | null  // distinct from logoUrl — this is the human, not the brand
}

export interface RelatedConsignataria {
  slug: string
  name: string
  logoUrl?: string | null
  auctionCount?: number
}

export async function getRelatedConsignatarias(
  currentSlug: string,
  province: string | null | undefined,
  limit = 4
): Promise<RelatedConsignataria[]> {
  // Candidate pool = ALL canonical profiles (static source of truth, ~104),
  // not just the ~86 rows in the DB. This is the key fix: profiles without a DB
  // row (orphans) were previously never returnable as "related" to anyone, and
  // province-less profiles got an empty list (the old `if (!province) return []`).
  const all = getAllProfiles().filter((p) => p.canonicalSlug !== currentSlug)
  if (all.length === 0) return []

  // Best-effort DB enrichment: province (for geographic relevance) + logos.
  // Never throws — degrades to a static-only related list.
  const provinceBySlug: Record<string, string | null> = {}
  const logoBySlug: Record<string, string | null> = {}
  try {
    const service = createServiceClient()
    if (service) {
      const { data } = await service
        .from('consignatarias')
        .select('canonical_slug, province, logo_url')
      for (const r of (data || []) as Array<{ canonical_slug: string; province: string | null; logo_url: string | null }>) {
        provinceBySlug[r.canonical_slug] = r.province
        logoBySlug[r.canonical_slug] = r.logo_url
      }
    }
  } catch {
    /* static-only fallback */
  }

  // 1) Same-province peers first (when we know the province).
  const provinceMatches = province
    ? all.filter((p) => provinceBySlug[p.canonicalSlug] === province)
    : []

  // 2) Fill from the full roster, rotated by a deterministic hash of the current
  //    slug, so different profiles surface different peers — spreading internal-link
  //    equity across the long tail (incl. the orphan profiles) instead of always
  //    pointing at the same few. Deterministic => stable SSG output.
  const offset = slugOffset(currentSlug, all.length)
  const rotated = [...all.slice(offset), ...all.slice(0, offset)]

  const picked: ConsignatariaProfile[] = []
  const seen = new Set<string>([currentSlug])
  for (const p of [...provinceMatches, ...rotated]) {
    if (picked.length >= limit) break
    if (seen.has(p.canonicalSlug)) continue
    seen.add(p.canonicalSlug)
    picked.push(p)
  }

  return picked.map((p) => ({
    slug: p.canonicalSlug,
    name: p.displayName,
    logoUrl: logoBySlug[p.canonicalSlug] ?? null,
  }))
}

/**
 * Map of canonical_slug → logo_url for consignatarias that have a logo.
 * One query, used by the landing showcase grid (hybrid logo/name tiles).
 * Returns {} on any failure so the grid degrades to name-only tiles.
 */
export async function getConsignatariaLogoMap(): Promise<Record<string, string>> {
  try {
    const service = createServiceClient()
    if (!service) return {}
    const { data } = await service
      .from('consignatarias')
      .select('canonical_slug, logo_url')
      .not('logo_url', 'is', null)
    const map: Record<string, string> = {}
    for (const r of (data || []) as Array<{ canonical_slug: string; logo_url: string | null }>) {
      if (r.logo_url) map[r.canonical_slug] = r.logo_url
    }
    return map
  } catch {
    return {}
  }
}

export async function getConsignatariaProfile(slug: string): Promise<EnrichedProfile | null> {
  const staticProfile = getStaticProfile(slug)
  if (!staticProfile) return null

  try {
    const service = createServiceClient()
    if (!service) {
      // Fallback to static-only profile if Supabase unavailable
      return {
        ...staticProfile,
        verified: false,
        featured: false,
      }
    }
    
    const { data } = await service
      .from('consignatarias')
      .select('*')
      .eq('canonical_slug', slug)
      .single()

    // TODO(canon): columna medios_pago no existe en prod — feature rota, reconciliar (Proyecto C)
    const mediosPago: MedioPago[] = []

    return {
      ...staticProfile,
      phone: data?.phone || null,
      email: data?.email || null,
      website: data?.website || null,
      description: data?.description || null,
      logoUrl: data?.logo_url || null,
      whatsapp: data?.whatsapp || null,
      cuit: data?.cuit || null,
      category: data?.category || null,
      province: data?.province || null,
      location: data?.location || null,
      verified: data?.verified || false,
      featured: data?.featured || false,
      claimedAt: data?.claimed_at || null,
      mediosPago,
      regionOperativa: data?.region_operativa || null,
      especialidad: data?.especialidad || null,
      anosOficio: data?.anos_oficio || null,
      bioReferente: data?.bio_referente || null,
      referenteNombre: data?.referente_nombre || null,
      referenteCargo: data?.referente_cargo || null,
      fotoReferenteUrl: data?.foto_referente_url || null,
    }
  } catch {
    // Fallback to static-only profile if Supabase unavailable
    return {
      ...staticProfile,
      verified: false,
      featured: false,
    }
  }
}

/**
 * Get follower count for a consignataria
 * Social proof: "X productores siguen esta consignataria"
 * Lock-in: Creates social validation and FOMO
 */
async function _getFollowerCount(slug: string): Promise<number> {
  try {
    const service = createServiceClient()
    if (!service) return 0
    
    const { data, error } = await service
      .from('consignataria_followers')
      .select('follower_count')
      .eq('consignataria_slug', slug)
      .single()

    if (error || !data) return 0
    return data.follower_count || 0
  } catch {
    return 0
  }
}

// Cached version - revalidates hourly (follower counts don't change fast)
export const getFollowerCount = unstable_cache(
  _getFollowerCount,
  ['consignataria-followers'],
  { revalidate: 3600 }
)

/**
 * Get top followed consignatarias
 * Used for "trending" or "popular" sections
 */
export async function getTopFollowedConsignatarias(limit = 10): Promise<{ slug: string; count: number }[]> {
  try {
    const service = createServiceClient()
    if (!service) return []
    
    const { data } = await service
      .from('consignataria_followers')
      .select('consignataria_slug, follower_count')
      .order('follower_count', { ascending: false })
      .limit(limit)

    return (data || []).map(d => ({
      slug: d.consignataria_slug ?? '',
      count: d.follower_count ?? 0,
    }))
  } catch {
    return []
  }
}
