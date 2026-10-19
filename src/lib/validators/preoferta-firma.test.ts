import { describe, expect, it } from 'vitest'
import {
  esVideoPermitido,
  finDelDiaRemate,
  loteCrearSchema,
  ofertaFirmaSchema,
  preofertaActualizarSchema,
  preofertaAbierta,
  preofertaCrearSchema,
  videoDelLote,
} from './preoferta-firma'

const UUID_A = '3f8a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b'
const UUID_B = '7c6b5a49-3827-4615-a4b3-c2d1e0f9a8b7'

describe('video del lote', () => {
  it('acepta solo https de YouTube, Vimeo y Drive', () => {
    expect(esVideoPermitido('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(esVideoPermitido('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(esVideoPermitido('https://vimeo.com/123456789')).toBe(true)
    expect(esVideoPermitido('https://drive.google.com/file/d/abc/view')).toBe(true)
    expect(esVideoPermitido('http://youtu.be/dQw4w9WgXcQ')).toBe(false)
    expect(esVideoPermitido('https://evil.com/youtube.com')).toBe(false)
    expect(esVideoPermitido('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBe(false)
    expect(esVideoPermitido('javascript:alert(1)')).toBe(false)
    expect(esVideoPermitido('no es una url')).toBe(false)
  })

  it('YouTube y Vimeo se incrustan; Drive va como enlace', () => {
    expect(videoDelLote('https://youtu.be/dQw4w9WgXcQ')).toMatchObject({
      tipo: 'youtube',
      embed: expect.stringContaining('youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    })
    expect(videoDelLote('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ tipo: 'youtube' })
    expect(videoDelLote('https://vimeo.com/123456789')).toMatchObject({
      tipo: 'vimeo',
      embed: 'https://player.vimeo.com/video/123456789',
    })
    expect(videoDelLote('https://drive.google.com/file/d/abc/view')).toMatchObject({ tipo: 'drive' })
  })

  it('sin id reconocible cae a enlace, y lo no permitido no se muestra', () => {
    expect(videoDelLote('https://www.youtube.com/@canal')).toMatchObject({ tipo: 'drive' })
    expect(videoDelLote('https://otro.com/video.mp4')).toBeNull()
    expect(videoDelLote(null)).toBeNull()
  })
})

describe('pre-oferta', () => {
  const base = { titulo: 'Remate de invernada', fecha_remate: '2026-11-05', cierre: '2026-11-04T18:00:00-03:00' }

  it('acepta un remate válido y normaliza los vacíos a null', () => {
    const r = preofertaCrearSchema.safeParse({ ...base, lugar: '', condiciones: '  ' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.lugar).toBeNull()
      expect(r.data.condiciones).toBeNull()
    }
  })

  it('el cierre no puede ser después del día del remate', () => {
    expect(preofertaCrearSchema.safeParse({ ...base, cierre: '2026-11-05T23:00:00-03:00' }).success).toBe(true)
    const r = preofertaCrearSchema.safeParse({ ...base, cierre: '2026-11-06T09:00:00-03:00' })
    expect(r.success).toBe(false)
  })

  it('fin del día del remate es en hora argentina', () => {
    expect(new Date(finDelDiaRemate('2026-11-05')).toISOString()).toBe('2026-11-06T02:59:59.000Z')
  })

  it('la edición acepta solo el estado y rechaza un estado inventado o el body vacío', () => {
    expect(preofertaActualizarSchema.safeParse({ estado: 'cerrada' }).success).toBe(true)
    expect(preofertaActualizarSchema.safeParse({ estado: 'vendida' }).success).toBe(false)
    expect(preofertaActualizarSchema.safeParse({}).success).toBe(false)
  })

  it('abierta = publicada y antes del cierre', () => {
    const ahora = Date.parse('2026-11-01T12:00:00Z')
    expect(preofertaAbierta({ estado: 'publicada', cierre: '2026-11-04T21:00:00Z' }, ahora)).toBe(true)
    expect(preofertaAbierta({ estado: 'borrador', cierre: '2026-11-04T21:00:00Z' }, ahora)).toBe(false)
    expect(preofertaAbierta({ estado: 'cerrada', cierre: '2026-11-04T21:00:00Z' }, ahora)).toBe(false)
    expect(preofertaAbierta({ estado: 'publicada', cierre: '2026-10-30T21:00:00Z' }, ahora)).toBe(false)
  })
})

describe('lote', () => {
  it('convierte los números que llegan como texto, con punto de miles', () => {
    const r = loteCrearSchema.safeParse({ titulo: 'Lote 1', cabezas: '40', peso_kg: '180', precio_base: '1.500.000', video_url: '' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toMatchObject({ cabezas: 40, peso_kg: 180, precio_base: 1_500_000, video_url: null })
    }
  })

  it('un decimal no se toma como punto de miles', () => {
    expect(loteCrearSchema.safeParse({ titulo: 'Lote 1', peso_kg: '180.5' }).success).toBe(false)
  })

  it('rechaza un video de otro host', () => {
    const r = loteCrearSchema.safeParse({ titulo: 'Lote 1', video_url: 'https://tiktok.com/@x/video/1' })
    expect(r.success).toBe(false)
  })
})

describe('oferta', () => {
  const base = { preoferta_id: UUID_A, lote_id: UUID_B, nombre: 'Juan Pérez' }

  it('pide teléfono o email, al menos uno', () => {
    expect(ofertaFirmaSchema.safeParse(base).success).toBe(false)
    expect(ofertaFirmaSchema.safeParse({ ...base, telefono: '3794 123456' }).success).toBe(true)
    expect(ofertaFirmaSchema.safeParse({ ...base, email: 'juan@campo.com' }).success).toBe(true)
    expect(ofertaFirmaSchema.safeParse({ ...base, telefono: '123' }).success).toBe(false)
  })

  it('el monto es opcional y entero positivo', () => {
    const ok = ofertaFirmaSchema.safeParse({ ...base, email: 'juan@campo.com', monto: '' })
    expect(ok.success && ok.data.monto).toBeNull()
    expect(ofertaFirmaSchema.safeParse({ ...base, email: 'juan@campo.com', monto: '2.300.000' }).success).toBe(true)
    expect(ofertaFirmaSchema.safeParse({ ...base, email: 'juan@campo.com', monto: '-5' }).success).toBe(false)
  })

  it('rechaza ids que no son uuid', () => {
    expect(ofertaFirmaSchema.safeParse({ ...base, lote_id: '1', email: 'juan@campo.com' }).success).toBe(false)
  })
})
