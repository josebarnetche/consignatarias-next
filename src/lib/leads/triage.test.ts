import { describe, it, expect } from 'vitest'
import { triageLead, dedupeKey } from './triage'

/**
 * Los casos vienen de las 12 filas reales de `producer_leads` al 21-ago-2026.
 * Si un cambio futuro hace pasar el lead de etiquetas o bloquear el de Fleitas,
 * estos tests lo cantan.
 */
describe('triageLead', () => {
  it('deja pasar un lead de hacienda completo (manuel abalo, 50 novillos)', () => {
    const r = triageLead({
      intent: 'vender',
      province: 'Buenos Aires',
      zona: 'nueve de julio',
      headCount: 50,
    })
    expect(r.status).toBe('new')
    expect(r.motivo).toBeNull()
  })

  it('deja pasar un lead de arrendamiento con hectáreas (Elisabet, 80 ha)', () => {
    const r = triageLead({
      intent: 'arrendar_busco',
      province: 'Buenos Aires',
      zona: 'Isla, partido de 25 de Mayo (BA)',
      hectareas: 80,
      message: '80 Ha. campo mixto',
    })
    expect(r.status).toBe('new')
  })

  it('marca para revisión al proveedor de etiquetas', () => {
    const r = triageLead({
      intent: 'vender',
      province: 'Buenos Aires',
      message: 'ETIQUETAS PARA LA INDUSTRIA FRIGORIFICA',
      name: 'CHRISTIAN FABBRO',
    })
    expect(r.status).toBe('needs_review')
    expect(r.motivo).toContain('etiqueta')
  })

  it('marca para revisión un lead sin geo ni volumen ("CONTACTO")', () => {
    const r = triageLead({ intent: 'vender', message: 'CONTACTO', name: 'MATIAS SEBASTIAN' })
    expect(r.status).toBe('needs_review')
    expect(r.motivo).toContain('no hay con qué rutearlo')
  })

  it('deja pasar un lead con zona pero sin provincia', () => {
    // La zona sola alcanza para que una firma sepa de dónde le hablan.
    const r = triageLead({ intent: 'vender', zona: 'CONCEPCION DE LA SIERRA', headCount: 5 })
    expect(r.status).toBe('new')
  })

  it('no se deja engañar por acentos ni mayúsculas al detectar el rubro', () => {
    const r = triageLead({ intent: 'vender', province: 'Córdoba', message: 'Hacemos IMPRESIÓN de etiquetas' })
    expect(r.status).toBe('needs_review')
  })
})

describe('dedupeKey', () => {
  it('da la misma clave para las dos cargas de Fleitas (mismo mail, mismo intent)', () => {
    const a = dedupeKey({ email: 'JUANKA20122@GMAIL.COM', phone: '3764124038', intent: 'vender' })
    const b = dedupeKey({ email: 'juanka20122@gmail.com', phone: '+5493764124038', intent: 'vender' })
    expect(a).toBe(b)
  })

  it('ignora el prefijo de país y el 9 de celular cuando sólo hay teléfono', () => {
    const a = dedupeKey({ phone: '2914222452', intent: 'vender' })
    const b = dedupeKey({ phone: '+54 9 291 4222452', intent: 'vender' })
    expect(a).toBe(b)
  })

  it('separa el mismo contacto con intenciones distintas', () => {
    const vender = dedupeKey({ email: 'x@y.com', intent: 'vender' })
    const comprar = dedupeKey({ email: 'x@y.com', intent: 'comprar' })
    expect(vender).not.toBe(comprar)
  })

  it('devuelve null si no hay email ni teléfono usable', () => {
    expect(dedupeKey({ intent: 'vender' })).toBeNull()
    expect(dedupeKey({ phone: '123', intent: 'vender' })).toBeNull()
  })
})
