import { ImageResponse } from 'next/og'
import marketData from '@/lib/data/market-prices.json'

// Dynamic price-OG card for /mercado/inmag — bakes the live INMAG number into
// every WhatsApp / social / press link preview (the same "price-in-the-title"
// lever that lifts CTR ~2.4x on this page). It imports market-prices.json, which
// is git-committed by the daily scraper, so the card refreshes on each deploy
// with a clean cache-bust — no runtime cost.

export const alt = 'INMAG hoy — Índice Novillo del Mercado Agroganadero de Buenos Aires'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  const inmag = marketData.inmag
  const price = Math.round(inmag.current).toLocaleString('es-AR')
  const change = inmag.change || 0
  const up = change >= 0
  const flat = change === 0
  const changeColor = flat ? '#a1a1aa' : up ? '#22c55e' : '#f87171'
  const changeStr = `${flat ? '' : up ? '▲ ' : '▼ '}${Math.abs(change).toFixed(1)}% vs. anterior`

  // market-prices.json carries lastUpdate as YYYY-MM-DD; show dd/mm/yyyy.
  const lastUpdate = (marketData as { lastUpdate?: string }).lastUpdate || ''
  const [y, m, d] = lastUpdate.split('-')
  const dateStr = y && m && d ? `${d}/${m}/${y}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#000000',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient mesh */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-300px',
            left: '-100px',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '60px 80px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top: Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: '#a1a1aa', fontSize: 24, fontWeight: 500 }}>
              consignatarias.com.ar
            </span>
          </div>

          {/* Center: the number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ color: '#22c55e', fontSize: 30, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              INMAG hoy · Índice Novillo
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
              <span style={{ color: '#ffffff', fontSize: 150, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.04em' }}>
                ${price}
              </span>
              <span style={{ color: '#71717a', fontSize: 40, fontWeight: 500 }}>/kg vivo</span>
            </div>
            <span style={{ color: changeColor, fontSize: 34, fontWeight: 600 }}>{changeStr}</span>
          </div>

          {/* Bottom: source + freshness */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ color: '#a1a1aa', fontSize: 26, fontWeight: 500, maxWidth: '740px' }}>
              Mercado Agroganadero de Buenos Aires · ARS/kg
            </span>
            {dateStr ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '9999px',
                  padding: '10px 24px',
                }}
              >
                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                <span style={{ color: '#22c55e', fontSize: 24, fontWeight: 500 }}>{dateStr}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
