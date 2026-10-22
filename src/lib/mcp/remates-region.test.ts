import { describe, it, expect } from 'vitest'
import { rematesDeLaRegion, sugerenciaPedido } from './remates-region'

const R = (date: string, province: string, status = 'scheduled') => ({ date, province, status })
const CAL = [R('2026-10-22', 'Corrientes'), R('2026-10-25', 'Chaco'), R('2026-10-23', 'Buenos Aires'), R('2026-10-01', 'Corrientes'), R('2026-10-30', 'Formosa', 'cancelled')]

describe('remates de la región cuando la provincia no tiene', () => {
  it('Misiones sin remates devuelve los del NEA, ordenados y vigentes', () => {
    const r = rematesDeLaRegion('misiones', CAL, '2026-10-21', 10)
    expect(r.region).toBe('nea')
    expect(r.nombreRegion).toBe('el NEA')
    expect(r.remates.map((x) => x.province)).toEqual(['Corrientes', 'Chaco'])
  })

  it('respeta el límite', () => {
    expect(rematesDeLaRegion('Misiones', CAL, '2026-10-21', 1).remates).toHaveLength(1)
  })

  it('una provincia desconocida no inventa región', () => {
    expect(rematesDeLaRegion('Narnia', CAL, '2026-10-21', 10).region).toBeNull()
  })

  it('la sugerencia nombra la tool real', () => {
    expect(sugerenciaPedido('Misiones')).toMatch(/cattle_buying_request/)
  })
})

describe('provincia en blanco', () => {
  it('no se resuelve a la región del primer remate', () => {
    expect(rematesDeLaRegion('   ', CAL, '2026-10-21', 10).region).toBeNull()
  })
})
