import { NextRequest, NextResponse } from 'next/server'
import marketData from '@/lib/data/market-prices.json'

/**
 * Embeddable live SVG price badge — one route serves the INMAG + 6 categories.
 *   GET /api/badge/inmag        GET /api/badge/novillos?theme=light
 * The real value + as-of date are BAKED into the SVG (so it never silently drifts);
 * served with X-Frame-Options ALLOWALL so third-party sites can embed it. The embed
 * snippet wraps it in an <a> to a canonical page → an off-site backlink.
 * (Note: /api/widget/[slug] is taken by the consignataria remates widget — hence /api/badge.)
 */

const cats = marketData.categories as Record<string, { current: number }>
const SLUG_MAP: Record<string, { label: string; value: number }> = {
  inmag: { label: 'INMAG hoy', value: marketData.inmag.current },
  novillos: { label: 'Novillo', value: cats.novillos.current },
  novillitos: { label: 'Novillito', value: cats.novillitos.current },
  vaquillonas: { label: 'Vaquillona', value: cats.vaquillonas.current },
  vacas: { label: 'Vaca', value: cats.vacas.current },
  toros: { label: 'Toro', value: cats.toros.current },
  terneros: { label: 'Ternero', value: cats.terneros.current },
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params
  const entry = SLUG_MAP[slug]
  const light = req.nextUrl.searchParams.get('theme') === 'light'

  const bg = light ? '#ffffff' : '#0a0a0f'
  const border = light ? '#e4e4e7' : '#27272a'
  const labelColor = light ? '#52525b' : '#a1a1aa'
  const valueColor = '#22c55e'
  const footColor = light ? '#71717a' : '#52525b'

  if (!entry) {
    const svg404 = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56" role="img" aria-label="índice no encontrado"><rect width="240" height="56" rx="8" fill="${bg}" stroke="${border}"/><text x="120" y="32" font-family="system-ui,sans-serif" font-size="13" fill="${labelColor}" text-anchor="middle">índice no encontrado</text></svg>`
    return new NextResponse(svg404, { status: 404, headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } })
  }

  const valueStr = entry.value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  const dateStr = fmtDate(marketData.lastUpdate)
  const aria = `${entry.label}: $${valueStr} por kg vivo, al ${dateStr}, consignatarias.com.ar`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56" role="img" aria-label="${escapeXml(aria)}">
  <rect width="240" height="56" rx="8" fill="${bg}" stroke="${border}"/>
  <text x="14" y="21" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600" letter-spacing="0.06em" fill="${labelColor}">${escapeXml(entry.label.toUpperCase())}</text>
  <text x="14" y="40" font-family="ui-monospace,Menlo,monospace" font-size="18" font-weight="700" fill="${valueColor}">$${escapeXml(valueStr)}<tspan font-size="11" fill="${labelColor}" dx="3">/kg vivo</tspan></text>
  <text x="226" y="51" font-family="system-ui,sans-serif" font-size="8" fill="${footColor}" text-anchor="end">al ${escapeXml(dateStr)} · consignatarias.com.ar</text>
</svg>`

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
      'X-Frame-Options': 'ALLOWALL',
    },
  })
}
