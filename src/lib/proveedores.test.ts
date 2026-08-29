import { describe, it, expect } from 'vitest'
import { PROVEEDORES, getProveedor, getProveedoresPublicados, aPublico } from './proveedores'

describe('catálogo de proveedores', () => {
  it('el catálogo en código no lleva datos de contacto', () => {
    // El repo es PÚBLICO: un mail o un teléfono acá queda indexado en GitHub. Viven en
    // `proveedor_contactos` (Supabase, service-role), junto con el consentimiento.
    const json = JSON.stringify(PROVEEDORES)
    expect(json).not.toMatch(/@/)
    expect(json).not.toMatch(/\d{8,}/)
    for (const p of PROVEEDORES as unknown as Record<string, unknown>[]) {
      expect(p.contactoEmail).toBeUndefined()
      expect(p.contactoTelefono).toBeUndefined()
    }
  })

  it('los slugs son únicos', () => {
    expect(new Set(PROVEEDORES.map((p) => p.slug)).size).toBe(PROVEEDORES.length)
  })

  it('resuelve por slug', () => {
    expect(getProveedor('grafica-fabbro')?.empresa).toBe('Gráfica Fabbro')
    expect(getProveedor('no-existe')).toBeNull()
  })

  it('sólo lo publicado sale al sitio', () => {
    for (const p of getProveedoresPublicados()) expect(p.publicado).toBe(true)
  })
})

describe('el contacto del proveedor nunca cruza al cliente', () => {
  /**
   * La garantía que le dimos: se publica la empresa, no los datos de quien la atiende.
   * Una casilla en una página indexable se la comen los scrapers en días.
   */
  it('la versión pública sólo expone los campos publicables', () => {
    for (const p of PROVEEDORES) {
      expect(Object.keys(aPublico(p)).sort()).toEqual(
        ['descripcion', 'empresa', 'leSirveA', 'provincia', 'rubro', 'slug'],
      )
    }
  })

  it('ningún campo público contiene un @ ni una tira larga de dígitos', () => {
    for (const p of PROVEEDORES) {
      const valores = Object.values(aPublico(p)).flat().join(' ')
      expect(valores).not.toMatch(/@/)
      expect(valores).not.toMatch(/\d{8,}/)
    }
  })
})
