import { getProfile as getStaticProfile } from '@/lib/data/consignataria-slugs'
import { createServiceClient } from '@/lib/supabase'

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
  if (!province) return []

  try {
    const service = createServiceClient()
    const { data } = await service
      .from('consignatarias')
      .select('canonical_slug, display_name, logo_url')
      .eq('province', province)
      .neq('canonical_slug', currentSlug)
      .limit(limit)

    return (data || []).map((c: { canonical_slug: string; display_name: string; logo_url: string | null }) => ({
      slug: c.canonical_slug,
      name: c.display_name,
      logoUrl: c.logo_url,
    }))
  } catch {
    return []
  }
}

export async function getConsignatariaProfile(slug: string): Promise<EnrichedProfile | null> {
  const staticProfile = getStaticProfile(slug)
  if (!staticProfile) return null

  try {
    const service = createServiceClient()
    const { data } = await service
      .from('consignatarias')
      .select('*')
      .eq('canonical_slug', slug)
      .single()

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
