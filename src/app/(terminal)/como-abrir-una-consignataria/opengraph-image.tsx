import { ImageResponse } from 'next/og'
import { OG_COLORS as C, loadOgFonts, BrandChrome, Halo } from '@/lib/og/brand'
import { getGuiaPremium, formatArs } from '@/lib/guias-premium'

export const alt = 'Cómo abrir una consignataria de hacienda en Argentina — Guía 2026'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = false

/**
 * Tarjeta OG del sales page de la guía.
 *
 * La página venía usando la OG genérica del sitio, que dice "mercado ganadero" y no
 * vende nada: compartida en un grupo de WhatsApp —que es como circula todo en este
 * rubro— la miniatura no decía qué era. Esta muestra las tres cosas que deciden el
 * clic: qué es, cuán actualizada está y cuánto cuesta.
 */
export default async function OGImage() {
  const guia = getGuiaPremium('abrir-una-consignataria')
  const fonts = await loadOgFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          fontFamily: 'JetBrains Mono',
          background: C.CARBON,
          position: 'relative',
        }}
      >
        <Halo />
        <BrandChrome descriptor="GUÍA OPERATIVA · ARGENTINA" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              border: `1px solid ${C.CIELO}`,
              color: C.CIELO,
              fontSize: 20,
              letterSpacing: '0.12em',
              padding: '7px 14px',
            }}
          >
            EDICIÓN {guia?.edicion ?? '2026'} · ACTUALIZADA
          </div>

          <div
            style={{
              color: C.HUESO,
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              display: 'flex',
              maxWidth: 940,
            }}
          >
            Cómo abrir tu consignataria de hacienda
          </div>

          <div style={{ color: '#a1a1aa', fontSize: 26, lineHeight: 1.4, display: 'flex', maxWidth: 900 }}>
            Matrícula, SIOCAL, ARCA, SENASA, el riesgo de cobranza y los números del negocio.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #3f3f46',
            paddingTop: '22px',
            position: 'relative',
          }}
        >
          <div style={{ color: '#71717a', fontSize: 22, display: 'flex', gap: '18px' }}>
            <span>{guia?.pages ?? 0} páginas</span>
            <span style={{ color: '#3f3f46' }}>·</span>
            <span>PDF</span>
            <span style={{ color: '#3f3f46' }}>·</span>
            <span>pago único</span>
          </div>
          <div style={{ color: C.CIELO, fontSize: 34, fontWeight: 700, display: 'flex' }}>
            {formatArs(guia?.priceArs ?? 0)}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
