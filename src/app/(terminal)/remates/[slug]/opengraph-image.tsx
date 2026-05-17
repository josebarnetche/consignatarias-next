import { ImageResponse } from 'next/og'
import rematesData from '@/lib/data/remates.json'

export const alt = 'Remate Ganadero — consignatarias.com.ar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = false
export const dynamicParams = true

const TYPE_LABELS: Record<string, string> = {
  invernada: 'INVERNADA',
  cria: 'CRÍA',
  general: 'GENERAL',
  especial: 'ESPECIAL',
  reproductores: 'REPRODUCTORES',
}

const MONTHS_ES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

function generateRemateSlug(r: typeof rematesData[0]): string {
  const parts = [
    r.consignatariaSlug || 'remate',
    r.type || 'general',
    r.province?.toLowerCase().replace(/\s+/g, '-') || 'argentina',
    r.date,
  ]
  return parts.join('-')
}

function fallback(message = 'Remate Ganadero') {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ color: '#22c55e', fontSize: 48, fontWeight: 600, marginBottom: 12 }}>
          consignatarias.com.ar
        </div>
        <div style={{ color: '#a1a1aa', fontSize: 28 }}>{message}</div>
      </div>
    ),
    { ...size },
  )
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const remate = (rematesData as typeof rematesData).find((r) => generateRemateSlug(r) === slug)

  if (!remate) return fallback()

  const date = new Date((remate.date as string) + 'T12:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_ES[date.getMonth()] ?? ''
  const year = date.getFullYear()
  const typeLabel = TYPE_LABELS[remate.type as string] || (remate.type as string).toUpperCase()
  const consigName = (remate as { consignatariaName?: string }).consignatariaName || (remate.consignatariaSlug as string)
  const location = (remate.location as string) || ((remate.province as string) ?? 'Argentina')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* gradient accents */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 800,
            height: 800,
            background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)',
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
          {/* Top: brand + type pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                C
              </div>
              <span style={{ color: '#a1a1aa', fontSize: 22, fontWeight: 500 }}>
                consignatarias.com.ar
              </span>
            </div>
            <div
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 9999,
                padding: '8px 18px',
                color: '#22c55e',
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              REMATE · {typeLabel}
            </div>
          </div>

          {/* Center: title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                color: '#ffffff',
                fontSize: consigName.length > 24 ? 68 : 84,
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.025em',
                maxWidth: '100%',
              }}
            >
              {consigName}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: 30, fontWeight: 500 }}>
              {location}
            </div>
          </div>

          {/* Bottom: date hero + cabezas */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 160,
                  height: 160,
                  border: '2px solid rgba(34,197,94,0.4)',
                  borderRadius: 18,
                  background: 'rgba(34,197,94,0.06)',
                }}
              >
                <span
                  style={{
                    color: '#22c55e',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                  }}
                >
                  {month}
                </span>
                <span style={{ color: '#ffffff', fontSize: 72, fontWeight: 700, lineHeight: 1 }}>
                  {day}
                </span>
                <span style={{ color: '#71717a', fontSize: 18, fontWeight: 500 }}>{year}</span>
              </div>
              {remate.time && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    paddingBottom: 12,
                  }}
                >
                  <span
                    style={{
                      color: '#71717a',
                      fontSize: 16,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Horario
                  </span>
                  <span style={{ color: '#ffffff', fontSize: 32, fontWeight: 600 }}>
                    {String((remate as { time?: string }).time)} hs
                  </span>
                </div>
              )}
            </div>

            {(remate as { estimatedHeads?: number }).estimatedHeads && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 18,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Cabezas
                </span>
                <span style={{ color: '#ffffff', fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
                  ~{(remate as { estimatedHeads?: number }).estimatedHeads?.toLocaleString('es-AR')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
