import { ImageResponse } from 'next/og'
import marketData from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import { OG_COLORS, loadOgFonts, BrandChrome, Halo } from '@/lib/og/brand'

// Dynamic price-OG card for /mercado/inmag — bakes the live INMAG number into
// every WhatsApp / social / press link preview (the same "price-in-the-title"
// lever that lifts CTR ~2.4x on this page). It imports market-prices.json, which
// is git-committed by the daily scraper, so the card refreshes on each deploy
// with a clean cache-bust — no runtime cost.
//
// Sistema de marca compartido en src/lib/og/brand.tsx.

export const alt = 'INMAG hoy — Índice Novillo del Mercado Agroganadero de Buenos Aires'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const { CARBON, PANEL, LINEA, HUESO, MUTED, MUTED2, CIELO, PASTURA, ROJO } = OG_COLORS

export default async function OGImage() {
  const fonts = await loadOgFonts()

  const inmag = marketData.inmag
  const price = Math.round(inmag.current).toLocaleString('es-AR')
  const change = inmag.change || 0
  const up = change >= 0
  const flat = change === 0
  const changeColor = flat ? MUTED : up ? PASTURA : ROJO
  const changeStr = `${flat ? '' : up ? '↑ +' : '↓ '}${Math.abs(change).toFixed(1).replace('.', ',')}% vs. anterior`

  // market-prices.json carries lastUpdate as YYYY-MM-DD; show dd/mm/yyyy.
  const lastUpdate = INMAG_DATE // fecha de la última rueda del índice, no del scrape
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
          fontFamily: 'JetBrains Mono',
          background: CARBON,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Halo />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '56px 76px',
            position: 'relative',
          }}
        >
          <BrandChrome />

          {/* el número */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                color: MUTED2,
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: '0.1em',
              }}
            >
              CIERRE INMAG · NOVILLO
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '22px' }}>
              <span
                style={{
                  color: HUESO,
                  fontSize: 148,
                  fontWeight: 700,
                  lineHeight: 1.0,
                  letterSpacing: '-0.04em',
                }}
              >
                ${price}
              </span>
              <span style={{ color: MUTED2, fontSize: 38, fontWeight: 500 }}>/kg vivo</span>
            </div>
            <span style={{ color: changeColor, fontSize: 32, fontWeight: 700 }}>{changeStr}</span>
          </div>

          {/* fuente + frescura */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: MUTED, fontSize: 22, fontWeight: 500, maxWidth: '720px' }}>
              Fuente: MAG · serie diaria 2015→hoy · ARS/kg
            </span>
            {dateStr ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: PANEL,
                  border: `1px solid ${LINEA}`,
                  borderRadius: '2px',
                  padding: '10px 22px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    background: CIELO,
                    borderRadius: '50%',
                    boxShadow: '0 0 0 4px rgba(56,189,248,0.18)',
                    display: 'flex',
                  }}
                />
                <span style={{ color: CIELO, fontSize: 22, fontWeight: 500 }}>{dateStr}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  )
}
