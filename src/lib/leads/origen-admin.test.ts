import { describe, expect, it } from 'vitest'
import { origenLead } from './origen-admin'

describe('origenLead', () => {
  it('pone nombre y provincia de la planta en vez del CUIT', () => {
    expect(origenLead('frigorifico:30718669592')).toEqual({ grupo: 'Frigorífico', etiqueta: expect.stringMatching(/Ovechas.*\(Chaco\)$/), href: '/frigorificos/30718669592' })
    expect(origenLead('frigorifico:30718669592:otra-consulta').etiqueta).toMatch(/Ovechas.*· otra consulta$/)
  })
  it('CUIT fuera del padrón: lo dice', () => {
    expect(origenLead('frigorifico:30000000000').etiqueta).toBe('Frigorífico CUIT 30000000000')
  })
  it('campos y arrendamiento en palabras', () => {
    expect(origenLead('campos:tengo:zona-rio-cuarto')).toMatchObject({ grupo: 'Campos', etiqueta: expect.stringMatching(/^Tiene campo · Rio Cuarto$/i) })
    expect(origenLead('campos:tengo:tasador').etiqueta).toBe('Tiene campo · tasador')
    expect(origenLead('arrendamiento').grupo).toBe('Arrendamiento')
    expect(origenLead('spread')).toMatchObject({ grupo: 'Herramientas', etiqueta: 'spread' })
  })
  it('el formulario corto dice de qué plantilla vino', () => {
    expect(origenLead('consignataria:rosgan')).toMatchObject({ grupo: 'Ficha de consignataria', href: '/consignatarias/rosgan' })
    expect(origenLead('precios:terneros')).toMatchObject({ grupo: 'Precios', href: '/precios/terneros' })
    expect(origenLead('frigorificos-provincia:entre-rios')).toMatchObject({ grupo: 'Frigoríficos por provincia', href: '/frigorificos/entre-rios' })
    expect(origenLead('remate:abc')).toMatchObject({ grupo: 'Ficha de remate', href: '/remates/abc' })
  })
})
