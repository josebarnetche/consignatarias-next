import { describe, expect, it } from 'vitest'
import { esRutaDeDueno } from './rutas-dueno'

describe('esRutaDeDueno', () => {
  it('reconoce las rutas del panel de la firma', () => {
    expect(esRutaDeDueno('/api/consignatarias/reggi/report')).toBe(true)
    expect(esRutaDeDueno('/api/consignatarias/reggi/preofertas/abc/lotes')).toBe(true)
    expect(esRutaDeDueno('/api/consignatarias/reggi/auctions/8')).toBe(true)
  })
  it('deja afuera la lectura pública', () => {
    expect(esRutaDeDueno('/api/consignatarias/list')).toBe(false)
    expect(esRutaDeDueno('/api/consignatarias/reggi')).toBe(false)
    expect(esRutaDeDueno('/api/consignatarias/reggi/reporte-falso')).toBe(false)
  })
})
