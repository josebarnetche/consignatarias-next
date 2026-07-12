import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { frigorificoRfqSchema } from '@/lib/validators/frigorifico-rfq'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendFrigorificoRfqNotification, sendFrigorificoRfqConfirmation } from '@/lib/email'
import { getFrigorificoPlanStatus } from '@/lib/features'
import { logEvent } from '@/lib/ops'
import frigorificosData from '@/lib/data/frigorificos.json'

type Props = { params: Promise<{ cuit: string }> }

const frigos = frigorificosData as Array<{ cuit: string; name: string }>

/**
 * POST /api/frigorificos/[cuit]/rfq — pedido de cotización mayorista (RFQ).
 * Funciona sobre CUALQUIER frigorífico, reclamado o no: si no tiene dueño, el
 * aviso cae en agro@ (así el mail de San Miguel aterriza estructurado aunque el
 * frigorífico todavía no haya reclamado su perfil). Doble captura: lead al dueño
 * + señal a la capa de datos.
 */
export async function POST(req: NextRequest, { params }: Props) {
  const { cuit } = await params

  const staticFrigo = frigos.find(f => f.cuit === cuit)
  if (!staticFrigo) {
    return NextResponse.json({ error: 'Frigorífico no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = frigorificoRfqSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const d = parsed.data

  // Rate limit por IP y por email.
  for (const [id, limit] of [
    [`ip:${clientIp(req)}`, 10],
    [`email:${d.email.toLowerCase()}`, 5],
  ] as const) {
    const rl = await enforceRateLimit({ action: 'frigo_rfq', identity: id, limit, windowSeconds: 3600 })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
  }

  const supabase = requireServiceClient()

  // Perfil (para nombre + dueño). Puede no existir (frigo sin reclamar).
  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('display_name, claimed_by_email')
    .eq('cuit', cuit)
    .maybeSingle()

  const frigorificoName = profile?.display_name || staticFrigo.name
  const ownerEmail = profile?.claimed_by_email || null
  const plan = await getFrigorificoPlanStatus(cuit)

  const { error: insertError } = await supabase
    .from('frigorifico_rfq')
    .insert({
      frigorifico_cuit: cuit,
      producto_snapshot: d.producto_snapshot ?? null,
      provincia_entrega: d.provincia_entrega,
      tipo_comprador: d.tipo_comprador || null,
      nombre: d.nombre || null,
      empresa: d.empresa || null,
      cuit_comprador: d.cuit_comprador || null,
      whatsapp: d.whatsapp || null,
      email: d.email,
      mensaje: d.mensaje || null,
      tier_al_momento: plan.tier,
      ip: clientIp(req),
    })

  if (insertError) {
    console.error('Frigo RFQ insert error:', insertError)
    return NextResponse.json({ error: 'Error al guardar el pedido' }, { status: 500 })
  }

  // Resumen legible de productos para el mail (si vino snapshot).
  let resumenProductos: string | null = null
  try {
    const snap = d.producto_snapshot
    if (Array.isArray(snap)) {
      resumenProductos = snap
        .map((it: { producto?: string; cantidad?: number }) => `${it.cantidad ?? ''} × ${it.producto ?? ''}`.trim())
        .join(' · ')
    }
  } catch { /* noop */ }

  // Avisos (best-effort). Al dueño si está reclamado; siempre a agro@ (bcc/fallback).
  sendFrigorificoRfqNotification(ownerEmail, {
    frigorificoName,
    cuit,
    provinciaEntrega: d.provincia_entrega,
    tipoComprador: d.tipo_comprador,
    nombre: d.nombre,
    empresa: d.empresa,
    whatsapp: d.whatsapp,
    email: d.email,
    mensaje: d.mensaje,
    resumenProductos,
  })
  sendFrigorificoRfqConfirmation(d.email, frigorificoName)

  // Observabilidad: cae en /admin/ops. La fila en frigorifico_rfq es la fuente durable.
  logEvent({
    eventType: 'form_submit',
    status: 'ok',
    route: '/api/frigorificos/[cuit]/rfq',
    statusCode: 201,
    metadata: { form: 'frigorifico_rfq', cuit, provincia: d.provincia_entrega, claimed: !!ownerEmail },
  })

  return NextResponse.json({ message: 'Pedido enviado correctamente' }, { status: 201 })
}
