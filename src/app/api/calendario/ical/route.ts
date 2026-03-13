import { NextRequest, NextResponse } from 'next/server'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatIcalDate(date: string, time: string | null): string {
  const d = date.replace(/-/g, '')
  if (time) {
    const t = time.replace(':', '') + '00'
    return `${d}T${t}`
  }
  return d
}

function generateUID(auction: Auction): string {
  return `remate-${auction.id}@consignatarias.com.ar`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provincia = searchParams.get('provincia')?.toUpperCase()
  const tipo = searchParams.get('tipo')
  const dias = parseInt(searchParams.get('dias') || '30', 10)

  const today = new Date().toISOString().slice(0, 10)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + dias)
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  let filtered = auctions.filter(a => a.date >= today && a.date <= maxDateStr)

  if (provincia) {
    filtered = filtered.filter(a => a.province === provincia)
  }
  if (tipo) {
    filtered = filtered.filter(a => a.type === tipo)
  }

  // Build iCal content
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consignatarias.com.ar//Calendario de Remates//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Remates Ganaderos Argentina',
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
  ]

  for (const auction of filtered) {
    const dtStart = formatIcalDate(auction.date, auction.time)
    const dtEnd = formatIcalDate(auction.date, auction.time ? 
      `${parseInt(auction.time.split(':')[0]) + 3}:${auction.time.split(':')[1]}` : null)
    
    const summary = `${auction.consignatariaName} - ${auction.type.toUpperCase()}`
    const description = [
      auction.title,
      `Tipo: ${auction.type}`,
      auction.estimatedHeads ? `Cabezas estimadas: ${auction.estimatedHeads}` : '',
      auction.catalogUrl ? `Catálogo: ${auction.catalogUrl}` : '',
      auction.youtubeUrl ? `Transmisión: ${auction.youtubeUrl}` : '',
      `Ver más: https://www.consignatarias.com.ar/consignatarias/${auction.consignatariaSlug}`,
    ].filter(Boolean).join('\\n')

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${generateUID(auction)}`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
    lines.push(`DTSTART:${dtStart}`)
    lines.push(`DTEND:${dtEnd}`)
    lines.push(`SUMMARY:${escapeIcal(summary)}`)
    lines.push(`DESCRIPTION:${escapeIcal(description)}`)
    lines.push(`LOCATION:${escapeIcal(auction.location)}`)
    lines.push(`GEO:${auction.province}`)
    lines.push(`CATEGORIES:REMATE,${auction.type.toUpperCase()},${auction.province}`)
    if (auction.catalogUrl) {
      lines.push(`URL:${auction.catalogUrl}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const icalContent = lines.join('\r\n')

  return new NextResponse(icalContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="remates-ganaderos.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
