import { ImageResponse } from 'next/og'
import rematesData from '@/lib/data/remates.json'
import { OG_COLORS as C, loadOgFonts, BrandChrome, Halo, IsoMark } from '@/lib/og/brand'

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

async function fallback(message = 'Remate Ganadero') {
  const fonts = await loadOgFonts()
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: C.CARBON,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          fontFamily: 'JetBrains Mono',
        }}
      >
        <IsoMark size={88} />
        <div style={{ color: C.HUESO, fontSize: 48, fontWeight: 700, display: 'flex' }}>
          consignatarias<span style={{ color: C.CIELO }}>.</span>com<span style={{ color: C.CIELO }}>.</span>ar
        </div>
        <div style={{ color: C.MUTED, fontSize: 26, fontWeight: 500 }}>{message}</div>
      </div>
    ),
    { ...size, fonts },
  )
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const remate = (rematesData as typeof rematesData).find((r) => generateRemateSlug(r) === slug)

  if (!remate) return fallback()

  const fonts = await loadOgFonts()
  const date = new Date((remate.date as string) + 'T12:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_ES[date.getMonth()] ?? ''
  const year = date.getFullYear()
  const typeLabel = TYPE_LABELS[remate.type as string] || (remate.type as string).toUpperCase()
  const consigName = (remate as { consignatariaName?: string }).consignatariaName || (remate.consignatariaSlug as string)
  const location = (remate.location as string) || ((remate.province as string) ?? 'Argentina')
  const heads = (remate as { estimatedHeads?: number }).estimatedHeads
  const time = (remate as { time?: string }).time

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: C.CARBON,
          color: C.HUESO,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'JetBrains Mono',
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
          {/* chrome + tipo de remate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <BrandChrome descriptor="EL CALENDARIO" />
            <div
              style={{
                display: 'flex',
                background: 'rgba(56,189,248,0.10)',
                border: '1px solid rgba(56,189,248,0.4)',
                borderRadius: '2px',
                padding: '8px 16px',
                color: C.CIELO,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              REMATE · {typeLabel}
            </div>
          </div>

          {/* consignataria + plaza */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                color: C.HUESO,
                fontSize: consigName.length > 24 ? 60 : 78,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.025em',
                maxWidth: '100%',
              }}
            >
              {consigName}
            </div>
            <div style={{ color: C.MUTED, fontSize: 28, fontWeight: 500, display: 'flex' }}>
              {location}
            </div>
          </div>

          {/* fecha hero + horario + cabezas */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '26px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '156px',
                  height: '156px',
                  border: `1px solid ${C.LINEA}`,
                  borderRadius: '2px',
                  background: C.PANEL,
                }}
              >
                <span style={{ color: C.CIELO, fontSize: 23, fontWeight: 700, letterSpacing: '0.14em' }}>
                  {month}
                </span>
                <span style={{ color: C.HUESO, fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
                  {day}
                </span>
                <span style={{ color: C.MUTED2, fontSize: 17, fontWeight: 500 }}>{year}</span>
              </div>
              {time && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '14px' }}>
                  <span style={{ color: C.MUTED2, fontSize: 16, fontWeight: 500, letterSpacing: '0.08em' }}>
                    HORARIO
                  </span>
                  <span style={{ color: C.HUESO, fontSize: 30, fontWeight: 700 }}>
                    {String(time)} hs
                  </span>
                </div>
              )}
            </div>

            {heads ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span style={{ color: C.MUTED2, fontSize: 17, fontWeight: 500, letterSpacing: '0.08em' }}>
                  CABEZAS
                </span>
                <span style={{ color: C.HUESO, fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
                  ~{heads.toLocaleString('es-AR')}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
