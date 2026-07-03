import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getAllProfiles } from '@/lib/data/consignataria-slugs';

// Reads request.url (query params) → must render dynamically. CDN caching is
// handled via the Cache-Control header on the response below.
export const dynamic = 'force-dynamic';

/**
 * GET /api/top-followed
 * 
 * Returns the top followed consignatarias with their display names.
 * Uses admin client to bypass RLS (follower counts are public data).
 * 
 * Query params:
 * - limit: Number of results (default 5, max 20)
 * 
 * Lock-in: Social proof drives discovery and following behavior.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

    const supabase = createAdminClient();
    
    // Get follower counts from the view
    const { data: followers, error } = await supabase
      .from('consignataria_followers')
      .select('consignataria_slug, follower_count')
      .order('follower_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top followed:', error);
      return NextResponse.json({ consignatarias: [] });
    }

    // Get display names from profiles
    const profiles = getAllProfiles();
    const profileMap = new Map(
      profiles.map(p => [p.canonicalSlug, p.displayName])
    );

    // Merge data
    const consignatarias = (followers || [])
      .filter(f => profileMap.has(f.consignataria_slug ?? ''))
      .map(f => ({
        slug: f.consignataria_slug ?? '',
        displayName: profileMap.get(f.consignataria_slug ?? '') || f.consignataria_slug,
        followerCount: f.follower_count,
      }));

    return NextResponse.json({ consignatarias }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('Top followed API error:', err);
    return NextResponse.json({ consignatarias: [] });
  }
}
