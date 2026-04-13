import { ImageResponse } from 'next/og'
import { getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

export const alt = 'Perfil de Consignataria'
export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

// Cost optimization: static at build time (no ISR)
export const revalidate = false

export default async function TwitterImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = getProfile(slug)
  
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#000000',
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
            padding: '50px 70px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top: Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ color: '#a1a1aa', fontSize: 22, fontWeight: 500 }}>
              consignatarias.com.ar
            </span>
          </div>

          {/* Center: Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name - HUGE */}
            <div
              style={{
                color: '#ffffff',
                fontSize: profile.displayName.length > 20 ? 64 : 80,
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
                  padding: '6px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                <span style={{ color: '#22c55e', fontSize: 20, fontWeight: 500 }}>
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
            <div style={{ display: 'flex', gap: '50px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: '#ffffff', fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
                  {profileAuctions.length}
                </span>
                <span style={{ color: '#71717a', fontSize: 18, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Remates
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: '#22c55e', fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
                  {upcomingCount}
                </span>
                <span style={{ color: '#71717a', fontSize: 18, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Próximos
                </span>
              </div>
            </div>

            {/* Initial mark */}
            <div
              style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)',
                border: '2px solid rgba(34,197,94,0.3)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
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
