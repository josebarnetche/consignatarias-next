import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentSession } from '@/lib/user-tier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Registra la visita en la capa first-party. Lee el `cid` (cookie propia seteada
 * en middleware), la atribución que manda el cliente (landing, referrer, utm, motor
 * de IA, device) y la sesión, y hace el upsert atómico (upsert_visitor): preserva
 * first-touch, actualiza last-touch, cuenta pageviews/visits y liga la cuenta
 * (stitching) al loguearse. Sin cid → no-op.
 */
function clip(v: unknown, n: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, n) : null
}

export async function POST(req: NextRequest) {
  const cid = req.cookies.get('cid')?.value
  if (!cid) return NextResponse.json({ ok: false, reason: 'no-cid' })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const { user } = await getCurrentSession()
  const db = createAdminClient() as unknown as SupabaseClient

  const { error } = await db.rpc('upsert_visitor', {
    p_cid: cid,
    p_user: user?.id ?? null,
    p_landing: clip(body.landing, 512),
    p_referrer: clip(body.referrer, 512),
    p_utm_source: clip(body.utm_source, 120),
    p_utm_medium: clip(body.utm_medium, 120),
    p_utm_campaign: clip(body.utm_campaign, 120),
    p_ai_engine: clip(body.ai_engine, 32),
    p_device: clip(body.device, 32),
    p_new_session: body.new_session === true,
  })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
