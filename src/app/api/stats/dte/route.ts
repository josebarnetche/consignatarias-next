import { createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache for 24 hours

/**
 * GET /api/stats/dte
 * Returns platform-wide DTE statistics for social proof
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get total DTEs processed platform-wide
    const { count: totalDtes } = await supabase
      .from('user_dtes')
      .select('*', { count: 'exact', head: true });

    // Get total users who have uploaded at least one DTE
    const { data: activeUsers } = await supabase
      .from('user_dtes')
      .select('user_id')
      .limit(10000);

    const uniqueUsers = new Set(activeUsers?.map((u: { user_id: string }) => u.user_id) || []).size;

    // Get DTEs from last 7 days (recent activity)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentDtes } = await supabase
      .from('user_dtes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get total cabezas processed
    const { data: cabezasData } = await supabase
      .from('user_dtes')
      .select('cantidad_cabezas');
    
    const totalCabezas = cabezasData?.reduce((sum: number, d: { cantidad_cabezas: number | null }) => sum + (d.cantidad_cabezas || 0), 0) || 0;

    return NextResponse.json({
      totalDtes: totalDtes || 0,
      uniqueUsers,
      recentDtes: recentDtes || 0,
      totalCabezas,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching DTE stats:', error);
    return NextResponse.json({
      totalDtes: 0,
      uniqueUsers: 0,
      recentDtes: 0,
      totalCabezas: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
