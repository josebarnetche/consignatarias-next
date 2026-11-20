import { describe, it, expect } from 'vitest'
import { rematesAhora, ahoraArgentina, DURACION_REMATE_MIN } from './remates-ahora'

const R = (slug: string, time: string | null, province = 'BUENOS AIRES', extra: Record<string, string> = {}) => ({
  consignatariaName: slug.toUpperCase(),
  consignatariaSlug: slug,
  date: '2026-11-12',
  time,
  location: 'Saladillo',
  province,
  mainCategory: 'invernada',
  status: 'live',
  ...extra,
})

const CAL = [
  R('temprano', '08:30'),
  R('en-curso', '14:00'),
  R('al-aire', '15:00', 'CORRIENTES'),
  R('tarde', '19:00'),
  R('sin-hora', null),
  R('medianoche', '00:00'),
  R('ayer', '15:00', 'BUENOS AIRES', { date: '2026-11-11' }),
  R('terminado', '15:00', 'BUENOS AIRES', { status: 'completed' }),
]
const PARED = [
  { firma: 'Al Aire SA', slug: 'al-aire', hora: '15:00', lugar: 'CORRIENTES', watchUrl: 'https://youtube.com/watch?v=abc', enVivoAhora: true },
  { firma: 'Todavía no', slug: 'tarde', hora: '19:00', lugar: 'BUENOS AIRES', watchUrl: 'https://youtube.com/watch?v=zzz', enVivoAhora: false },
]
const base = { remates: CAL, pared: PARED, hoy: '2026-11-12', ahoraMin: 16 * 60 }

describe('remates en vivo ahora', () => {
  it('separa lo que está al aire de lo que solo dice el calendario', () => {
    const r = rematesAhora(base)
    expect(r.al_aire.map((x) => x.consignataria)).toEqual(['Al Aire SA'])
    expect(r.al_aire[0].ver).toBe('https://youtube.com/watch?v=abc')
    expect(r.al_aire[0].categoria).toBe('invernada')
    expect(r.en_horario.map((x) => x.consignataria_slug)).toEqual(['en-curso'])
    expect(r.en_horario[0].ver).toBeNull()
    expect(r.mas_tarde.map((x) => x.consignataria_slug)).toEqual(['tarde'])
  })

  it('un remate pasado su duración ya no está en horario', () => {
    const r = rematesAhora({ ...base, pared: [], ahoraMin: 14 * 60 + DURACION_REMATE_MIN })
    expect(r.en_horario.map((x) => x.consignataria_slug)).not.toContain('en-curso')
    expect(r.en_horario.map((x) => x.consignataria_slug)).toContain('al-aire')
  })

  it("sin hora y '00:00' van aparte, no se inventa horario", () => {
    const r = rematesAhora(base)
    expect(r.sin_hora.map((x) => x.consignataria_slug).sort()).toEqual(['medianoche', 'sin-hora'])
    expect(r.sin_hora.every((x) => x.hora === null)).toBe(true)
  })

  it('no cuenta remates de otro día ni completados', () => {
    const todos = Object.values(rematesAhora(base)).flat().map((x) => x.consignataria_slug)
    expect(todos).not.toContain('ayer')
    expect(todos).not.toContain('terminado')
  })

  it('filtra por provincia en las dos fuentes, sin tildes ni mayúsculas', () => {
    const r = rematesAhora({ ...base, provincia: 'corrientes' })
    expect(r.al_aire).toHaveLength(1)
    expect(r.en_horario).toEqual([])
    expect(r.mas_tarde).toEqual([])
    const ba = rematesAhora({ ...base, provincia: 'Buenos Aires' })
    expect(ba.al_aire).toEqual([])
    expect(ba.en_horario.map((x) => x.consignataria_slug)).toEqual(['en-curso'])
  })

  it('cruza la pared con el calendario por slug canónico', () => {
    const r = rematesAhora({
      ...base,
      remates: [R('al-aire-variante', '15:00', 'CORRIENTES')],
      canonico: (s) => s.replace('-variante', ''),
    })
    expect(r.al_aire[0].lugar).toBe('Saladillo, CORRIENTES')
    expect(r.en_horario).toEqual([])
  })
})

describe('hora argentina', () => {
  it('UTC-3 todo el año, y de noche ya es otro día en UTC pero no acá', () => {
    expect(ahoraArgentina(new Date('2026-11-12T22:23:00Z'))).toEqual({ fecha: '2026-11-12', minutos: 19 * 60 + 23, hora: '19:23' })
    expect(ahoraArgentina(new Date('2026-11-13T01:30:00Z')).fecha).toBe('2026-11-12')
  })
})
