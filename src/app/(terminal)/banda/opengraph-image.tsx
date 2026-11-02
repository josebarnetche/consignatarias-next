import { ImageResponse } from 'next/og'
import { OG_COLORS, loadOgFonts, BrandChrome, Halo } from '@/lib/og/brand'
import { cargarBanda } from '@/lib/mercado/banda-datos'
import { escalaRangos, fechaCorta, posicionPct } from '@/lib/mercado/banda-pagina'
import { etiquetaCategoria } from '@/lib/vr'

// Tarjeta OG de /banda: la pieza que viaja por WhatsApp. Lleva las barras P10–P90
// con la mediana marcada —el dibujo es lo que se entiende sin abrir el link— y
// el número del novillo arriba. Sale de los mismos datos que la página
// (cargarBanda), así que la tarjeta nunca dice otra cosa que la cita.
//
// Sistema de marca compartido en src/lib/og/brand.tsx.

export const revalidate = 3600
export const alt = 'Banda Consignatarias — cuánto se abre el precio de la hacienda, por categoría'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const { CARBON, LINEA, HUESO, MUTED, MUTED2, CIELO } = OG_COLORS

export default async function OGImage() {
  const fonts = await loadOgFonts()
  const { banda } = await cargarBanda()
  // Seis categorías entran cómodas en 630 px; si un día hubiera más, van las más abiertas.
  const cats = banda.categorias.slice(0, 6)
  const escala = escalaRangos(cats)
  const t = banda.titular
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })

  const ANCHO_BARRA = 640

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
          <BrandChrome />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ color: HUESO, fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>Banda Consignatarias</span>
            {t ? (
              <span style={{ color: CIELO, fontSize: 44, fontWeight: 700 }}>
                {`${etiquetaCategoria(t.categoria).toLowerCase()} ${fmt(t.amplitudPct)}%`}
              </span>
            ) : null}
          </div>

          {/* las barras */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cats.map((c) => {
              const a = posicionPct(c.p10, escala)
              const z = posicionPct(c.p90, escala)
              const m = posicionPct(c.mediana, escala)
              const titular = c.categoria === t?.categoria
              return (
                <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <span style={{ width: '220px', color: titular ? HUESO : MUTED, fontSize: 24, fontWeight: 500, display: 'flex' }}>
                    {etiquetaCategoria(c.categoria).replace(' (macho entero joven)', '')}
                  </span>
                  <div style={{ display: 'flex', position: 'relative', width: `${ANCHO_BARRA}px`, height: '30px' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '14px', height: '2px', background: LINEA, display: 'flex' }} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '3px',
                        height: '24px',
                        left: `${(a / 100) * ANCHO_BARRA}px`,
                        width: `${Math.max(((z - a) / 100) * ANCHO_BARRA, 4)}px`,
                        background: titular ? 'rgba(56,189,248,0.45)' : 'rgba(56,189,248,0.2)',
                        border: `2px solid ${CIELO}`,
                        borderRadius: '2px',
                        display: 'flex',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        height: '30px',
                        width: '4px',
                        left: `${(m / 100) * ANCHO_BARRA - 2}px`,
                        background: HUESO,
                        display: 'flex',
                      }}
                    />
                  </div>
                  <span style={{ width: '120px', color: titular ? HUESO : MUTED, fontSize: 24, fontWeight: 700, display: 'flex', justifyContent: 'flex-end' }}>
                    {`${fmt(c.amplitudPct)}%`}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED2, fontSize: 20, fontWeight: 500, maxWidth: '760px' }}>
              P10 · mediana · P90 en $/kg vivo — lotes del Mercado Agroganadero, ventana de 30 días
            </span>
            <span style={{ color: CIELO, fontSize: 22, fontWeight: 500 }}>{fechaCorta(banda.fecha)}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  )
}
