import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import preoferta from '@/lib/data/preoferta-el-tigre.json'

// preoferta_bids no está en los tipos generados (tabla de prueba) → client sin tipar.
const db = () => requireServiceClient() as unknown as SupabaseClient

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Pre-oferta (PRUEBA interna). GET → valor actual por lote. POST → ofertar
 * (requiere sesión). Ofertas marcadas is_test=true: NO vinculantes.
 */

const REMATE_SLUG = 'el-tigre'
const INCREMENTO = 100_000
const CIERRE = new Date(preoferta.cierre_preoferta as string).getTime()
const LOTES = preoferta.lotes as Array<{ rp: string; base?: number }>
const RPS = new Set(LOTES.map((l) => l.rp))
/** Base real por lote (scrape elrural); fallback a la base global. */
const baseFor = (rp: string) => LOTES.find((l) => l.rp === rp)?.base ?? (preoferta.base as number)

/** Valor actual (máxima oferta) por lote, o la base si no hubo ofertas. */
async function currentByLote(): Promise<Record<string, number>> {
  const { data } = await db()
    .from('preoferta_bids')
    .select('lote_rp, amount')
    .eq('remate_slug', REMATE_SLUG)
  const max: Record<string, number> = {}
  for (const b of (data ?? []) as Array<{ lote_rp: string; amount: number }>) {
    if (!max[b.lote_rp] || b.amount > max[b.lote_rp]) max[b.lote_rp] = b.amount
  }
  return max
}

export async function GET() {
  // "valor actual" = espejo del libro de elrural (no nuestras ofertas).
  const { data } = await db()
    .from('preoferta_mirror')
    .select('valores, scraped_at')
    .eq('remate_slug', REMATE_SLUG)
    .maybeSingle()
  return NextResponse.json({
    base: preoferta.base as number,
    incremento: INCREMENTO,
    cierra: preoferta.cierre_preoferta,
    abierta: Date.now() < CIERRE,
    valores: (data?.valores as Record<string, number>) ?? {},
    espejo_at: data?.scraped_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  // 1) sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Ingresá para ofertar.', needsAuth: true }, { status: 401 })
  }

  // 2) preoferta abierta
  if (Date.now() >= CIERRE) {
    return NextResponse.json({ error: 'La pre-oferta está cerrada.' }, { status: 409 })
  }

  // 3) input
  let body: { lote_rp?: string; amount?: number; nombre?: string; cuit?: string; telefono?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }
  const rp = String(body.lote_rp ?? '')
  const amount = Math.floor(Number(body.amount))
  const nombre = String(body.nombre ?? '').trim()
  const cuit = String(body.cuit ?? '').replace(/\D/g, '')
  const telefono = String(body.telefono ?? '').trim()
  if (!RPS.has(rp)) return NextResponse.json({ error: 'Lote inexistente.' }, { status: 400 })
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
  if (nombre.length < 3) return NextResponse.json({ error: 'Ingresá nombre y apellido (o razón social).' }, { status: 400 })
  if (cuit.length !== 11) return NextResponse.json({ error: 'CUIT inválido (11 dígitos) — lo necesitamos para el informe.' }, { status: 400 })
  if (telefono.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Ingresá un teléfono de contacto.' }, { status: 400 })

  // 4) monto ≥ actual + incremento
  const max = await currentByLote()
  const b = baseFor(rp)
  const actual = max[rp] ?? b
  const minimo = (max[rp] ? actual + INCREMENTO : b)
  if (amount < minimo) {
    return NextResponse.json({ error: `La oferta debe ser de al menos $${minimo.toLocaleString('es-AR')}.`, actual, minimo }, { status: 422 })
  }

  // 5) insertar (service-role; is_test=true por default)
  const { error } = await db().from('preoferta_bids').insert({
    remate_slug: REMATE_SLUG,
    lote_rp: rp,
    amount,
    bidder_email: user.email,
    bidder_name: nombre,
    bidder_cuit: cuit,
    bidder_phone: telefono,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la oferta.' }, { status: 500 })

  return NextResponse.json({ ok: true, lote_rp: rp, actual: amount, proximo: amount + INCREMENTO })
}
