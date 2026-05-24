import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendElCorredorDelivery } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
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
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.EL_CORREDOR_BLAST_TOKEN}`
  if (!process.env.EL_CORREDOR_BLAST_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active')
    .in('source', [...SEGMENT_SOURCES.corredor])

  if (error) {
    return NextResponse.json({ error: 'subscribers query failed', details: error.message }, { status: 500 })
  }

  const recipients = data?.map((r) => r.email) || []
  const pdfUrl = `${APP_URL}${manifest.current.pdf_path}`

  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Sequential with small delay to avoid Resend burst limits.
  // For >1k recipients, swap to a batched async strategy.
  for (const email of recipients) {
    const result = await sendElCorredorDelivery(email, manifest.current.edition_label, pdfUrl)
    if (result.success) {
      sent++
    } else {
      failed++
      if (errors.length < 10) errors.push(`${email}: ${result.error}`)
    }
    // Polite throttling
    await new Promise((r) => setTimeout(r, 200))
  }

  return NextResponse.json({
    ok: true,
    edition: manifest.current.edition_label,
    recipients_total: recipients.length,
    sent,
    failed,
    errors: errors.slice(0, 10),
  })
}
