import { ImageResponse } from 'next/og'
import { getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { LOGO_MAP } from '@/lib/data/logo-map'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

export const runtime = 'edge'
export const alt = 'Perfil de Consignataria'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Fetch logo as base64 for embedding in OG image
async function fetchLogo(slug: string): Promise<string | null> {
  const filename = LOGO_MAP[slug]
  if (!filename) return null
  
  try {
    const url = `https://www.consignatarias.com.ar/logos/${filename}`
    const res = await fetch(url)
    if (!res.ok) return null
    
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = filename.endsWith('.ico') ? 'image/x-icon' : 'image/png'
    return `data:${mimeType};base64,${base64}`
  } catch {
    return null
  }
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = getProfile(slug)
  
  if (!profile) {
    // Fallback image for unknown profiles
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
  
  // Try to fetch the logo
  const logoSrc = await fetchLogo(profile.canonicalSlug)

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #0a0a0a 0%, #0f1f0f 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '50px 70px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Main content - centered vertically */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '50px' }}>
          {/* Logo or initial */}
          {logoSrc ? (
            <div
              style={{
                width: '220px',
                height: '220px',
                background: '#ffffff',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: '20px',
              }}
            >
              <img
                src={logoSrc}
                width={180}
                height={180}
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '220px',
                height: '220px',
                background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '100px',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info - bigger text */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                color: 'white',
                fontSize: 72,
                fontWeight: 'bold',
                marginBottom: '12px',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
              }}
            >
              {profile.displayName.length > 25 
                ? profile.displayName.slice(0, 25) + '...' 
                : profile.displayName}
            </div>
            
            <div style={{ color: '#a1a1aa', fontSize: 36, marginBottom: '40px', fontWeight: 500 }}>
              {provinces.slice(0, 2).join(' · ') || 'Argentina'}
            </div>

            {/* Stats row - bigger and bolder */}
            <div style={{ display: 'flex', gap: '60px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ color: '#22c55e', fontSize: 72, fontWeight: 'bold' }}>
                  {profileAuctions.length}
                </div>
                <div style={{ color: '#71717a', fontSize: 28 }}>
                  remates
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ color: '#22c55e', fontSize: 72, fontWeight: 'bold' }}>
                  {upcomingCount}
                </div>
                <div style={{ color: '#71717a', fontSize: 28 }}>
                  próximos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar - simpler */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '20px',
            borderTop: '2px solid #22c55e33',
          }}
        >
          <div style={{ color: '#22c55e', fontSize: 28, fontWeight: 'bold', letterSpacing: '0.05em' }}>
            CONSIGNATARIAS.COM.AR
          </div>
          <div style={{ color: '#52525b', fontSize: 24 }}>
            Remates Ganaderos Argentina
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
