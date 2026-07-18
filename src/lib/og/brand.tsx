import { readFile } from 'fs/promises'
import { join } from 'path'

// Sistema de marca v2.0 (marca/) para tarjetas OG dinámicas (next/og · satori).
// Carbón + JetBrains Mono + cielo único acento; pastura/rojo solo semánticos;
// ámbar solo PRO/destacado. Isotipo "la C y el dato" en el chrome.

export const OG_COLORS = {
  CARBON: '#09090b',
  PANEL: '#18181b',
  LINEA: '#27272a',
  HUESO: '#fafafa',
  MUTED: '#a1a1aa',
  MUTED2: '#71717a',
  CIELO: '#38bdf8',
  PASTURA: '#10b981',
  ROJO: '#f87171',
  AMBAR: '#f59e0b',
} as const

// Isotipo — misma geometría que marca/build_logos.py
export const ISO_RING =
  'M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z'

type OgFont = { name: string; data: Buffer; weight: 700 | 500; style: 'normal' }

// Devuelve undefined si los .ttf no se pueden leer en runtime (bundle serverless,
// cold start, etc.) en vez de tirar: así ImageResponse cae a su tipografía por
// defecto y la ruta OG nunca responde 5xx por un font faltante.
export async function loadOgFonts(): Promise<OgFont[] | undefined> {
  try {
    const [bold, medium] = await Promise.all([
      readFile(join(process.cwd(), 'src/fonts/JetBrainsMono-Bold.ttf')),
      readFile(join(process.cwd(), 'src/fonts/JetBrainsMono-Medium.ttf')),
    ])
    return [
      { name: 'JetBrains Mono', data: bold, weight: 700, style: 'normal' },
      { name: 'JetBrains Mono', data: medium, weight: 500, style: 'normal' },
    ]
  } catch {
    return undefined
  }
}

export function IsoMark({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <path d={ISO_RING} fill={OG_COLORS.HUESO} />
      <rect x="379.7" y="168.1" width="118" height="118" fill={OG_COLORS.CIELO} />
    </svg>
  )
}

/** Chrome de marca: isotipo + wordmark + descriptor mono tracked. */
export function BrandChrome({ descriptor = 'MERCADO GANADERO ARGENTINO' }: { descriptor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
      <IsoMark />
      <span style={{ color: OG_COLORS.HUESO, fontSize: 26, fontWeight: 700, display: 'flex' }}>
        consignatarias<span style={{ color: OG_COLORS.CIELO }}>.</span>com
      </span>
      <span
        style={{
          color: OG_COLORS.MUTED2,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '0.2em',
          marginLeft: '12px',
        }}
      >
        {descriptor}
      </span>
    </div>
  )
}

/** Halo cielo — el único gradiente permitido. */
export function Halo() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-260px',
        left: '300px',
        width: '640px',
        height: '520px',
        background: 'radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)',
        borderRadius: '9999px',
        display: 'flex',
      }}
    />
  )
}
