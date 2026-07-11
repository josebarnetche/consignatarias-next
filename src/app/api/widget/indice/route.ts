import { NextRequest, NextResponse } from 'next/server'
import marketPrices from '@/lib/data/market-prices.json'

/**
 * Embeddable LIVE INDEX badge — el activo de backlinks del data-layer.
 *
 * Muestra el índice del novillo para arrendamiento (haciinfo000013) + el INMAG
 * diario, con un enlace dofollow de vuelta a /mercado/arrendamiento. Cualquier
 * consignataria, contador o sitio rural que lo embeba en su web nos genera un
 * backlink temático — y el dato siempre está fresco, así que hay incentivo real
 * para dejarlo puesto.
 *
 *   GET /api/widget/indice
 *   GET /api/widget/indice?theme=light
 *   GET /api/widget/indice?compact=1   (solo el número de arrendamiento)
 *
 * Devuelve HTML frameable (headers permisivos abajo + excepción en next.config.js).
 * Se actualiza a diario junto con market-prices.json.
 */

type Arr = { date: string; index: number; periodStart: string; periodEnd: string; periodIndex: number }
type Inmag = { current: number; change: number; unit: string }

const BASE = 'https://www.consignatarias.com.ar'

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  const arr = (marketPrices as { arrendamientoOficial: Arr }).arrendamientoOficial
  const inmag = (marketPrices as { inmag: Inmag }).inmag

  const theme = req.nextUrl.searchParams.get('theme') === 'light' ? 'light' : 'dark'
  const compact = req.nextUrl.searchParams.get('compact') === '1'

  const html = compact
    ? generateCompactHTML(arr, theme)
    : generateFullHTML(arr, inmag, theme)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Se re-genera a diario con el dato; cache de 1h en CDN, revalida rápido.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      // Framing permisivo SOLO para este widget (la excepción en next.config.js
      // libera /api/widget del frame-ancestors 'self' global).
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': 'frame-ancestors *',
    },
  })
}

function palette(theme: string) {
  const isDark = theme === 'dark'
  return {
    bg: isDark ? '#0a0a0f' : '#ffffff',
    border: isDark ? '#27272a' : '#e4e4e7',
    text: isDark ? '#fafafa' : '#18181b',
    muted: isDark ? '#a1a1aa' : '#71717a',
    panel: isDark ? '#18181b' : '#f4f4f5',
    accent: '#06b6d4',
    up: '#22c55e',
    down: '#ef4444',
  }
}

function generateFullHTML(arr: Arr, inmag: Inmag, theme: string): string {
  const c = palette(theme)
  const changeColor = inmag.change >= 0 ? c.up : c.down
  const changeSign = inmag.change >= 0 ? '+' : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Índice Novillo Arrendamiento — consignatarias.com.ar</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${c.bg}; color: ${c.text}; }
    a { color: ${c.accent}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .tnum { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <div style="border: 1px solid ${c.border}; border-radius: 10px; overflow: hidden; max-width: 340px;">
    <div style="padding: 12px 16px 10px; border-bottom: 1px solid ${c.border};">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: ${c.muted}; margin-bottom: 6px;">
        Índice novillo · arrendamiento
      </div>
      <div class="tnum" style="font-size: 30px; font-weight: 700; color: ${c.text}; line-height: 1;">
        ${fmt(arr.index)}<span style="font-size: 14px; font-weight: 500; color: ${c.muted};"> /kg</span>
      </div>
      <div style="font-size: 11px; color: ${c.muted}; margin-top: 5px;">
        Promedio período ${fmtDate(arr.periodStart)} – ${fmtDate(arr.periodEnd)}: <span class="tnum" style="color:${c.text};">${fmt(arr.periodIndex)}/kg</span>
      </div>
    </div>
    <div style="padding: 10px 16px; border-bottom: 1px solid ${c.border}; display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-size: 12px; color: ${c.muted};">INMAG novillo (diario)</span>
      <span class="tnum" style="font-size: 13px; font-weight: 600; color: ${c.text};">
        ${fmt(inmag.current)}/kg <span style="color: ${changeColor}; font-weight: 500;">${changeSign}${inmag.change.toFixed(1)}%</span>
      </span>
    </div>
    <div style="padding: 9px 16px; background: ${c.panel}; display: flex; justify-content: space-between; align-items: center;">
      <a href="${BASE}/mercado/arrendamiento" target="_blank" rel="noopener" style="font-size: 11px; font-weight: 500;">
        Ver el índice completo →
      </a>
      <a href="${BASE}" target="_blank" rel="noopener" style="font-size: 10px; color: ${c.muted};">
        consignatarias.com.ar
      </a>
    </div>
  </div>
</body>
</html>`
}

function generateCompactHTML(arr: Arr, theme: string): string {
  const c = palette(theme)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Índice Novillo Arrendamiento</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${c.bg}; color: ${c.text}; }
    a { text-decoration: none; color: inherit; }
    .tnum { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <a href="${BASE}/mercado/arrendamiento" target="_blank" rel="noopener" style="display: inline-flex; align-items: baseline; gap: 8px; border: 1px solid ${c.border}; border-radius: 8px; padding: 8px 12px;">
    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: ${c.muted};">Novillo arrend.</span>
    <span class="tnum" style="font-size: 18px; font-weight: 700;">${fmt(arr.index)}<span style="font-size: 11px; font-weight: 500; color: ${c.muted};">/kg</span></span>
  </a>
</body>
</html>`
}
