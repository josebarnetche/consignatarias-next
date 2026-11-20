import { describe, it, expect } from 'vitest'
import data from '@/lib/data/remates-enriq.json'
import { enriquecerRemate, conEnriq, firmaDe, pinDe } from './remates-enriq'
import type { Auction } from '@/lib/db/schema'

const LUGARES = data.lugares as Record<string, { lat: number; lng: number; precision: string }>
const FIRMAS = data.firmas as Record<string, { logo: string | null; web: string | null }>
const HORAS = data.horas as Record<string, { hora: string; fuente: string }>

describe('remates-enriq.json — integridad', () => {
  it('cada pin cae en Argentina continental y dice su precisión', () => {
    for (const [lugar, p] of Object.entries(LUGARES)) {
      expect(p.lat, lugar).toBeGreaterThan(-55.1)
      expect(p.lat, lugar).toBeLessThan(-21.7)
      expect(p.lng, lugar).toBeGreaterThan(-73.6)
      expect(p.lng, lugar).toBeLessThan(-53.5)
      expect(['predio', 'localidad'], lugar).toContain(p.precision)
    }
  })
  it('los logos son https y las horas HH:MM con fuente', () => {
    for (const [s, f] of Object.entries(FIRMAS)) if (f.logo) expect(f.logo, s).toMatch(/^https:\/\//)
    for (const [k, h] of Object.entries(HORAS)) {
      expect(h.hora, k).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
      expect(h.fuente, k).toMatch(/^https?:\/\//)
    }
  })
})

describe('enriquecerRemate', () => {
  const base = { consignatariaSlug: 'nadie', date: '2026-01-01', location: 'Ningún Lugar, Nada', time: null }

  it('sin datos devuelve nulls, nunca inventa', () => {
    expect(enriquecerRemate(base)).toEqual({ pin: null, logo_url: null, web: null, hora: null, hora_fuente: null })
  })

  it('el pin trae el link a Google Maps', () => {
    const [lugar, p] = Object.entries(LUGARES)[0]
    const pin = pinDe(lugar)!
    expect(pin.maps_url).toBe(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)
  })

  it('una variante del slug encuentra el logo de la firma canónica', () => {
    // f-rauch, ferias-rauch y ferias-rauch-s-a son la misma firma (consignataria-slugs.ts).
    const logo = firmaDe('ferias-rauch')?.logo ?? firmaDe('f-rauch')?.logo ?? null
    expect(firmaDe('ferias-rauch-sa')?.logo ?? null).toBe(logo)
  })

  it('completa la hora faltante con la publicada, y nunca pisa una hora existente', () => {
    const [clave, h] = Object.entries(HORAS)[0]
    const [slug, date, ...resto] = clave.split('|')
    const location = resto.join('|')
    expect(enriquecerRemate({ consignatariaSlug: slug, date, location, time: null }).hora).toBe(h.hora)
    expect(enriquecerRemate({ consignatariaSlug: slug, date, location, time: '07:15' }).hora).toBe('07:15')
  })

  it('conEnriq conserva el remate y le suma pin y logo', () => {
    const [lugar] = Object.entries(LUGARES)[0]
    const a = { ...base, location: lugar, id: 1, title: 't' } as unknown as Auction
    const r = conEnriq(a)
    expect(r.id).toBe(1)
    expect(r.pin?.lat).toBe(LUGARES[lugar].lat)
  })
})

describe('logo del perfil como respaldo', () => {
  const base = { consignatariaSlug: 'firma-sin-logo-xyz', date: '2026-01-01', location: 'Nada', time: null }
  it('usa el logo https del perfil cuando el JSON no tiene', () => {
    expect(enriquecerRemate(base, { 'firma-sin-logo-xyz': 'https://x.supabase.co/l.png' }).logo_url).toBe('https://x.supabase.co/l.png')
  })
  it('descarta un logo http del perfil (contenido mixto)', () => {
    expect(enriquecerRemate(base, { 'firma-sin-logo-xyz': 'http://x.com/l.png' }).logo_url).toBeNull()
  })
  it('el logo del JSON manda sobre el del perfil', () => {
    const [slug, f] = Object.entries(FIRMAS).find(([, f]) => f.logo)!
    expect(enriquecerRemate({ ...base, consignatariaSlug: slug }, { [slug]: 'https://otro/l.png' }).logo_url).toBe(f.logo)
  })
  it('un logo bloqueado (blanco) no vuelve por el perfil', () => {
    expect(enriquecerRemate({ ...base, consignatariaSlug: 'colombo-y-magliano' }, { 'colombo-y-magliano': 'https://x/blanco.svg' }).logo_url).toBeNull()
  })
})
