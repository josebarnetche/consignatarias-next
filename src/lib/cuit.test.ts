import { describe, it, expect } from 'vitest'
import { cuitValido, formatearCuit, tipoDeCuit, soloDigitos } from './cuit'

/**
 * El CUIT es obligatorio para ofrecer hacienda porque con él se hace el chequeo
 * crediticio (BCRA + Cámara de Consignatarios). Si la validación se afloja, entra
 * cualquier número y el chequeo se hace sobre nada; si se endurece de más, se
 * rebota a un productor real en el único formulario que importa. Por eso los dos
 * lados están fijados acá.
 */
describe('validación de CUIT', () => {
  it('acepta CUIT reales, con y sin guiones', () => {
    expect(cuitValido('30-71863222-2')).toBe(true) // Memola Medios SAS
    expect(cuitValido('30718632222')).toBe(true)
    expect(cuitValido('20-06148931-3')).toBe(true) // el del lead de Santiago del Estero
    expect(cuitValido(' 30-54779448-2 ')).toBe(true)
  })

  it('rechaza un dígito verificador que no cierra', () => {
    expect(cuitValido('30-71863222-9')).toBe(false)
    expect(cuitValido('20-06148931-0')).toBe(false)
  })

  it('rechaza lo que no es un CUIT', () => {
    expect(cuitValido('11111111111')).toBe(false) // todos iguales
    expect(cuitValido('2071863222')).toBe(false) // 10 dígitos
    expect(cuitValido('99-71863222-2')).toBe(false) // prefijo inexistente
    expect(cuitValido('')).toBe(false)
    expect(cuitValido(null)).toBe(false)
    expect(cuitValido('no soy un cuit')).toBe(false)
  })

  it('distingue persona física de jurídica', () => {
    expect(tipoDeCuit('20-06148931-3')).toBe('fisica')
    expect(tipoDeCuit('30-71863222-2')).toBe('juridica')
    expect(tipoDeCuit('123')).toBe(null)
  })

  it('formatea sin romper lo que no puede formatear', () => {
    expect(formatearCuit('30718632222')).toBe('30-71863222-2')
    expect(formatearCuit('30-71863222-2')).toBe('30-71863222-2')
    expect(formatearCuit('123')).toBe('123')
    expect(soloDigitos('30-71.863.222/2')).toBe('30718632222')
  })
})
