import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery } from '@/lib/email'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { z } from 'zod'
import { loadCorredorManifest } from '@/lib/el-corredor-manifest'

export const dynamic = 'force-dynamic'

const subscribeSchema = z.object({
  email: z.string().email('Email inválido'),
  source: z.string().max(60).optional(),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

/**
 * POST /api/el-corredor/subscribe
 *
 * Captures an email subscription for "El Corredor" (lead magnet).
 * Stores in newsletter_subscribers, sends the latest edition via Resend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = subscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email inválido', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    // Durable rate limit — sends the lead-magnet PDF to the submitted address.
    for (const [id, limit] of [
      [`ip:${clientIp(req)}`, 15],
      [`email:${normalizedEmail}`, 4],
    ] as const) {
      const rl = await enforceRateLimit({ action: 'el_corredor', identity: id, limit, windowSeconds: 3600 })
      if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
    }

    const supabase = requireServiceClient()

    // Quien ya está suscripto por otro lado (cierre mensual, faena, canon) conserva su
    // source: se marca el_corredor y el envío mensual lo incluye. Antes un upsert le
    // pisaba el source con 'el-corredor' y dejaba de recibir el mail que había pedido.
    const { data: existente, error: selErr } = await supabase
      .from('newsletter_subscribers')
      .select('id, source, status')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const ahora = new Date().toISOString()
    const { error: saveErr } = selErr
      ? { error: selErr }
      : !existente
        ? await supabase.from('newsletter_subscribers').insert({
            email: normalizedEmail,
            // 'el-corredor' es el source del segmento corredor (newsletter-segments.ts):
            // recibe el envío mensual, no solo el envío inmediato de abajo.
            source: 'el-corredor',
            status: 'active',
            subscribed_at: ahora,
          })
        : existente.status === 'active'
          ? await supabase
              .from('newsletter_subscribers')
              .update({ el_corredor: true, resubscribed_at: ahora })
              .eq('id', existente.id)
          : // Se había dado de baja de todo: vuelve por el Corredor.
            await supabase
              .from('newsletter_subscribers')
              .update({
                source: 'el-corredor',
                el_corredor: true,
                status: 'active',
                unsubscribed_at: null,
                resubscribed_at: ahora,
              })
              .eq('id', existente.id)

    if (saveErr) {
      console.error('[el-corredor/subscribe] supabase error:', saveErr.message)
      // Continue: even if storage fails, try to deliver the PDF — value-first.
    }

    // Manifest en request: la importación estática entregaba la edición del build (1-ago).
    const manifest = await loadCorredorManifest()
    const pdfUrl = `${APP_URL}${manifest.current.pdf_path}`
    const delivery = await sendElCorredorDelivery(
      normalizedEmail,
      manifest.current.edition_label,
      pdfUrl
    )

    if (!delivery.success) {
      console.warn('[el-corredor/subscribe] email delivery failed:', delivery.error)
      // Still return success — user is captured, we can re-send manually
    }

    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      edition: manifest.current.edition_label,
      delivered: delivery.success,
    })
  } catch (err) {
    console.error('[el-corredor/subscribe] error:', err)
    return NextResponse.json(
      { error: 'Error procesando la suscripción' },
      { status: 500 }
    )
  }
}
