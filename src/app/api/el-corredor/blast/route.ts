import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import manifest from '../../../../../public/el-corredor/manifest.json'

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
 */
export async function POST(req: NextRequest) {
  // Auth via authorizeCron → CRON_SECRET (the one secret that IS set in GitHub + Vercel).
  // Was EL_CORREDOR_BLAST_TOKEN, which was never set anywhere → the monthly blast 401'd /
  // skipped silently for every edition. Same fix as the email crons (1.28.1).
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const outcome = await trackCron('el-corredor-publish', async () => {
    const supabase = requireServiceClient()
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .in('source', [...SEGMENT_SOURCES.corredor])

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
