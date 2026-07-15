import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta, type Preoferta } from '@/lib/data/preofertas'
import { sendPreofertaAlert } from '@/lib/email'
import { repPorLocalidad } from '@/lib/data/reggi-reps'

// preoferta_bids no está en los tipos generados (tabla de prueba) → client sin tipar.
const db = () => requireServiceClient() as unknown as SupabaseClient

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Pre-oferta (PRUEBA interna), multi-remate. Toma ?remate=<slug> (GET) o
 * body.remate (POST). GET → valor actual por lote (espejo elrural). POST →
 * ofertar (requiere sesión). Ofertas is_test=true: NO vinculantes.
 */

const INCREMENTO = 100_000
const baseFor = (p: Preoferta, rp: string) => p.lotes.find((l) => l.rp === rp)?.base ?? p.base
const cierreMs = (p: Preoferta) => new Date(p.cierre_preoferta).getTime()

async function currentByLote(slug: string): Promise<Record<string, number>> {
  const { data } = await db().from('preoferta_bids').select('lote_rp, amount').eq('remate_slug', slug)
  const max: Record<string, number> = {}
  for (const b of (data ?? []) as Array<{ lote_rp: string; amount: number }>) {
    if (!max[b.lote_rp] || b.amount > max[b.lote_rp]) max[b.lote_rp] = b.amount
  }
  return max
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('remate') ?? ''
  const p = getPreoferta(slug)
  if (!p) return NextResponse.json({ error: 'Remate inexistente.' }, { status: 404 })
  // "valor actual" = máx(libro elrural, nuestras ofertas).
  const { data } = await db()
    .from('preoferta_mirror')
    .select('valores, scraped_at')
    .eq('remate_slug', p.slug)
    .maybeSingle()
  const valores: Record<string, number> = { ...((data?.valores as Record<string, number>) ?? {}) }
  const nuestras = await currentByLote(p.slug)
  for (const [rp, v] of Object.entries(nuestras)) {
    if (!valores[rp] || v > valores[rp]) valores[rp] = v
  }
  return NextResponse.json({
    base: p.base,
    incremento: INCREMENTO,
    cierra: p.cierre_preoferta,
    abierta: Date.now() < cierreMs(p),
    valores,
    espejo_at: data?.scraped_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  // 0) input + remate
  let body: { remate?: string; lote_rp?: string; amount?: number; nombre?: string; cuit?: string; telefono?: string; localidad?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }
  const p = getPreoferta(String(body.remate ?? ''))
  if (!p) return NextResponse.json({ error: 'Remate inexistente.' }, { status: 404 })

  // 1) sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Ingresá para ofertar.', needsAuth: true }, { status: 401 })

  // 2) abierta
  if (Date.now() >= cierreMs(p)) return NextResponse.json({ error: 'La pre-oferta está cerrada.' }, { status: 409 })

  // 3) validación
  const rp = String(body.lote_rp ?? '')
  const amount = Math.floor(Number(body.amount))
  const nombre = String(body.nombre ?? '').trim()
  const cuit = String(body.cuit ?? '').replace(/\D/g, '')
  const telefono = String(body.telefono ?? '').trim()
  const localidad = String(body.localidad ?? '').trim()
  if (!p.lotes.some((l) => l.rp === rp)) return NextResponse.json({ error: 'Lote inexistente.' }, { status: 400 })
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
  if (nombre.length < 3) return NextResponse.json({ error: 'Ingresá nombre y apellido (o razón social).' }, { status: 400 })
  if (cuit.length !== 11) return NextResponse.json({ error: 'CUIT inválido (11 dígitos) — lo necesitamos para el informe.' }, { status: 400 })
  if (telefono.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Ingresá un teléfono de contacto.' }, { status: 400 })

  // 4) monto ≥ actual + incremento
  const max = await currentByLote(p.slug)
  const b = baseFor(p, rp)
  const actual = max[rp] ?? b
  const minimo = (max[rp] ? actual + INCREMENTO : b)
  if (amount < minimo) {
    return NextResponse.json({ error: `La oferta debe ser de al menos $${minimo.toLocaleString('es-AR')}.`, actual, minimo }, { status: 422 })
  }

  // 5) insertar (service-role; is_test=true por default)
  const { error } = await db().from('preoferta_bids').insert({
    remate_slug: p.slug,
    lote_rp: rp,
    amount,
    bidder_email: user.email,
    bidder_name: nombre,
    bidder_cuit: cuit,
    bidder_phone: telefono,
    bidder_localidad: localidad || null,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la oferta.' }, { status: 500 })

  // 6) notificar (fire-and-forget) — agro@memola.com.ar, con rep sugerido por zona
  const lote = p.lotes.find((l) => l.rp === rp)
  const elruralHref = lote?.elrural_id
    ? `https://preofertas.elrural.com/lote/${lote.elrural_id}`
    : (p.elrural_remate_id ? `https://preofertas.elrural.com/remate/${p.elrural_remate_id}` : '')
  const ruteo = repPorLocalidad(localidad)
  void sendPreofertaAlert({
    remate: p.remate, remateSlug: p.slug, lote: lote?.lote ?? rp, loteRp: rp, monto: amount,
    nombre, cuit, telefono, email: user.email, consignataria: p.consignataria, elruralHref,
    localidad: localidad || null,
    rep: ruteo ? `${ruteo.zona} — ${ruteo.reps.map((r) => `${r.nombre} ${r.tel}`).join(' · ')}` : null,
  })

  return NextResponse.json({ ok: true, lote_rp: rp, actual: amount, proximo: amount + INCREMENTO })
}
