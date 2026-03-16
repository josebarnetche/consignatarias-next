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
  
  // Type distribution
  const typeCounts: Record<string, number> = {}
  profileAuctions.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1 })
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  
  const typeLabels: Record<string, string> = {
    invernada: 'Invernada',
    cria: 'Cría',
    reproductores: 'Reproductores',
    general: 'General',
    especial: 'Especial',
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div style={{ color: '#22c55e', fontSize: 24, fontWeight: 'bold', letterSpacing: '0.1em' }}>
            CONSIGNATARIAS.COM.AR
          </div>
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '8px 16px',
              borderRadius: '4px',
              color: '#22c55e',
              fontSize: 16,
            }}
          >
            PERFIL VERIFICADO
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '60px' }}>
          {/* Logo placeholder */}
          <div
            style={{
              width: '180px',
              height: '180px',
              background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '72px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {profile.displayName.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                color: 'white',
                fontSize: 56,
                fontWeight: 'bold',
                marginBottom: '16px',
                lineHeight: 1.1,
              }}
            >
              {profile.displayName}
            </div>
            
            <div style={{ color: '#71717a', fontSize: 28, marginBottom: '32px' }}>
              {provinces.slice(0, 3).join(' · ') || 'Argentina'}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#22c55e', fontSize: 48, fontWeight: 'bold' }}>
                  {profileAuctions.length}
                </div>
                <div style={{ color: '#71717a', fontSize: 20 }}>
                  remates totales
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#06b6d4', fontSize: 48, fontWeight: 'bold' }}>
                  {upcomingCount}
                </div>
                <div style={{ color: '#71717a', fontSize: 20 }}>
                  próximos
                </div>
              </div>

              {topType && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#a78bfa', fontSize: 48, fontWeight: 'bold' }}>
                    {typeLabels[topType] || topType}
                  </div>
                  <div style={{ color: '#71717a', fontSize: 20 }}>
                    especialidad
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '1px solid #27272a',
          }}
        >
          <div style={{ color: '#52525b', fontSize: 18 }}>
            Calendario de remates ganaderos de Argentina
          </div>
          <div style={{ color: '#52525b', fontSize: 18 }}>
            consignatarias.com.ar/consignatarias/{slug}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
