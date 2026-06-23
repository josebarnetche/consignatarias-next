import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendDigestEmail } from '@/lib/email'
import { isWeeklyRecipient } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { buildDigestModel } from '@/lib/newsletter/digest-content'
import { buildDigestEmail } from '@/lib/newsletter/digest-template'

/**
 * Weekly DIGEST "qué cambió" — envío SEPARADO del cron PRO (weekly-newsletter).
 *
 * Construye el digest con buildDigestModel() + buildDigestEmail() por destinatario
 * (el email va en los links de unsub/pixel, por eso se renderiza por persona) y lo
 * envía con sendDigestEmail (mismo FROM verificado + headers List-Unsubscribe RFC 8058).
 *
 * Destinatarios: EXACTAMENTE la misma lógica que el cron vivo —
 * newsletter_subscribers status='active' → isWeeklyRecipient(source) → capForFreePlan.
 *
 * Auth: authorizeCron (CRON_SECRET o ADMIN_SECRET vía Bearer / x-cron-secret / ?secret=).
 *
 * Modo TEST seguro: POST .../weekly-digest?test=<email>&secret=<...> envía SOLO a ese
 * email (sin tocar la lista) y devuelve { sent: 1, test: true }.
 *
 * NO toca el cron PRO ni su .yml. La programación la decide el humano después.
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const testEmail = (req.nextUrl.searchParams.get('test') || '').trim().toLowerCase()

  const outcome = await trackCron('weekly-digest', async () => {
    const model = buildDigestModel()

    // Si TODAS las secciones fallaron, no mandamos nada (mismo criterio soft-fail).
    if (model.empty) {
      return {
        status: 'ok' as const,
        message: 'Digest vacío — nada que enviar esta semana',
        metadata: { sent: 0, total: 0, empty: true },
      }
    }

    // --- Modo TEST: un solo destinatario, sin tocar la lista -----------------
    if (testEmail) {
      const built = buildDigestEmail(model, testEmail)
      const res = await sendDigestEmail(testEmail, built)
      return {
        status: res.success ? ('ok' as const) : ('error' as const),
        message: res.success ? `Digest TEST enviado a ${testEmail}` : `Fallo TEST: ${res.error}`,
        metadata: { sent: res.success ? 1 : 0, test: true, recipient: testEmail },
      }
    }

    // --- Envío real: misma query/segmentación/cap que el cron vivo ----------
    const supabase = requireServiceClient()
    const { data: allActive } = await supabase
      .from('newsletter_subscribers')
      .select('email, source')
      .eq('status', 'active')
    const subscribers = (allActive ?? []).filter((s) => isWeeklyRecipient(s.source))

    if (subscribers.length === 0) {
      return {
        status: 'ok' as const,
        message: 'No hay suscriptores activos',
        metadata: { sent: 0, total: 0 },
      }
    }

    const { toSend, skipped } = capForFreePlan(subscribers)
    let sent = 0
    const errors: string[] = []

    for (const sub of toSend) {
      try {
        // Render por destinatario: el email va en pixel + links de baja one-click.
        const built = buildDigestEmail(model, sub.email)
        const res = await sendDigestEmail(sub.email, built)
        if (res.success) {
          sent++
        } else {
          errors.push(`${sub.email}: ${res.error}`)
        }
        await new Promise((r) => setTimeout(r, 100))
      } catch (err) {
        errors.push(`${sub.email}: ${err}`)
      }
    }

    return {
      status: errors.length > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Digest enviado: ${sent}/${subscribers.length}`,
      metadata: {
        sent,
        total: subscribers.length,
        skipped,
        errors: errors.length,
        weekRange: model.weekRange,
      },
    }
  })

  return NextResponse.json(outcome.metadata ?? { ok: true })
}
