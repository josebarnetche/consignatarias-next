import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile } from '@/lib/dal/consignatarias'
import { createServiceClient } from '@/lib/supabase'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Generate monthly performance report PDF for a consignataria.
 * PRO feature - requires authentication.
 * 
 * GET /api/consignatarias/[slug]/report?month=2026-03
 */

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params
  
  const canonical = getCanonicalSlug(slug)
  if (!canonical) {
    return NextResponse.json({ error: 'Consignataria not found' }, { status: 404 })
  }

  const profile = await getConsignatariaProfile(canonical)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get month parameter (default: current month)
  const monthParam = req.nextUrl.searchParams.get('month')
  const now = new Date()
  const [year, month] = monthParam 
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`
  const monthName = new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // Get auctions for this month
  const monthAuctions = getAuctionsForProfile(auctions, canonical)
    .filter(a => a.date >= monthStart && a.date <= monthEnd)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Get view count for this month
  let viewCount = 0
  try {
    const service = createServiceClient()
    const { count } = await service
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('entity_slug', canonical)
      .gte('viewed_at', `${monthStart}T00:00:00`)
      .lte('viewed_at', `${monthEnd}T23:59:59`)
    
    viewCount = count ?? 0
  } catch {
    // Continue without view data
  }

  // Get auction results for this month
  let results: { total_heads_sold: number; average_price: number }[] = []
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('auction_results')
      .select('total_heads_sold, average_price')
      .eq('consignataria_slug', canonical)
      .gte('auction_date', monthStart)
      .lte('auction_date', monthEnd)
    
    results = data || []
  } catch {
    // Continue without results
  }

  // Calculate stats
  const totalHeads = results.reduce((sum, r) => sum + (r.total_heads_sold || 0), 0)
  const avgPrice = results.length > 0
    ? results.reduce((sum, r) => sum + (r.average_price || 0), 0) / results.length
    : 0

  // Generate PDF using jspdf (dynamic import for server-side)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Colors
  const darkBg = '#0a0a0f'
  const textWhite = '#e4e4e7'
  const textGray = '#71717a'
  const accent = '#22c55e'
  const amber = '#fbbf24'

  // Background
  doc.setFillColor(10, 10, 15)
  doc.rect(0, 0, 210, 297, 'F')

  // Header
  doc.setTextColor(228, 228, 231)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE MENSUAL', 20, 30)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)
  doc.text(profile.displayName, 20, 40)
  doc.text(monthName.toUpperCase(), 20, 48)

  // Stats boxes
  const boxY = 65
  const boxHeight = 35
  const boxWidth = 55

  // Box 1: Remates
  doc.setFillColor(22, 22, 29)
  doc.roundedRect(20, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setTextColor(113, 113, 122)
  doc.setFontSize(10)
  doc.text('REMATES', 25, boxY + 12)
  doc.setTextColor(228, 228, 231)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(String(monthAuctions.length), 25, boxY + 28)

  // Box 2: Vistas
  doc.setFillColor(22, 22, 29)
  doc.roundedRect(80, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setTextColor(113, 113, 122)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('VISTAS PERFIL', 85, boxY + 12)
  doc.setTextColor(34, 197, 94)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(viewCount.toLocaleString('es-AR'), 85, boxY + 28)

  // Box 3: Cabezas vendidas
  doc.setFillColor(22, 22, 29)
  doc.roundedRect(140, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setTextColor(113, 113, 122)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('CABEZAS', 145, boxY + 12)
  doc.setTextColor(251, 191, 36)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(totalHeads > 0 ? totalHeads.toLocaleString('es-AR') : '—', 145, boxY + 28)

  // Remates list
  doc.setTextColor(228, 228, 231)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('CALENDARIO DEL MES', 20, 115)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(161, 161, 170)

  let y = 125
  if (monthAuctions.length === 0) {
    doc.text('No hubo remates programados este mes.', 20, y)
  } else {
    for (const auction of monthAuctions.slice(0, 10)) {
      const dateStr = new Date(auction.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      doc.setTextColor(161, 161, 170)
      doc.text(dateStr, 20, y)
      doc.setTextColor(228, 228, 231)
      doc.text(auction.title.slice(0, 50), 40, y)
      if (auction.estimatedHeads) {
        doc.setTextColor(113, 113, 122)
        doc.text(`${auction.estimatedHeads} cab`, 160, y)
      }
      y += 8
    }
    if (monthAuctions.length > 10) {
      doc.setTextColor(113, 113, 122)
      doc.text(`+ ${monthAuctions.length - 10} remates más`, 20, y)
    }
  }

  // Footer
  doc.setTextColor(63, 63, 70)
  doc.setFontSize(8)
  doc.text('Generado por consignatarias.com.ar', 20, 280)
  doc.text(new Date().toLocaleDateString('es-AR'), 170, 280)

  // Output
  const pdfBuffer = doc.output('arraybuffer')

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${canonical}-${year}-${String(month).padStart(2, '0')}.pdf"`,
    },
  })
}
