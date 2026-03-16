import { ImageResponse } from 'next/og'
import { getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

export const runtime = 'edge'
export const alt = 'Perfil de Consignataria'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = getProfile(slug)
  
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ color: '#22c55e', fontSize: 64, fontWeight: 'bold' }}>
            consignatarias.com.ar
          </div>
        </div>
      ),
      { ...size }
    )
  }

  const profileAuctions = getAuctionsForProfile(auctions, slug)
  const provinces = [...new Set(profileAuctions.map(a => a.province).filter(Boolean))]
  const upcomingCount = profileAuctions.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length

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
        
        {/* Content container with safe zones */}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
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
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ color: '#a1a1aa', fontSize: 24, fontWeight: 500 }}>
              consignatarias.com.ar
            </span>
          </div>

          {/* Center: Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Name - HUGE */}
            <div
              style={{
                color: '#ffffff',
                fontSize: profile.displayName.length > 20 ? 72 : 88,
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                maxWidth: '100%',
              }}
            >
              {profile.displayName}
            </div>
            
            {/* Location badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '9999px',
                  padding: '8px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                <span style={{ color: '#22c55e', fontSize: 22, fontWeight: 500 }}>
                  {provinces.slice(0, 2).join(' · ') || 'Argentina'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            {/* Stats */}
            <div style={{ display: 'flex', gap: '60px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#ffffff', fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
                  {profileAuctions.length}
                </span>
                <span style={{ color: '#71717a', fontSize: 22, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Remates
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#22c55e', fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
                  {upcomingCount}
                </span>
                <span style={{ color: '#71717a', fontSize: 22, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Próximos
                </span>
              </div>
            </div>

            {/* Initial mark */}
            <div
              style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)',
                border: '2px solid rgba(34,197,94,0.3)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '56px',
                color: '#22c55e',
                fontWeight: 700,
              }}
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
