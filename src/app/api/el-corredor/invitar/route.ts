import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorInvitacion } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/el-corredor/invitar
 *
 * Invita a El Corredor a los suscriptores que NO están en su audiencia (audiencia
 * INVERTIDA respecto de /blast). Nació el 2026-08-01 al descubrir que el informe
 * mensual llegaba a 8 de 62 suscriptores: el resto se había suscripto a alertas
 * puntuales y nunca se le preguntó si quería el informe.
 *
 * Envío MANUAL y de una sola vez — no lo llama ningún cron. Cada correo nombra la
 * alerta que esa persona pidió (sourceEnCriollo) y el opt-in es responder.
 *
 * Body: { test_email? } → si viene, manda UNA sola copia ahí y no toca la base.
 */
const EL_CORREDOR_AUDIENCE = [...SEGMENT_SOURCES.corredor, 'reporte-semanal', 'remates']

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { test_email?: string; dry_run?: boolean }
  const testEmail = typeof body.test_email === 'string' ? body.test_email.trim() : null

  const outcome = await trackCron('el-corredor-invitar', async () => {
    if (testEmail) {
      const r = await sendElCorredorInvitacion(testEmail, 'cierre-mensual')
      return {
        status: r.success ? ('ok' as const) : ('error' as const),
        message: r.success ? `preview enviado a ${testEmail}` : `preview falló: ${r.error}`,
        metadata: { preview: true, to: testEmail, error: r.error },
      }
    }

    const supabase = requireServiceClient()
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, source')
      .eq('status', 'active')
      .not('source', 'in', `(${EL_CORREDOR_AUDIENCE.join(',')})`)

    if (error) {
      return {
        status: 'error' as const,
        message: `subscribers query failed: ${error.message}`,
        metadata: { _status: 500, error: error.message },
      }
    }

    // Topear al presupuesto diario de Resend: los transaccionales (leads, altas,
    // alertas) cuentan contra el MISMO cupo y no pueden quedar sin aire.
    const { toSend: targets, skipped } = capForFreePlan(data ?? [])
    if (body.dry_run) {
      return {
        status: 'ok' as const,
        message: `dry run: ${targets.length} destinatarios${skipped ? ` (+${skipped} fuera del cupo diario)` : ''}`,
        metadata: { dry_run: true, total: targets.length, skipped },
      }
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []
    for (const row of targets) {
      const r = await sendElCorredorInvitacion(row.email, row.source)
      if (r.success) sent++
      else {
        failed++
        if (errors.length < 10) errors.push(`${row.email}: ${r.error}`)
      }
      await new Promise((res) => setTimeout(res, 250))
    }

    return {
      status: failed > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Invitación a El Corredor: ${sent}/${targets.length} enviados${skipped ? ` (${skipped} quedaron para otro día por cupo)` : ''}`,
      metadata: { sent, failed, total: targets.length, skipped, errors },
    }
  })

  const meta = (outcome.metadata ?? {}) as Record<string, unknown>
  const status = typeof meta._status === 'number' ? meta._status : outcome.status === 'error' ? 500 : 200
  return NextResponse.json({ ok: outcome.status === 'ok', message: outcome.message, ...meta }, { status })
}
