import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const FOUNDER_SPOTS_TOTAL = 50

/**
 * GET /api/stats/pro-spots
 * 
 * Returns founder spots remaining for PRO plan urgency messaging.
 * Shows how many of the first 50 spots are still available.
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Count active PRO subscribers. Paid tier lives in user_subscriptions
    // (tier='pro'), NOT consignatarias.subscription_tier (that column does
    // not exist — the old query silently fell through to the 50/50 fallback).
    const { count, error } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'pro')
      .eq('status', 'active')

    if (error) {
      throw error
    }

    const proCount = count || 0
    const spotsRemaining = Math.max(0, FOUNDER_SPOTS_TOTAL - proCount)
    const percentageTaken = Math.round((proCount / FOUNDER_SPOTS_TOTAL) * 100)

    const response = NextResponse.json({
      success: true,
      data: {
        total: FOUNDER_SPOTS_TOTAL,
        taken: proCount,
        remaining: spotsRemaining,
        percentageTaken,
        // Add urgency levels for UI treatment
        urgency: spotsRemaining <= 5 ? 'critical' : spotsRemaining <= 15 ? 'high' : spotsRemaining <= 30 ? 'medium' : 'low'
      },
      timestamp: new Date().toISOString()
    })

    // Cache for 5 minutes (balance freshness vs load)
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('Error fetching PRO spots:', error)
    // Return fallback data on error - don't break the page
    return NextResponse.json({
      success: true,
      data: {
        total: FOUNDER_SPOTS_TOTAL,
        taken: 0,
        remaining: FOUNDER_SPOTS_TOTAL,
        percentageTaken: 0,
        urgency: 'low'
      },
      timestamp: new Date().toISOString()
    })
  }
}
