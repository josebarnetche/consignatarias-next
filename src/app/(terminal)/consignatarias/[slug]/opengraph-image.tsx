import { ImageResponse } from 'next/og'
import { getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getFeaturedSlugs } from '@/lib/featured'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { mergedSlugStaticParams } from '../_views/sluglist'
import { OG_COLORS as C, loadOgFonts, BrandChrome, Halo, IsoMark } from '@/lib/og/brand'

const auctions = rematesData as Auction[]

export const alt = 'Perfil de Consignataria'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Allow dynamic rendering for province slugs (they generate a default OG)
export const revalidate = false
export const dynamicParams = true

export function generateStaticParams() {
  return mergedSlugStaticParams()
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = getProfile(slug)
  const fonts = await loadOgFonts()

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '28px',
            fontFamily: 'JetBrains Mono',
            background: C.CARBON,
          }}
        >
          <IsoMark size={96} />
          <div style={{ color: C.HUESO, fontSize: 56, fontWeight: 700, display: 'flex' }}>
            consignatarias<span style={{ color: C.CIELO }}>.</span>com<span style={{ color: C.CIELO }}>.</span>ar
          </div>
        </div>
      ),
      { ...size, fonts }
    )
  }

  const profileAuctions = getAuctionsForProfile(auctions, slug)
  const provinces = [...new Set(profileAuctions.map(a => a.province).filter(Boolean))]
  const upcomingCount = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length

  const featured = await getFeaturedSlugs()
  const isPro = featured.has(profile.canonicalSlug)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'JetBrains Mono',
          background: C.CARBON,
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
          {/* chrome de marca + badge PRO (ámbar = destacado, regla del manual) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <BrandChrome descriptor="EL DIRECTORIO" />
            {isPro && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(245,158,11,0.10)',
                  border: `1px solid rgba(245,158,11,0.45)`,
                  borderRadius: '2px',
                  padding: '8px 18px',
                }}
              >
                <span style={{ color: C.AMBAR, fontSize: 20, display: 'flex' }}>★</span>
                <span style={{ color: C.AMBAR, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em' }}>
                  PRO
                </span>
              </div>
            )}
          </div>

          {/* nombre + plaza */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                color: C.HUESO,
                fontSize: profile.displayName.length > 22 ? 62 : 82,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                maxWidth: '100%',
              }}
            >
              {profile.displayName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: C.PANEL,
                  border: `1px solid ${C.LINEA}`,
                  borderRadius: '2px',
                  padding: '9px 18px',
                }}
              >
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    background: C.CIELO,
                    borderRadius: '50%',
                    boxShadow: '0 0 0 4px rgba(56,189,248,0.18)',
                    display: 'flex',
                  }}
                />
                <span style={{ color: C.MUTED, fontSize: 21, fontWeight: 500 }}>
                  {provinces.slice(0, 2).join(' · ') || 'Argentina'}
                </span>
              </div>
            </div>
          </div>

          {/* stats: remates totales + próximos (pastura = disponibilidad) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '56px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: C.HUESO, fontSize: 58, fontWeight: 700, lineHeight: 1 }}>
                  {profileAuctions.length}
                </span>
                <span style={{ color: C.MUTED2, fontSize: 18, fontWeight: 500, letterSpacing: '0.08em' }}>
                  REMATES INDEXADOS
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: upcomingCount > 0 ? C.PASTURA : C.MUTED2, fontSize: 58, fontWeight: 700, lineHeight: 1 }}>
                  {upcomingCount}
                </span>
                <span style={{ color: C.MUTED2, fontSize: 18, fontWeight: 500, letterSpacing: '0.08em' }}>
                  PRÓXIMOS
                </span>
              </div>
            </div>
            <span style={{ color: C.MUTED2, fontSize: 19, fontWeight: 500 }}>
              perfil verificable en consignatarias.com.ar
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
