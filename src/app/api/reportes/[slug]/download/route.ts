import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentSession } from '@/lib/user-tier'
import { hasApiAccess } from '@/lib/api-keys'
import { getReport, recordDownload } from '@/lib/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Auth check
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(`/cuenta/reportes`)}`, req.url),
    )
  }

  // PRO Usuario OR any Enterprise tier
  const session = await getCurrentSession()
  const isEnterprise = await hasApiAccess(user.id)
  if (session.tier !== 'pro' && !isEnterprise) {
    return NextResponse.redirect(
      new URL('/upgrade?next=/cuenta/reportes', req.url),
    )
  }

  // Report exists?
  const report = getReport(slug)
  if (!report) {
    return NextResponse.json(
      { error: 'report_not_found', slug },
      { status: 404 },
    )
  }

  // Record download (non-blocking concern, but we await for accurate counts)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null
  await recordDownload(user.id, slug, ip, userAgent)

  // Redirect to file. For private storage, swap for Supabase signed URL.
  const fileUrl = new URL(report.filePath, req.url)
  return NextResponse.redirect(fileUrl, { status: 302 })
}
