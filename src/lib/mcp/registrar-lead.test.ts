import { describe, it, expect } from 'vitest'
import { validarContacto, consultaALead, SOURCE_MARKET_MATCH } from './registrar-lead'

describe('registro con consentimiento de market_match', () => {
  const ok = { nombre: 'Ana Ruiz', email: 'ana@campo.com', consentimiento: true }

  it('sin consentimiento: true explícito no se registra', () => {
    for (const consentimiento of [undefined, 'si', 1, false, 'true']) {
      expect(validarContacto({ ...ok, consentimiento }).ok).toBe(false)
    }
  })

  it('pide nombre y un contacto válido', () => {
    expect(validarContacto({ ...ok, nombre: '' }).ok).toBe(false)
    expect(validarContacto({ ...ok, email: 'no-es-mail' }).ok).toBe(false)
    expect(validarContacto({ nombre: 'Ana', telefono: '3415551234', consentimiento: true }).ok).toBe(true)
  })

  it('arma la fila de hacienda con fee y source', () => {
    const v = validarContacto(ok)
    if (!v.ok) throw new Error()
    const row = consultaALead({ quiere: 'vender', categoria: 'Terneros', cabezas: 80, provincia: 'Entre Ríos' }, v)
    expect(row).toMatchObject({ intent: 'vender', category: 'terneros', head_count: 80, hectareas: null, source: SOURCE_MARKET_MATCH })
    expect(Number(row.fee_ars)).toBeGreaterThan(0)
  })

  it('arma la fila de campo sin valuarla como hacienda', () => {
    const v = validarContacto(ok)
    if (!v.ok) throw new Error()
    const row = consultaALead({ quiere: 'arrendar_busco', hectareas: 100, provincia: 'Buenos Aires', cabezas: 999 }, v)
    expect(row).toMatchObject({ intent: 'arrendar_busco', hectareas: 100, head_count: null, category: null, fee_ars: null })
  })
})
