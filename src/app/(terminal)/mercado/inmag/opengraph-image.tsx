import { readFile } from 'fs/promises'
import { join } from 'path'
import { ImageResponse } from 'next/og'
import marketData from '@/lib/data/market-prices.json'

// Dynamic price-OG card for /mercado/inmag — bakes the live INMAG number into
// every WhatsApp / social / press link preview (the same "price-in-the-title"
// lever that lifts CTR ~2.4x on this page). It imports market-prices.json, which
// is git-committed by the daily scraper, so the card refreshes on each deploy
// with a clean cache-bust — no runtime cost.
//
// Brand system v2.0 (marca/): carbón + JetBrains Mono + cielo como único acento;
// pastura/rojo SOLO para la variación. Isotipo "la C y el dato" en el chrome.

export const alt = 'INMAG hoy — Índice Novillo del Mercado Agroganadero de Buenos Aires'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CARBON = '#09090b'
const PANEL = '#18181b'
const LINEA = '#27272a'
const HUESO = '#fafafa'
const MUTED = '#a1a1aa'
const MUTED2 = '#71717a'
const CIELO = '#38bdf8'
const PASTURA = '#10b981'
const ROJO = '#f87171'

// Isotipo "la C y el dato" — misma geometría que marca/build_logos.py
const ISO_RING =
  'M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z'

export default async function OGImage() {
  const [fontBold, fontMedium] = await Promise.all([
    readFile(join(process.cwd(), 'src/fonts/JetBrainsMono-Bold.ttf')),
    readFile(join(process.cwd(), 'src/fonts/JetBrainsMono-Medium.ttf')),
  ])

  const inmag = marketData.inmag
  const price = Math.round(inmag.current).toLocaleString('es-AR')
  const change = inmag.change || 0
  const up = change >= 0
  const flat = change === 0
  const changeColor = flat ? MUTED : up ? PASTURA : ROJO
  const changeStr = `${flat ? '' : up ? '↑ +' : '↓ '}${Math.abs(change).toFixed(1).replace('.', ',')}% vs. anterior`

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
          fontFamily: 'JetBrains Mono',
          background: CARBON,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* halo cielo — el único gradiente permitido */}
        <div
          style={{
            position: 'absolute',
            top: '-260px',
            left: '300px',
            width: '640px',
            height: '520px',
            background: 'radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)',
            borderRadius: '9999px',
            display: 'flex',
          }}
        />

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
          {/* chrome de marca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <svg width="46" height="46" viewBox="0 0 512 512">
              <path d={ISO_RING} fill={HUESO} />
              <rect x="379.7" y="168.1" width="118" height="118" fill={CIELO} />
            </svg>
            <span style={{ color: HUESO, fontSize: 27, fontWeight: 700, display: 'flex' }}>
              consignatarias<span style={{ color: CIELO }}>.</span>com
            </span>
            <span
              style={{
                color: MUTED2,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '0.2em',
                marginLeft: '12px',
              }}
            >
              MERCADO GANADERO ARGENTINO
            </span>
          </div>

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
      fonts: [
        { name: 'JetBrains Mono', data: fontBold, weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: fontMedium, weight: 500, style: 'normal' },
      ],
    }
  )
}
