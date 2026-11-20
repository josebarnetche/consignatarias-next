import { describe, expect, it } from 'vitest'
import * as M from './mensajes'
import { precioReferencia, type CategoriaPrecio } from './precio-referencia'
import { comprometePrecio } from './reglas'

// Datos inventados: no son de ningún lead ni de ninguna firma.
const datos = { cabezas: 50, categoria: 'novillos', zona: 'Localidad Ejemplo', provincia: 'Buenos Aires' }
const fuente: Record<string, CategoriaPrecio> = {
  novillos: { current: 3500.4, source: 'mercadoagroganadero.com.ar (observed)', observedDate: '10/11/2026' },
  vacas: { current: 2500, source: 'mercadoagroganadero.com.ar (observed)' },
  terneros: { current: 4000, source: 'MAG (derived from INMAG)' },
}

describe('precioReferencia', () => {
  it('devuelve el precio observado de la categoría, aceptando singular', () => {
    expect(precioReferencia('novillos', fuente)).toEqual({ categoria: 'novillos', precioKg: 3500.4, fecha: '10/11/2026' })
    expect(precioReferencia('Vaca', fuente)).toEqual({ categoria: 'vacas', precioKg: 2500, fecha: null })
  })
  it('no usa un precio derivado por ratio, ni inventa uno para lo que no está', () => {
    expect(precioReferencia('terneros', fuente)).toBeNull()
    expect(precioReferencia('invernada', fuente)).toBeNull()
    expect(precioReferencia(null, fuente)).toBeNull()
  })
  it('lee el archivo del sitio sin red', () => {
    const r = precioReferencia('novillos')
    if (r) expect(r.precioKg).toBeGreaterThan(0)
  })
})

describe('recordatorioOferta (único, día 7)', () => {
  it('con precio: trae el precio de referencia, no reenvía la consulta', () => {
    const c = M.recordatorioOferta({ leadId: 12, ofertaId: 34, lado: 'vende', datos, precio: precioReferencia('novillos', fuente), diasAbierto: 9 })
    expect(c.asunto).toMatch(/^Re: Hacienda disponible: .*Ref\. C-12-34/)
    expect(c.texto).toMatch(/^Buenas,/)
    expect(c.texto).toContain('esta semana los novillos se pagaron en promedio $3.500/kg vivo en el Mercado Agroganadero (observación del 10/11/2026)')
    expect(c.texto).toContain('el precio lo acuerdan las partes')
    expect(c.texto).not.toMatch(/reenv[ií]o/i)
    expect(c.texto).toMatch(/ACEPTO/)
    expect(c.texto).toMatch(/1% del bruto solo si la operación se concreta/)
    expect(c.texto).toContain('con un "no" alcanza y no insistimos')
    expect(comprometePrecio(c.texto)).toBe(false)
  })
  it('sin precio: dice cuántos días lleva buscando el comprador', () => {
    const c = M.recordatorioOferta({ leadId: 12, ofertaId: 34, lado: 'compra', datos: { ...datos, categoria: 'terneros' }, precio: null, diasAbierto: 11.6 })
    expect(c.asunto).toMatch(/^Re: Comprador buscando:/)
    expect(c.texto).toContain('el comprador lleva 11 días buscando y todavía no cerró')
    expect(c.texto).not.toMatch(/\$/)
    expect(c.texto).not.toMatch(/reenv[ií]o/i)
    expect(c.texto).toMatch(/ACEPTO/)
    expect(c.texto).toContain('con un "no" alcanza y no insistimos')
  })
  it('sin precio ni fecha: queda corto y neutro', () => {
    const c = M.recordatorioOferta({ leadId: 1, ofertaId: 2, lado: 'vende', datos })
    expect(c.texto).toContain('la hacienda sigue disponible')
    expect(c.texto.split('\n').length).toBeLessThan(12)
  })
})
