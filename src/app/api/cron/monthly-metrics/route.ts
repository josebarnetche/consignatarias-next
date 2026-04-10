import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMonthlyMetrics } from '@/lib/email'

/**
 * Monthly metrics email — sends profile view stats to all claimed consignatarias.
 * Triggered by GitHub Actions cron (1st of each month) or manually via admin.
 * Auth: requires ADMIN_SECRET as Bearer token or ?secret= query param.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    || req.nextUrl.searchParams.get('secret')

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = requireServiceClient()

  // Get all claimed consignatarias with owner email
  const { data: claimed } = await supabase
    .from('consignatarias')
    .select('canonical_slug, display_name, claimed_by_email')
    .not('claimed_by_email', 'is', null)

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ message: 'No hay consignatarias reclamadas', sent: 0 })
  }

  // Date range: previous month
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthName = firstOfLastMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // Get view counts for all claimed slugs in the previous month
  const slugs = claimed.map(c => c.canonical_slug)

  const { data: viewRows } = await supabase
    .from('profile_views')
    .select('entity_slug')
    .in('entity_slug', slugs)
    .gte('viewed_at', firstOfLastMonth.toISOString())
    .lt('viewed_at', firstOfThisMonth.toISOString())

  // Count views per slug
  const viewCounts: Record<string, number> = {}
  if (viewRows) {
    for (const row of viewRows) {
      viewCounts[row.entity_slug] = (viewCounts[row.entity_slug] || 0) + 1
    }
  }

  // Send emails
  let sent = 0
  const errors: string[] = []

  for (const consig of claimed) {
    const views = viewCounts[consig.canonical_slug] || 0
    try {
      await sendMonthlyMetrics(
        consig.claimed_by_email,
        consig.display_name,
        consig.canonical_slug,
        views,
        monthName,
      )
      sent++
    } catch (err) {
      errors.push(`${consig.canonical_slug}: ${err}`)
    }
  }

  return NextResponse.json({
    message: `Emails enviados: ${sent}/${claimed.length}`,
    sent,
    total: claimed.length,
    month: monthName,
    errors: errors.length > 0 ? errors : undefined,
  })
}
