import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { frigorificoClaimSchema } from '@/lib/validators/claim'
import { sendFrigorificoClaimConfirmation, sendFrigorificoClaimNotificationToAdmin } from '@/lib/email'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { logEvent } from '@/lib/ops'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = frigorificoClaimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { frigorifico_cuit, frigorifico_name, claimant_email, claimant_name, claimant_phone, claimant_role } = parsed.data

    // Durable rate limit — sends a confirmation email to the submitted address.
    for (const [id, limit] of [
      [`ip:${clientIp(req)}`, 10],
      [`email:${claimant_email.toLowerCase()}`, 3],
    ] as const) {
      const rl = await enforceRateLimit({ action: 'frigo_claims', identity: id, limit, windowSeconds: 3600 })
      if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
    }
    const supabase = requireServiceClient()

    // Check for duplicate pending claim
    const { data: existing } = await supabase
      .from('frigorifico_claims')
      .select('id')
      .eq('frigorifico_cuit', frigorifico_cuit)
      .eq('claimant_email', claimant_email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya tenés una solicitud pendiente para este frigorífico' },
        { status: 409 },
      )
    }

    // Insert claim
    const { error: insertError } = await supabase
      .from('frigorifico_claims')
      .insert({
        frigorifico_cuit,
        frigorifico_name,
        claimant_email,
        claimant_name: claimant_name || null,
        claimant_phone: claimant_phone || null,
        claimant_role: claimant_role || null,
      })

    if (insertError) {
      console.error('Frigorifico claim insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar la solicitud' },
        { status: 500 },
      )
    }

    // Fire emails (non-blocking)
    sendFrigorificoClaimConfirmation(claimant_email, frigorifico_name)
    sendFrigorificoClaimNotificationToAdmin(
      frigorifico_name,
      frigorifico_cuit,
      claimant_email,
      claimant_name || undefined,
    )

    // Observabilidad: que el claim aparezca en /admin/ops (no solo en el mail,
    // que es best-effort). La fila en frigorifico_claims es la fuente durable;
    // esto es la traza operativa.
    logEvent({
      eventType: 'form_submit',
      status: 'ok',
      route: '/api/frigorifico-claims',
      statusCode: 201,
      metadata: { form: 'frigorifico_claim', cuit: frigorifico_cuit, name: frigorifico_name },
    })

    return NextResponse.json(
      { message: 'Solicitud enviada correctamente' },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
