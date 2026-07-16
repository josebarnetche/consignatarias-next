import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta } from '@/lib/data/preofertas'

// preoferta_views no está en los tipos generados → client sin tipar.
const db = () => requireServiceClient() as unknown as SupabaseClient

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Observabilidad de viewship: registra la vista de un lote (o de la página,
 * lote_rp null). Público, fire-and-forget. El cliente deduplica por lote y por
 * visitante (localStorage), así que esto sólo persiste vistas nuevas.
 */
export async function POST(req: NextRequest) {
  let body: { remate?: string; lote_rp?: string; visitor?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }

  const p = getPreoferta(String(body.remate ?? ''))
  if (!p) return NextResponse.json({ error: 'Remate inexistente.' }, { status: 404 })

  const rp = body.lote_rp ? String(body.lote_rp) : null
  if (rp && !p.lotes.some((l) => l.rp === rp)) {
    return NextResponse.json({ error: 'Lote inexistente.' }, { status: 400 })
  }
  const visitor = body.visitor ? String(body.visitor).slice(0, 64) : null

  const { error } = await db().from('preoferta_views').insert({
    remate_slug: p.slug,
    lote_rp: rp,
    visitor,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la vista.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
