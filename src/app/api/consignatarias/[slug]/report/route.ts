import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile } from '@/lib/dal/consignatarias'
import { getConsignatariaPlanStatus } from '@/lib/features'
import { generateConsignatariaPDF } from '@/lib/pdf/generateConsignatariaPDF'
import { requireLoginForDownload } from '@/lib/gate'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Generate branded PDF report for a consignataria.
 * PRO users get enhanced branding with gold accents.
 * 
 * GET /api/consignatarias/[slug]/report
 */

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params

  // Acción clave: el PDF del reporte requiere cuenta.
  const gate = await requireLoginForDownload(req, `/consignatarias/${slug}`)
  if (gate) return gate
  
  const canonical = getCanonicalSlug(slug)
  if (!canonical) {
    return NextResponse.json({ error: 'Consignataria not found' }, { status: 404 })
  }

  const profile = await getConsignatariaProfile(canonical)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get all auctions for this consignataria
  const profileAuctions = getAuctionsForProfile(auctions, canonical)
  const today = new Date().toISOString().slice(0, 10)
  
  // Upcoming remates
  const upcomingRemates = profileAuctions
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20)
    .map(a => ({
      fecha: a.date,
      ubicacion: a.location,
      tipo: a.type,
      cabezas: a.estimatedHeads,
      source: a.source,
    }))

  // Stats
  const provinces = [...new Set(profileAuctions.map(a => a.province))]
  const types = [...new Set(profileAuctions.map(a => a.type))]
  const totalCabezas = profileAuctions.reduce((sum, a) => sum + (a.estimatedHeads || 0), 0)

  // Estado PRO desde la fuente única (honra featured=true y valida el período).
  const { isPro } = await getConsignatariaPlanStatus(canonical)

  // Generate PDF
  const doc = generateConsignatariaPDF({
    consignataria: {
      name: profile.displayName,
      slug: canonical,
      logoUrl: profile.logoUrl,
      verified: profile.verified,
      isPro,
      provincia: provinces[0],
      phone: profile.phone ?? undefined,
      email: profile.email ?? undefined,
      website: profile.website ?? undefined,
    },
    stats: {
      totalRemates: profileAuctions.length,
      upcomingRemates: upcomingRemates.length,
      totalCabezas,
      provinces,
      types,
    },
    upcomingRemates,
    generatedAt: new Date().toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  })

  const pdfBuffer = doc.output('arraybuffer')

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${canonical}.pdf"`,
    },
  })
}
