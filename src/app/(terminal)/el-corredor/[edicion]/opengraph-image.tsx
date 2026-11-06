import { ImageResponse } from 'next/og'
import { OG_COLORS, loadOgFonts, BrandChrome, Halo } from '@/lib/og/brand'
import { getEdicion, getEdiciones } from '@/lib/el-corredor-archivo'
import { recortar } from '@/lib/el-corredor-ediciones'

// Tarjeta OG de cada edición de El Corredor: la que se ve cuando el link viaja por
// WhatsApp. Lleva el primer hecho del mes (el número del Índice Novillo) para que el
// dato se lea sin abrir el link. Sistema de marca en src/lib/og/brand.tsx.

export const alt = 'El Corredor — cierre mensual del mercado de hacienda argentino'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamicParams = false

export function generateStaticParams() {
  return getEdiciones().map((e) => ({ edicion: e.slug }))
}

const { CARBON, HUESO, MUTED, MUTED2, CIELO, LINEA } = OG_COLORS

export default async function OGImage({ params }: { params: Promise<{ edicion: string }> }) {
  const { edicion } = await params
  const e = getEdicion(edicion)
  const fonts = await loadOgFonts()
  const titulo = e?.titulo ?? 'El Corredor'
  const numero = e?.numero ?? ''
  const hecho = e?.hechos[0] ? recortar(e.hechos[0], 150) : 'Cierre mensual del mercado de hacienda argentino.'

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
        <Halo />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '48px 76px',
            position: 'relative',
          }}
        >
          <BrandChrome descriptor="CIERRE MENSUAL" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <span style={{ color: CIELO, fontSize: 24, fontWeight: 500, letterSpacing: '0.16em', display: 'flex' }}>
              {`EL CORREDOR · EDICIÓN ${numero}`}
            </span>
            <span style={{ color: HUESO, fontSize: 76, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex' }}>
              {titulo}
            </span>
            <div style={{ display: 'flex', borderLeft: `4px solid ${CIELO}`, paddingLeft: '22px', marginTop: '8px' }}>
              <span style={{ color: MUTED, fontSize: 28, fontWeight: 500, lineHeight: 1.35, maxWidth: '1000px', display: 'flex' }}>
                {hecho}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${LINEA}`, paddingTop: '18px' }}>
            <span style={{ color: MUTED2, fontSize: 20, fontWeight: 500, display: 'flex' }}>
              Los cinco hechos del mes, con su fuente
            </span>
            <span style={{ color: MUTED2, fontSize: 20, fontWeight: 500, display: 'flex' }}>
              {`consignatarias.com.ar/el-corredor/${e?.slug ?? ''}`}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
