import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendPreofertaFirmaOferta } from '@/lib/email'
import { logEvent } from '@/lib/ops'
import { getPreofertaFirmaPublica, urlPreofertaFirma } from '@/lib/preofertas-firma'
import { ofertaFirmaSchema, preofertaAbierta } from '@/lib/validators/preoferta-firma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

/**
 * POST /api/preoferta/firma — oferta sobre un lote que cargó la FIRMA (17-10-2026).
 *
 * Distinto de /api/preoferta/bid (El Tigre): acá no hay libro de precios ni incremento
 * mínimo — es un interesado que deja su contacto y, si quiere, cuánto pagaría. Por eso
 * no pide sesión: alcanza con nombre y teléfono o email. La fila va a preoferta_bids
 * enlazada al lote, y el aviso le llega a la FIRMA (no a Memola, que va en copia).
 * El contacto del interesado no vuelve en la respuesta ni se publica en ningún lado.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }

  const parsed = ofertaFirmaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const d = parsed.data

  // Sin sesión → el freno es el rate limit: por IP y por contacto.
  const contacto = (d.email ?? d.telefono?.replace(/\D/g, '') ?? '').toLowerCase()
  for (const [identity, limit] of [
    [`ip:${clientIp(req)}`, 15],
    [`contacto:${contacto}`, 10],
  ] as const) {
    const rl = await enforceRateLimit({ action: 'preoferta_firma_oferta', identity, limit, windowSeconds: 3600 })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
  }

  const db = requireServiceClient()
  const preoferta = await getPreofertaFirmaPublica(db, d.preoferta_id)
  const lote = preoferta?.lotes.find((l) => l.id === d.lote_id)
  if (!preoferta || !lote) return NextResponse.json({ error: 'Lote inexistente.' }, { status: 404 })
  if (!preofertaAbierta(preoferta, Date.now())) {
    return NextResponse.json({ error: 'La pre-oferta está cerrada.' }, { status: 409 })
  }

  const { error } = await db.from('preoferta_bids').insert({
    // remate_slug/lote_rp son NOT NULL desde El Tigre: el prefijo 'firma:' aparta estas
    // filas de las consultas del registro estático, que filtran por su propio slug.
    remate_slug: `firma:${preoferta.id}`,
    lote_rp: lote.id,
    preoferta_firma_id: preoferta.id,
    lote_firma_id: lote.id,
    amount: d.monto ?? null,
    bidder_name: d.nombre,
    bidder_phone: d.telefono ?? null,
    bidder_email: d.email ?? null,
    mensaje: d.mensaje ?? null,
    // Oferta real de un interesado sobre el remate de una firma: no es la prueba interna.
    is_test: false,
  })
  if (error) {
    console.error('[preoferta-firma] insert:', error)
    return NextResponse.json({ error: 'No se pudo registrar la oferta.' }, { status: 500 })
  }

  const { data: firma } = await db
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', preoferta.consignataria_slug)
    .maybeSingle()

  await sendPreofertaFirmaOferta({
    firmaEmail: firma?.claimed_by_email ?? null,
    firmaNombre: preoferta.consignataria_nombre,
    remate: preoferta.titulo,
    fechaRemate: preoferta.fecha_remate.split('-').reverse().join('-'),
    lote: lote.titulo,
    nombre: d.nombre,
    telefono: d.telefono ?? null,
    email: d.email ?? null,
    monto: d.monto ?? null,
    mensaje: d.mensaje ?? null,
    fichaUrl: `${APP_URL}${urlPreofertaFirma(preoferta.id)}`,
  })

  logEvent({
    eventType: 'form_submit',
    status: 'ok',
    route: '/api/preoferta/firma',
    statusCode: 201,
    metadata: { form: 'preoferta_firma', consignataria: preoferta.consignataria_slug, con_monto: d.monto != null },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
