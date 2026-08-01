import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

interface CorredorManifest {
  current: { ym: string; edition_label: string; pdf_path: string }
}

/**
 * Manifest EN TIEMPO DE REQUEST, nunca `import` estático.
 *
 * 2026-08-01: el manifest se importaba con `import manifest from '…/manifest.json'`,
 * o sea que quedaba congelado en el bundle del build. El workflow publica, commitea,
 * espera 90 s (un build de ~3.400 rutas tarda 2-4 min) y dispara el blast: la función
 * que atendía todavía era la del deployment ANTERIOR, con el manifest del mes pasado.
 * Resultado: el 1-ago salió el mail de "Junio" de nuevo y la edición de Julio nunca
 * se anunció. Leerlo por fetch sin caché hace que hasta un bundle viejo vea la
 * edición correcta.
 */
async function loadManifest(): Promise<CorredorManifest> {
  const res = await fetch(`${APP_URL}/el-corredor/manifest.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`manifest HTTP ${res.status}`)
  const m = (await res.json()) as CorredorManifest
  if (!m?.current?.ym || !m.current.pdf_path) throw new Error('manifest sin current.ym/pdf_path')
  return m
}

// El Corredor (monthly market close) goes to the corredor segment AND the other
// market-interested segments — they subscribed for cattle-market content and the
// monthly close is exactly that. Excludes product-only sources (exportar-datos).
// As the corredor segment grows via the lead-magnet CTAs, it becomes the core.
// Audiencia de El Corredor (PDF mensual, día 1). NO incluir sources que ya tienen
// su propio email de mercado el mismo período (2026-07-18): 'cierre-mensual' y
// 'valuation_widget' reciben monthly-close (día 1) y 'frigorificos' recibe faena
// (día 3) → doble email de mercado. Quedan los que opt-in a El Corredor + el weekly
// (contenido distinto: digest de remates vs informe mensual).
const EL_CORREDOR_AUDIENCE = [
  ...SEGMENT_SOURCES.corredor, // 'el-corredor'
  'reporte-semanal',
  'remates',
]

/**
 * POST /api/el-corredor/blast
 *
 * Admin endpoint: dispatches the current edition (per manifest.json) to all
 * active newsletter_subscribers. Protected by Bearer token from EL_CORREDOR_BLAST_TOKEN.
 *
 * Called by the monthly publish workflow after the new manifest is committed
 * and Vercel has rebuilt.
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
  const body = (await req.json().catch(() => ({}))) as { expected_ym?: string }
  const expectedYm = typeof body.expected_ym === 'string' ? body.expected_ym.trim() : null

  const outcome = await trackCron('el-corredor-publish', async () => {
    let manifest: CorredorManifest
    try {
      manifest = await loadManifest()
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
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .in('source', EL_CORREDOR_AUDIENCE)

    if (error) {
      return {
        status: 'error' as const,
        message: `subscribers query failed: ${error.message}`,
        metadata: { _status: 500, error: 'subscribers query failed', details: error.message },
      }
    }

    const allRecipients = data?.map((r) => r.email) || []
    const { toSend: recipients, skipped } = capForFreePlan(allRecipients)
    const pdfUrl = `${APP_URL}${manifest.current.pdf_path}`

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const email of recipients) {
      const result = await sendElCorredorDelivery(email, manifest.current.edition_label, pdfUrl)
      if (result.success) sent++
      else {
        failed++
        if (errors.length < 10) errors.push(`${email}: ${result.error}`)
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    return {
      status: failed > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `El Corredor ${manifest.current.edition_label}: ${sent}/${allRecipients.length} enviados`,
      metadata: {
        ok: true,
        edition: manifest.current.edition_label,
        recipients_total: allRecipients.length,
        skipped,
        sent,
        failed,
        errors: errors.slice(0, 10),
      },
    }
  })

  const meta = { ...(outcome.metadata ?? {}) } as Record<string, unknown>
  const status = typeof meta._status === 'number' ? (meta._status as number) : 200
  delete meta._status
  return NextResponse.json(meta, { status })
}
