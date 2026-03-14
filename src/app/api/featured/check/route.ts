import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { createServiceClient } from '@/lib/supabase'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Check if a consignataria is "Destacado del Mes".
 * Top 10% by combined activity score (remates + profile views).
 * 
 * GET /api/featured/check?slug=bressan-y-cia
 */

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  
  if (!slug) {
    return NextResponse.json({ featured: false, error: 'Missing slug' }, { status: 400 })
  }

  const canonical = getCanonicalSlug(slug)
  if (!canonical) {
    return NextResponse.json({ featured: false, error: 'Invalid slug' })
  }

  // Get current month info
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`
  const monthName = now.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()

  try {
    // Calculate activity scores for all consignatarias
    const scores: { slug: string; score: number }[] = []
    
    // Get all unique consignataria slugs from auctions
    const allSlugs = new Set<string>()
    for (const a of auctions) {
      if (a.consignatariaSlug) {
        const cs = getCanonicalSlug(a.consignatariaSlug)
        if (cs) allSlugs.add(cs)
      }
    }

    // Get view counts for all consignatarias this month
    const service = createServiceClient()
    const { data: views } = await service
      .from('profile_views')
      .select('entity_slug')
      .eq('entity_type', 'consignataria')
      .gte('viewed_at', `${monthStart}T00:00:00`)
      .lte('viewed_at', `${monthEnd}T23:59:59`)

    const viewCounts: Record<string, number> = {}
    for (const v of views || []) {
      viewCounts[v.entity_slug] = (viewCounts[v.entity_slug] || 0) + 1
    }

    // Calculate scores
    for (const s of allSlugs) {
      const remateCount = getAuctionsForProfile(auctions, s)
        .filter(a => a.date >= monthStart && a.date <= monthEnd)
        .length
      const viewCount = viewCounts[s] || 0
      
      // Score = remates * 10 + views (remates weighted higher)
      const score = remateCount * 10 + viewCount
      scores.push({ slug: s, score })
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score)

    // Top 10% threshold
    const top10pct = Math.ceil(scores.length * 0.1)
    const topSlugs = scores.slice(0, top10pct).map(s => s.slug)

    const isFeatured = topSlugs.includes(canonical)
    const rank = scores.findIndex(s => s.slug === canonical) + 1

    return NextResponse.json({
      featured: isFeatured,
      month: monthName,
      rank: rank > 0 ? rank : null,
      totalConsignatarias: scores.length,
      threshold: top10pct,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Featured check error:', error)
    return NextResponse.json({ featured: false, error: 'Server error' }, { status: 500 })
  }
}
