import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resumen semanal de tráfico para el reporte de SEO (lo consume scripts/gsc-report.mjs).
 * Sale de Supabase (visitors + profile_views) porque no hay GA4 service account.
 * Gateado por CRON_SECRET. Ventana: últimos 7 días vs los 7 previos.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = requireServiceClient() as unknown as SupabaseClient

  const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString()
  const w1 = since(7)   // inicio semana actual
  const w2 = since(14)  // inicio semana previa

  // Totales por COUNT exacto (head:true, sin traer filas — PostgREST capea en 1000).
  const countIn = async (from: string, to: string | null, aiOnly: boolean) => {
    let q = db.from('visitors').select('*', { count: 'exact', head: true }).gte('last_seen_at', from)
    if (to) q = q.lt('last_seen_at', to)
    if (aiOnly) q = q.not('lt_ai_engine', 'is', null)
    const { count } = await q
    return count ?? 0
  }
  const totals = async (from: string, to: string | null) => ({
    visitantes: await countIn(from, to, false),
    aiVisits: await countIn(from, to, true),
  })
  const [cur, prev] = await Promise.all([totals(w1, null), totals(w2, w1)])

  // Desglose por motor de AI (última semana).
  const { data: aiRows } = await db.from('visitors').select('lt_ai_engine').gte('last_seen_at', w1).not('lt_ai_engine', 'is', null)
  const aiEngines: Record<string, number> = {}
  for (const r of (aiRows ?? []) as Array<{ lt_ai_engine: string }>) aiEngines[r.lt_ai_engine] = (aiEngines[r.lt_ai_engine] ?? 0) + 1

  // Perfiles de consignataria más vistos (última semana).
  const { data: pv } = await db.from('profile_views').select('entity_type, entity_slug').gte('viewed_at', w1)
  const profileCounts: Record<string, { type: string; n: number }> = {}
  for (const r of (pv ?? []) as Array<{ entity_type: string; entity_slug: string }>) {
    const k = `${r.entity_type}/${r.entity_slug}`
    ;(profileCounts[k] ??= { type: r.entity_type, n: 0 }).n++
  }
  const topProfiles = Object.entries(profileCounts)
    .map(([k, v]) => ({ slug: k.split('/')[1], type: v.type, views: v.n }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12)

  return NextResponse.json({
    range: { current_from: w1, previous_from: w2 },
    traffic: { cur, prev },
    aiEngines: Object.entries(aiEngines).map(([engine, visits]) => ({ engine, visits })).sort((a, b) => b.visits - a.visits),
    topProfiles,
    profileViewsTotal: (pv ?? []).length,
  })
}
