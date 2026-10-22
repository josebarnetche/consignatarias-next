import { describe, expect, it } from 'vitest'
import { ofertaServicioContacto, LO_QUE_NO_HACEMOS } from './mensajes-contacto'
import { oferta } from './mensajes'
import { comprometePrecio, filtraContacto } from './reglas'

const base = { leadId: 12, ofertaId: 34, lado: 'vende' as const, datos: { cabezas: 120, categoria: 'novillos', zona: 'Azul', provincia: 'Buenos Aires', precio_pedido_kg: 3100 }, contraparte: 'Frigorífico X' }

describe('ofertaServicioContacto (borrador)', () => {
  const c = ofertaServicioContacto(base)

  it('mismo asunto y referencia que la oferta actual: el hilo se reconoce igual', () => {
    expect(c.asunto).toBe(oferta(base).asunto)
    expect(c.asunto).toContain('C-12-34')
  })
  it('cobra el servicio de contacto, no una comisión de intermediación', () => {
    expect(c.texto).toContain('servicio de contacto')
    expect(c.texto).not.toMatch(/comisi[oó]n/i)
    expect(c.texto).toContain('1% del bruto')
  })
  it('aclara lo que no hacemos y pide verificar SIOCAL y RENSPA', () => {
    expect(c.texto).toContain(LO_QUE_NO_HACEMOS)
    expect(c.texto).toMatch(/SIOCAL/)
    expect(c.texto).toMatch(/RENSPA/)
  })
  it('lleva pie comercial con baja (Ley 25.326)', () => {
    expect(c.texto).toContain('comunicación comercial')
    expect(c.texto).toContain('respondé BAJA')
  })
  it('no publica el precio pretendido del productor ni lo compromete', () => {
    expect(c.texto).not.toContain('3.100')
    expect(comprometePrecio(c.texto)).toBe(false)
  })
  it('no filtra datos del productor', () => {
    expect(filtraContacto(c.texto, { email: 'juan.perez@x.com', phone: '+54 9 2281 555123', name: 'Juan Perez' })).toBeNull()
  })
})
