import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentSession } from '@/lib/user-tier'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/remates/mark — toggle de una marca del productor.
 * Body: { remate_id?, consignataria_slug?, mark_type: 'attended'|'following'|'trust' }
 * "estuve acá" (attended, con remate_id) o "sigo" (following, con consignataria_slug).
 * Toggle: si ya existe la borra; sino la crea. Requiere sesión (cuenta free).
 */

const TYPES = new Set(['attended', 'following', 'trust'])

// remate_marks aún no está en los tipos generados; usamos el cliente sin tipar.
function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

export async function POST(req: NextRequest) {
  const { user } = await getCurrentSession()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  let body: { remate_id?: string; consignataria_slug?: string; mark_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const markType = String(body.mark_type || '')
  if (!TYPES.has(markType)) return NextResponse.json({ error: 'invalid_mark_type' }, { status: 400 })
  const remateId = body.remate_id ? String(body.remate_id).slice(0, 120) : null
  const slug = body.consignataria_slug ? String(body.consignataria_slug).slice(0, 120) : null
  if (!remateId && !slug) return NextResponse.json({ error: 'missing_target' }, { status: 400 })

  const admin = db()
  let sel = admin.from('remate_marks').select('id').eq('user_id', user.id).eq('mark_type', markType)
  sel = remateId ? sel.eq('remate_id', remateId) : sel.is('remate_id', null)
  sel = slug ? sel.eq('consignataria_slug', slug) : sel.is('consignataria_slug', null)
  const { data: existing } = await sel.maybeSingle()

  if (existing) {
    await admin.from('remate_marks').delete().eq('id', existing.id)
    return NextResponse.json({ marked: false })
  }

  const { error } = await admin
    .from('remate_marks')
    .insert({ user_id: user.id, remate_id: remateId, consignataria_slug: slug, mark_type: markType })
  if (error) {
    console.error('[remates/mark] insert error:', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ marked: true })
}
