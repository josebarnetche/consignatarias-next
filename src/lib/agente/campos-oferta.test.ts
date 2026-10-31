import { describe, expect, it } from 'vitest'
import { elegirFirmasCampo, planNuevo, sePuedeOfrecer, type FirmaCampo, type LeadCampo } from './campos-agente'
import { ofertaCampo, presentacionCampo, resumenCampo } from './mensajes-tipos'

const ahora = new Date('2026-10-26T15:00:00Z') // lunes 12:00 ART
const lead = (o: Partial<LeadCampo>): LeadCampo => ({
  id: 501, intent: 'vender_campo', name: 'Juan Pérez', email: 'duenio@x.com', province: 'Entre Ríos', zona: 'Villaguay', hectareas: 85, category: 'agrícola', ...o,
})
const firma = (nombre: string, provincia: string, email = `${nombre.toLowerCase()}@f.com`): FirmaCampo => ({ ref: nombre, nombre, email, provincia })

describe('venta de campo: qué sale a consignatarias', () => {
  it('con los datos completos pasa a ofreciendo', () => {
    expect(planNuevo(lead({}), ahora)).toMatchObject({ tipo: 'tomar', estado: 'ofreciendo', correo: null })
  })
  it('arrendamiento y búsqueda de campo no salen', () => {
    expect(sePuedeOfrecer({ tipo: 'arrendamiento', hectareas: 85, aptitud: 'agrícola', provincia: 'Entre Ríos' }, 'vende')).toBe(false)
    expect(sePuedeOfrecer({ tipo: 'campo', hectareas: 85, aptitud: 'agrícola', provincia: 'Entre Ríos' }, 'compra')).toBe(false)
    expect(sePuedeOfrecer({ tipo: 'campo', hectareas: 85, aptitud: null, provincia: 'Entre Ríos' }, 'vende')).toBe(false)
  })
})

describe('elegirFirmasCampo', () => {
  const firmas = [firma('Lejana', 'Salta'), firma('Santafesina', 'Santa Fe'), firma('Concordia', 'ENTRE RIOS'), firma('Urdinarrain', 'Entre Ríos'), firma('Baja', 'Entre Ríos')]
  it('misma provincia primero, después limítrofes, nunca lejos ni con BAJA', () => {
    const r = elegirFirmasCampo({ provincia: 'Entre Ríos', firmas, excluir: new Set(['baja@f.com']), cuantos: 5 })
    expect(r.map((f) => f.nombre)).toEqual(['Concordia', 'Urdinarrain', 'Santafesina'])
  })
  it('respeta el cupo', () => {
    expect(elegirFirmasCampo({ provincia: 'Entre Ríos', firmas, excluir: new Set(), cuantos: 2 })).toHaveLength(2)
    expect(elegirFirmasCampo({ provincia: 'Entre Ríos', firmas, excluir: new Set(), cuantos: 0 })).toHaveLength(0)
  })
  it('no repite un mismo mail', () => {
    const r = elegirFirmasCampo({ provincia: 'Entre Ríos', firmas: [firma('A', 'Entre Ríos', 'x@f.com'), firma('B', 'Entre Ríos', 'X@f.com')], excluir: new Set(), cuantos: 5 })
    expect(r).toHaveLength(1)
  })
})

describe('correos de campo', () => {
  const datos = { tipo: 'campo' as const, hectareas: 85, aptitud: 'Agrícola', zona: 'Villaguay', provincia: 'Entre Ríos', detalle: 'Con molino y aguada' }
  it('la oferta dice que somos un portal, pide ACEPTO y lleva la baja', () => {
    const c = ofertaCampo({ leadId: 501, ofertaId: 7, datos })
    expect(c.asunto).toContain('Ref. C-501-7')
    expect(c.texto).toMatch(/portal: no intermediamos/)
    expect(c.texto).toContain('ACEPTO')
    expect(c.texto).toContain('respondé BAJA')
    expect(c.texto).toContain('molino')
  })
  it('la oferta no lleva nombre ni contacto del dueño, ni un %', () => {
    const c = ofertaCampo({ leadId: 501, ofertaId: 7, datos })
    expect(c.texto).not.toMatch(/Pérez|@x\.com|%/)
  })
  it('la presentación lleva el contacto de los dos', () => {
    const c = presentacionCampo({ leadId: 501, ofertaId: 7, datos, duenio: { nombre: 'Juan Pérez', email: 'z@x.com', phone: '343 555' }, firma: { nombre: 'Ildarraz Hnos', email: 'i@f.com' } })
    expect(c.texto).toContain('z@x.com')
    expect(c.texto).toContain('343 555')
    expect(c.texto).toContain('i@f.com')
  })
  it('resumen', () => {
    expect(resumenCampo(datos)).toBe('85 ha agrícola en Villaguay, Entre Ríos')
  })
})
