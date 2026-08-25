import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getMergedAuctionsForConsignataria } from '@/lib/dal/auctions'
import { createServiceClient } from '@/lib/supabase'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Embeddable widget for consignataria's upcoming remates.
 * Can be embedded on their own website via iframe.
 * 
 * GET /api/widget/bressan-y-cia
 * GET /api/widget/bressan-y-cia?theme=light&max=3
 * 
 * Returns HTML that can be displayed in an iframe.
 */

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params
  
  const canonical = getCanonicalSlug(slug)
  if (!canonical) {
    return new NextResponse(generateErrorHTML('Consignataria no encontrada'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const profile = getProfile(canonical)
  if (!profile) {
    return new NextResponse(generateErrorHTML('Perfil no encontrado'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Query params
  const theme = req.nextUrl.searchParams.get('theme') || 'dark'
  const max = Math.min(parseInt(req.nextUrl.searchParams.get('max') || '3'), 5)

  // Get upcoming auctions
  const today = new Date().toISOString().slice(0, 10)
  // El widget es lo que la firma embebe en SU sitio. Si el remate que cargó en el
  // panel no aparece acá, el producto queda desmentido en su propia página.
  const upcoming = (
    await getMergedAuctionsForConsignataria(
      createServiceClient(),
      canonical,
      profile.displayName,
      getAuctionsForProfile(auctions, canonical),
    )
  )
    .filter(a => a.date >= today)
    .slice(0, max)

  const html = generateWidgetHTML(profile.displayName, canonical, upcoming, theme)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800', // Cache 30 min
      'X-Frame-Options': 'ALLOWALL', // Allow embedding
    },
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function generateWidgetHTML(
  displayName: string, 
  slug: string, 
  auctions: Auction[], 
  theme: string
): string {
  const isDark = theme === 'dark'
  
  const bgColor = isDark ? '#0a0a0f' : '#ffffff'
  const borderColor = isDark ? '#27272a' : '#e4e4e7'
  const textColor = isDark ? '#e4e4e7' : '#18181b'
  const mutedColor = isDark ? '#71717a' : '#a1a1aa'
  const accentColor = '#22c55e'
  const linkColor = isDark ? '#06b6d4' : '#0891b2'

  const auctionRows = auctions.length > 0
    ? auctions.map(a => `
      <div style="padding: 12px 16px; border-bottom: 1px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 500; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(a.title)}
            </div>
            <div style="font-size: 11px; color: ${mutedColor}; margin-top: 2px;">
              ${a.location ? escapeHtml(a.location) : ''}
            </div>
          </div>
          <div style="flex-shrink: 0; text-align: right;">
            <div style="font-size: 12px; font-weight: 500; color: ${accentColor};">
              ${formatDate(a.date)}
            </div>
            ${a.time ? `<div style="font-size: 11px; color: ${mutedColor};">${a.time} hs</div>` : ''}
          </div>
        </div>
      </div>
    `).join('')
    : `
      <div style="padding: 24px 16px; text-align: center; color: ${mutedColor}; font-size: 13px;">
        No hay remates programados
      </div>
    `

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Remates de ${escapeHtml(displayName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${bgColor};
      color: ${textColor};
    }
    a { color: ${linkColor}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div style="border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden; max-width: 400px;">
    <!-- Header -->
    <div style="padding: 12px 16px; border-bottom: 1px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 14px; font-weight: 600; color: ${textColor};">
        🐄 ${escapeHtml(displayName)}
      </div>
      <div style="font-size: 10px; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.5px;">
        Próximos remates
      </div>
    </div>

    <!-- Auctions -->
    ${auctionRows}

    <!-- Footer -->
    <div style="padding: 10px 16px; background: ${isDark ? '#18181b' : '#f4f4f5'}; display: flex; justify-content: space-between; align-items: center;">
      <a href="https://consignatarias.com.ar/go/${slug}" target="_blank" style="font-size: 11px;">
        Ver todos los remates →
      </a>
      <a href="https://consignatarias.com.ar" target="_blank" style="font-size: 10px; color: ${mutedColor};">
        consignatarias.com.ar
      </a>
    </div>
  </div>
</body>
</html>`
}

function generateErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Error</title>
</head>
<body style="font-family: sans-serif; padding: 20px; text-align: center; color: #666;">
  <p>${escapeHtml(message)}</p>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
