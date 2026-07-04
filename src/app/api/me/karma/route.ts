import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentSession } from '@/lib/user-tier'
import { createAdminClient } from '@/lib/supabase-server'
import { computeKarma } from '@/lib/karma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/karma — karma del productor logueado (reputación como contribuidor).
 * Entradas: hacienda cargada en Mi Ganado + marcas de remates/consignatarias +
 * antigüedad. Sin sesión → { loggedIn: false }.
 */
export async function GET() {
  const { user } = await getCurrentSession()
  if (!user) return NextResponse.json({ loggedIn: false })

  const admin = createAdminClient()

  // Hacienda cargada (cabezas) + antigüedad (proxy: created_at del rodeo).
  let cabezas = 0
  let tenureMonths = 0
  const { data: ganado } = await admin
    .from('user_ganado')
    .select('items, created_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (ganado) {
    const items = (Array.isArray(ganado.items) ? ganado.items : []) as Array<{ cabezas?: number }>
    cabezas = items.reduce((s, it) => s + (Number(it.cabezas) || 0), 0)
    if (ganado.created_at) {
      tenureMonths = (Date.now() - new Date(ganado.created_at as string).getTime()) / (1000 * 60 * 60 * 24 * 30)
    }
  }

  // Marcas (remate_marks aún no está en los tipos → cliente sin tipar).
  let attended = 0
  let following = 0
  const { data: marks } = await (createAdminClient() as unknown as SupabaseClient)
    .from('remate_marks')
    .select('mark_type')
    .eq('user_id', user.id)
  for (const m of (marks ?? []) as Array<{ mark_type: string }>) {
    if (m.mark_type === 'attended') attended++
    else if (m.mark_type === 'following') following++
  }

  const karma = computeKarma({ cabezas, attended, following, tenureMonths })
  return NextResponse.json({ loggedIn: true, ...karma, inputs: { cabezas, attended, following } })
}
