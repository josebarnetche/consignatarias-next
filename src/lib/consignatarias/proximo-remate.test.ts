import { describe, expect, it } from 'vitest'
import { proximoRemateMeta } from './proximo-remate'

describe('proximoRemateMeta', () => {
  const hoy = '2026-10-21'

  it('toma el remate programado más cercano de hoy en adelante', () => {
    const r = proximoRemateMeta(
      [
        { date: '2026-10-30', status: 'scheduled', location: 'San Antonio de Areco, Buenos Aires', type: 'general' },
        { date: '2026-10-28', status: 'scheduled', location: 'Olavarría, Buenos Aires', type: 'invernada' },
        { date: '2026-10-10', status: 'completed', location: 'Azul, Buenos Aires', type: 'invernada' },
      ],
      hoy,
    )
    expect(r).toEqual({ fecha: '28 de octubre', lugar: 'Olavarría', tipo: 'invernada' })
  })

  it('limpia el punto final de la localidad y no muestra tipos sin información', () => {
    const r = proximoRemateMeta([{ date: '2026-10-22', status: 'scheduled', location: 'Bahia Blanca., Buenos Aires', type: 'general' }], hoy)
    expect(r).toEqual({ fecha: '22 de octubre', lugar: 'Bahia Blanca', tipo: '' })
  })

  it('pone la tilde de cría', () => {
    expect(proximoRemateMeta([{ date: hoy, status: 'scheduled', location: 'Goya, Corrientes', type: 'cria' }], hoy)?.tipo).toBe('cría')
  })

  it('sin remate futuro devuelve null (no se inventa una fecha)', () => {
    expect(proximoRemateMeta([{ date: '2026-10-01', status: 'scheduled', location: 'Azul', type: 'cria' }], hoy)).toBeNull()
    expect(proximoRemateMeta([], hoy)).toBeNull()
  })
})
