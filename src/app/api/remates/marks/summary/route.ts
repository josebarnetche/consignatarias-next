import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentSession } from '@/lib/user-tier'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/remates/marks/summary — social proof de asistencia a remates.
 * Devuelve { counts: { [remate_id]: "X fueron" }, mine: [remate_id marcados por vos] }.
 * counts es público; mine sólo si hay sesión. Alimenta el botón "Estuve" con el
 * agregado "X productores fueron a este remate".
 */
export async function GET() {
  const { user } = await getCurrentSession()
  const db = createAdminClient() as unknown as SupabaseClient

  const { data, error } = await db
    .from('remate_marks')
    .select('remate_id, user_id')
    .eq('mark_type', 'attended')
  if (error) {
    return NextResponse.json({ counts: {}, mine: [] })
  }

  const counts: Record<string, number> = {}
  const mine: string[] = []
  for (const m of (data ?? []) as Array<{ remate_id: string | null; user_id: string }>) {
    if (!m.remate_id) continue
    counts[m.remate_id] = (counts[m.remate_id] ?? 0) + 1
    if (user && m.user_id === user.id) mine.push(m.remate_id)
  }
  return NextResponse.json(
    { counts, mine },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  )
}
