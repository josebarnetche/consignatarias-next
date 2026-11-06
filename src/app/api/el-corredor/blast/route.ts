import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery, sendElCorredorCorreccion } from '@/lib/email'
import { EL_CORREDOR_AUDIENCE } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { loadCorredorManifest, type CorredorManifest } from '@/lib/el-corredor-manifest'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'


/**
 * POST /api/el-corredor/blast
 *
 * Admin endpoint: dispatches the current edition (per manifest.json) to all
 * active newsletter_subscribers. Protected by Bearer token from EL_CORREDOR_BLAST_TOKEN.
 *
 * Called by the monthly publish workflow after the new manifest is committed
 * and Vercel has rebuilt.
 *
 * Cada envío queda en el_corredor_envios y solo se manda a quien no tiene fila para
 * esa edición: el tope diario (capForFreePlan) deja el resto para el día siguiente,
 * que lo despacha el-corredor-continuar.yml con mode=continuar, y volver a disparar
 * el envío del día 1 no duplica. `continuar` nunca abre una edición: si el día 1 no
 * mandó nada, no hace nada.
 */
export async function POST(req: NextRequest) {
  // Auth via authorizeCron → CRON_SECRET (the one secret that IS set in GitHub + Vercel).
  // Was EL_CORREDOR_BLAST_TOKEN, which was never set anywhere → the monthly blast 401'd /
  // skipped silently for every edition. Same fix as the email crons (1.28.1).
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // El workflow manda la edición que acaba de publicar. Si el manifest que ve esta
  // función no coincide, NO se envía: preferimos fallar ruidoso a mandarle a 62
  // suscriptores el link de otro mes (lo que pasó el 2026-08-01).
  const body = (await req.json().catch(() => ({}))) as { expected_ym?: string; mode?: string }
  const continuar = body.mode === 'continuar'
  const expectedYm = typeof body.expected_ym === 'string' ? body.expected_ym.trim() : null
  // mode=correccion: plantilla que pide disculpas por la edición equivocada y suma
  // el canal directo de WhatsApp. Envío manual, nunca desde el cron mensual.
  const modoCorreccion = body.mode === 'correccion'

  const outcome = await trackCron(continuar ? 'el-corredor-continuar' : 'el-corredor-publish', async () => {
    let manifest: CorredorManifest
    try {
      manifest = await loadCorredorManifest()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      return {
        status: 'error' as const,
        message: `no se pudo leer el manifest: ${msg}`,
        metadata: { _status: 503, error: 'manifest_unreadable', details: msg },
      }
    }

    if (expectedYm && manifest.current.ym !== expectedYm) {
      return {
        status: 'error' as const,
        message: `edición desincronizada: el deploy sirve ${manifest.current.ym} y se esperaba ${expectedYm}`,
        metadata: {
          _status: 409,
          error: 'edition_mismatch',
          expected_ym: expectedYm,
          live_ym: manifest.current.ym,
          hint: 'el deploy de Vercel todavía no propagó la edición nueva — reintentar cuando el manifest live coincida',
        },
      }
    }

    const supabase = requireServiceClient()
    const ym = manifest.current.ym
    const tipo = modoCorreccion ? 'correccion' : 'edicion'

    const { data: yaEnviados, error: envErr } = await supabase
      .from('el_corredor_envios')
      .select('email')
      .eq('ym', ym)
      .eq('tipo', tipo)
    if (envErr) {
      return {
        status: 'error' as const,
        message: `el_corredor_envios query failed: ${envErr.message}`,
        metadata: { _status: 500, error: 'envios query failed', details: envErr.message },
      }
    }
    if (continuar && (yaEnviados?.length ?? 0) === 0) {
      return {
        status: 'ok' as const,
        message: `El Corredor ${manifest.current.edition_label}: sin envío iniciado, no se continúa`,
        metadata: { ok: true, edition: manifest.current.edition_label, sent: 0, pending: 0, reason: 'no_iniciada' },
      }
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .or(`source.in.(${EL_CORREDOR_AUDIENCE.join(',')}),el_corredor.eq.true`)
      .order('subscribed_at', { ascending: true })

    if (error) {
      return {
        status: 'error' as const,
        message: `subscribers query failed: ${error.message}`,
        metadata: { _status: 500, error: 'subscribers query failed', details: error.message },
      }
    }

    const enviados = new Set((yaEnviados ?? []).map((r) => r.email))
    const allRecipients = [...new Set((data ?? []).map((r) => r.email))]
    const pendientes = allRecipients.filter((e) => !enviados.has(e))
    const { toSend: recipients, skipped } = capForFreePlan(pendientes)
    const pdfUrl = `${APP_URL}${manifest.current.pdf_path}`

    let sent = 0
    let failed = 0
    let sinRegistro = 0
    const errors: string[] = []

    for (const email of recipients) {
      const result = modoCorreccion
        ? await sendElCorredorCorreccion(email, manifest.current.edition_label, pdfUrl)
        : await sendElCorredorDelivery(email, manifest.current.edition_label, pdfUrl)
      if (result.success) {
        sent++
        // Si no queda registrado, mañana se le vuelve a mandar: se cuenta para verlo.
        const { error: regErr } = await supabase
          .from('el_corredor_envios')
          .upsert({ ym, tipo, email }, { onConflict: 'ym,tipo,email', ignoreDuplicates: true })
        if (regErr) {
          sinRegistro++
          if (errors.length < 10) errors.push(`registro ${email}: ${regErr.message}`)
        }
      } else {
        failed++
        if (errors.length < 10) errors.push(`${email}: ${result.error}`)
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    return {
      status: failed > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message:
        `El Corredor ${manifest.current.edition_label}: ${sent} enviados hoy, ` +
        `${enviados.size + sent}/${allRecipients.length} en total, ${skipped + failed} pendientes`,
      metadata: {
        ok: true,
        edition: manifest.current.edition_label,
        mode: continuar ? 'continuar' : tipo,
        recipients_total: allRecipients.length,
        already_sent: enviados.size,
        skipped,
        sent,
        failed,
        not_recorded: sinRegistro,
        pending: skipped + failed,
        errors: errors.slice(0, 10),
      },
    }
  })

  const meta = { ...(outcome.metadata ?? {}) } as Record<string, unknown>
  const status = typeof meta._status === 'number' ? (meta._status as number) : 200
  delete meta._status
  return NextResponse.json(meta, { status })
}
