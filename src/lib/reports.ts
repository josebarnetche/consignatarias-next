import reportsData from './data/reports.json'
import { createAdminClient } from './supabase-server'

export interface Report {
  slug: string
  title: string
  category: 'mensual' | 'trimestral' | 'archivo' | string
  description: string
  publishedAt: string
  format: string
  pages: number | null
  filePath: string
  tag: string | null
}

export interface ReportStats {
  reportSlug: string
  downloadCount: number
  firstDownloadedAt: string | null
  lastDownloadedAt: string | null
}

export function getAllReports(): Report[] {
  return reportsData.reports as Report[]
}

export function getReport(slug: string): Report | null {
  return getAllReports().find((r) => r.slug === slug) ?? null
}

export async function getReportStatsForUser(userId: string): Promise<Record<string, ReportStats>> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_user_report_stats', { p_user_id: userId })
  if (error || !data) return {}

  const result: Record<string, ReportStats> = {}
  for (const row of data as Array<{
    report_slug: string
    download_count: number
    first_downloaded_at: string | null
    last_downloaded_at: string | null
  }>) {
    result[row.report_slug] = {
      reportSlug: row.report_slug,
      downloadCount: row.download_count,
      firstDownloadedAt: row.first_downloaded_at,
      lastDownloadedAt: row.last_downloaded_at,
    }
  }
  return result
}

export async function recordDownload(
  userId: string,
  reportSlug: string,
  ip: string | null,
  userAgent: string | null,
): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('record_report_download', {
    p_user_id: userId,
    p_report_slug: reportSlug,
    p_ip: ip,
    p_user_agent: userAgent,
  })
  if (error) {
    console.error('record_report_download failed', error)
    return 0
  }
  return (data as number) ?? 0
}
