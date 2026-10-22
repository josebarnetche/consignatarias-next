import { describe, it, expect } from 'vitest'
import { regionDe, provinciaCanonica } from './geo-ar'

describe('provincias como las escribe la gente', () => {
  it('"Bs As", "CABA" y "Provincia de Buenos Aires" son Buenos Aires', () => {
    for (const p of ['Bs As', 'bs. as.', 'CABA', 'Provincia de Buenos Aires', 'Capital Federal']) {
      expect(provinciaCanonica(p)).toBe('BUENOS AIRES')
      expect(regionDe(p)).toBe('pampeana')
    }
    expect(provinciaCanonica('Provincia de Corrientes')).toBe('CORRIENTES')
  })
})
