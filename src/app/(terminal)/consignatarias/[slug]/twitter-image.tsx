import { ImageResponse } from 'next/og'
import { getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

export const runtime = 'edge'
export const alt = 'Perfil de Consignataria'
export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

export default async function TwitterImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = getProfile(slug)
  
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ color: '#22c55e', fontSize: 48, fontWeight: 'bold' }}>
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
          background: 'linear-gradient(145deg, #0a0a0a 0%, #0f1f0f 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '50px 60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo placeholder - bigger */}
        <div
          style={{
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '90px',
            color: 'white',
            fontWeight: 'bold',
            marginRight: '50px',
            flexShrink: 0,
          }}
        >
          {profile.displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info - much bigger */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.0, letterSpacing: '-0.02em' }}>
            {profile.displayName.length > 22 
              ? profile.displayName.slice(0, 22) + '...' 
              : profile.displayName}
          </div>
          
          <div style={{ color: '#a1a1aa', fontSize: 32, marginBottom: '36px', fontWeight: 500 }}>
            {provinces.slice(0, 2).join(' · ') || 'Argentina'}
          </div>

          {/* Stats row - bigger */}
          <div style={{ display: 'flex', gap: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ color: '#22c55e', fontSize: 64, fontWeight: 'bold' }}>{profileAuctions.length}</span>
              <span style={{ color: '#71717a', fontSize: 26 }}>remates</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ color: '#22c55e', fontSize: 64, fontWeight: 'bold' }}>{upcomingCount}</span>
              <span style={{ color: '#71717a', fontSize: 26 }}>próximos</span>
            </div>
          </div>
        </div>

        {/* Brand mark - bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '50px',
            color: '#22c55e',
            fontSize: 24,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}
        >
          CONSIGNATARIAS.COM.AR
        </div>
      </div>
    ),
    { ...size }
  )
}
