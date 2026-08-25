import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getMergedAuctionsForConsignataria } from '@/lib/dal/auctions'
import { createServiceClient } from '@/lib/supabase'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Generate ICS calendar feed for a consignataria's upcoming remates.
 * 
 * Usage:
 * - Google Calendar: Add by URL → paste this endpoint
 * - Apple Calendar: Subscribe → paste this endpoint
 * - Outlook: Import from web → paste this endpoint
 * 
 * Example: /api/calendario/bressan-y-cia
 */

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params
  
  const canonical = getCanonicalSlug(slug)
  if (!canonical) {
    return NextResponse.json({ error: 'Consignataria not found' }, { status: 404 })
  }

  const profile = getProfile(canonical)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get upcoming auctions
  const today = new Date().toISOString().slice(0, 10)
  // Agenda completa (scrape + lo que cargó la firma). Sin el merge, el remate que
  // el dueño publica desde su panel nunca llegaba al calendario que el productor se
  // suscribió — que es exactamente la distribución que le vendemos.
  const profileAuctions = (
    await getMergedAuctionsForConsignataria(
      createServiceClient(),
      canonical,
      profile.displayName,
      getAuctionsForProfile(auctions, canonical),
    )
  )
    .filter(a => a.date >= today)
    .slice(0, 50) // Limit to 50 events

  // Generate ICS content
  const icsContent = generateICS(profile.displayName, canonical, profileAuctions)

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${canonical}-remates.ics"`,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  })
}

function generateICS(displayName: string, slug: string, events: Auction[]): string {
  const now = new Date()
  const timestamp = formatICSDate(now)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consignatarias.com.ar//Calendario de Remates//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Remates de ${escapeICS(displayName)}`,
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
    '',
    // Timezone definition
    'BEGIN:VTIMEZONE',
    'TZID:America/Argentina/Buenos_Aires',
    'X-LIC-LOCATION:America/Argentina/Buenos_Aires',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:ART',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    '',
  ]

  for (const event of events) {
    const uid = `${event.id || event.date}-${slug}@consignatarias.com.ar`
    const summary = escapeICS(event.title)
    const location = escapeICS(event.location || '')
    const description = escapeICS(
      `${event.description || 'Remate de hacienda'}\\n\\n` +
      `Consignataria: ${displayName}\\n` +
      (event.estimatedHeads ? `Cabezas: ${event.estimatedHeads}\\n` : '') +
      (event.catalogUrl ? `Catálogo: ${event.catalogUrl}\\n` : '') +
      (event.youtubeUrl ? `En vivo: ${event.youtubeUrl}\\n` : '') +
      `\\nMás info: https://consignatarias.com.ar/go/${slug}`
    )

    // Parse date and time
    const [year, month, day] = event.date.split('-').map(Number)
    let dtstart: string
    let dtend: string

    if (event.time) {
      const [hour, minute] = event.time.split(':').map(Number)
      const startDate = new Date(year, month - 1, day, hour, minute)
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000) // 3 hours duration
      
      dtstart = `DTSTART;TZID=America/Argentina/Buenos_Aires:${formatICSDateTime(startDate)}`
      dtend = `DTEND;TZID=America/Argentina/Buenos_Aires:${formatICSDateTime(endDate)}`
    } else {
      // All-day event
      dtstart = `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`
      dtend = `DTEND;VALUE=DATE:${event.date.replace(/-/g, '')}`
    }

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      dtstart,
      dtend,
      `SUMMARY:🐄 ${summary}`,
      location ? `LOCATION:${location}` : '',
      `DESCRIPTION:${description}`,
      `URL:https://consignatarias.com.ar/go/${slug}`,
      'STATUS:CONFIRMED',
      `CATEGORIES:Remate,Hacienda,${escapeICS(displayName)}`,
      'END:VEVENT',
      ''
    )
  }

  lines.push('END:VCALENDAR')

  return lines.filter(Boolean).join('\r\n')
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function formatICSDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hour}${minute}${second}`
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
