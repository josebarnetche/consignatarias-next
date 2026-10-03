import { describe, expect, it } from 'vitest'
import { nombrePropio, provinciaNombre } from './tokens'

describe('nombrePropio', () => {
  it('pasa a nombre propio lo que viene en mayúsculas, con las siglas societarias bien', () => {
    expect(nombrePropio('ILDARRAZ HNOS. S.A.')).toBe('Ildarraz Hnos. S.A.')
    expect(nombrePropio('EDUARDO A. TRAVAGLIA Y CIA. S.A.')).toBe('Eduardo A. Travaglia y Cía. S.A.')
    expect(nombrePropio('UMC SA - HACIENDAS VILLAGUAY SRL')).toBe('UMC SA - Haciendas Villaguay SRL')
    expect(nombrePropio('VILLA MERCEDES')).toBe('Villa Mercedes')
  })

  it('respeta lo que ya viene con minúsculas', () => {
    expect(nombrePropio('Rosgan')).toBe('Rosgan')
    expect(nombrePropio('Colombo y Magliano SA')).toBe('Colombo y Magliano SA')
  })

  it('tolera vacíos', () => {
    expect(nombrePropio('')).toBe('')
    expect(nombrePropio(null)).toBe('')
  })
})

describe('provinciaNombre', () => {
  it('agrega tildes y abrevia Capital Federal', () => {
    expect(provinciaNombre('ENTRE RIOS')).toBe('Entre Ríos')
    expect(provinciaNombre('CORDOBA')).toBe('Córdoba')
    expect(provinciaNombre('SANTIAGO DEL ESTERO')).toBe('Santiago del Estero')
    expect(provinciaNombre('CAPITAL FEDERAL')).toBe('CABA')
    expect(provinciaNombre('')).toBe('')
  })
})
