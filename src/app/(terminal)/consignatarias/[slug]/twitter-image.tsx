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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: '48px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo placeholder */}
        <div
          style={{
            width: '140px',
            height: '140px',
            background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
            color: 'white',
            fontWeight: 'bold',
            marginRight: '40px',
          }}
        >
          {profile.displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ color: '#22c55e', fontSize: 18, fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '8px' }}>
            CONSIGNATARIAS.COM.AR
          </div>
          
          <div style={{ color: 'white', fontSize: 42, fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.1 }}>
            {profile.displayName}
          </div>
          
          <div style={{ color: '#71717a', fontSize: 22, marginBottom: '24px' }}>
            {provinces.slice(0, 3).join(' · ') || 'Argentina'}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: '#22c55e', fontSize: 36, fontWeight: 'bold' }}>{profileAuctions.length}</span>
              <span style={{ color: '#71717a', fontSize: 18 }}>remates</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: '#06b6d4', fontSize: 36, fontWeight: 'bold' }}>{upcomingCount}</span>
              <span style={{ color: '#71717a', fontSize: 18 }}>próximos</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
