import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery } from '@/lib/email'
import { z } from 'zod'
import manifest from '../../../../../public/el-corredor/manifest.json'

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

    const supabase = requireServiceClient()

    // Upsert into newsletter_subscribers — re-send PDF on duplicate
    const { error: upsertErr } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email: normalizedEmail,
          // Must be 'el-corredor' (mapped to the corredor segment) so the
          // subscriber receives the monthly El Corredor blast, not just the
          // immediate delivery below.
          source: 'el-corredor',
          status: 'active',
          // Reactivate if previously unsubscribed
          unsubscribed_at: null,
          resubscribed_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )

    if (upsertErr) {
      console.error('[el-corredor/subscribe] supabase upsert error:', upsertErr.message)
      // Continue: even if storage fails, try to deliver the PDF — value-first.
    }

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
