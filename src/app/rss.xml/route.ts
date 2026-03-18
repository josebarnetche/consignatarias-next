import { type NextRequest } from 'next/server'
import rematesData from '@/lib/data/remates.json'

interface Remate {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string // YYYY-MM-DD format
  time: string | null
  location: string
  province: string
  type: string
  mainCategory: string
  estimatedHeads: number | null
  description: string | null
  youtubeUrl: string | null
  catalogUrl: string | null
  source: string
  sourceUrl: string | null
  status?: string
  featured?: boolean
}

const remates = rematesData as unknown as Remate[]

/**
 * RSS 2.0 Feed for Remates Ganaderos
 * Insight #41 - Enables syndication via feed readers, aggregators, and auto-newsletters
 */
export async function GET(_request: NextRequest) {
  const baseUrl = 'https://www.consignatarias.com.ar'
  const now = new Date()
  
  // Get upcoming remates (future dates), sorted by date
  const upcomingRemates = remates
    .filter(r => {
      const remateDate = parseDate(r.date)
      return remateDate && remateDate >= now
    })
    .sort((a, b) => {
      const dateA = parseDate(a.date)
      const dateB = parseDate(b.date)
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
    })
    .slice(0, 50) // Limit to 50 items

  const items = upcomingRemates.map(r => {
    const remateDate = parseDate(r.date)
    const pubDate = remateDate ? remateDate.toUTCString() : now.toUTCString()
    const cabezasText = r.estimatedHeads ? ` - ${r.estimatedHeads.toLocaleString('es-AR')} cabezas` : ''
    const description = r.description || `Remate de ${r.type} en ${r.location}${cabezasText}`
    
    // Link to remates page with province filter if available
    const provinceSlug = r.province ? r.province.toLowerCase().replace(/ /g, '-') : ''
    const link = provinceSlug 
      ? `${baseUrl}/remates/${provinceSlug}` 
      : `${baseUrl}/remates`

    return `    <item>
      <title><![CDATA[${escapeXml(r.consignatariaName)} - ${r.type} en ${r.location}]]></title>
      <link>${link}</link>
      <description><![CDATA[${escapeXml(description)}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">remate-${r.id}</guid>
      <category>${escapeXml(r.type)}</category>
      <category>${escapeXml(r.province)}</category>
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Remates Ganaderos de Argentina - consignatarias.com.ar</title>
    <link>${baseUrl}</link>
    <description>Calendario de remates ganaderos de Argentina. Actualizaciones diarias de remates de hacienda, invernada, cría, reproductores y más.</description>
    <language>es-AR</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/icon-192x192.png</url>
      <title>consignatarias.com.ar</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

/**
 * Parse YYYY-MM-DD date format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
