import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { matchConsignatarias, normalizeGeo, estimateOperation, whatsappLink } from './routing'

/**
 * Casos congelados del ruteo real de agosto 2026. Cada uno corresponde a un bug
 * que se encontró corriendo el motor contra los leads dormidos de producción:
 *
 *  · Saavedra  → antes daba las 3 mismas firmas empatadas, ordenadas alfabéticamente.
 *  · 25 de Mayo → Lalor figura en CAPITAL FEDERAL y remata ahí; el filtro por
 *    provincia la descartaba antes de mirar la zona.
 *  · Reggi     → tiene UN remate en Buenos Aires y se colaba, con bonus de partner,
 *    en todos los leads bonaerenses.
 */

type Row = {
  canonical_slug: string
  display_name: string
  province: string | null
  location: string | null
  region_operativa: string | null
  phone: string | null
  whatsapp: string | null
  featured: boolean | null
  verified: boolean | null
}

/** Sólo las firmas que el test necesita; todas existen en el registro canónico. */
const FIRMAS: Row[] = [
  { canonical_slug: 'oregui', display_name: 'Oregui Cia SA', province: 'BUENOS AIRES', location: 'Saavedra', region_operativa: null, phone: '2914000000', whatsapp: null, featured: false, verified: false },
  { canonical_slug: 'lalor', display_name: 'Martin G. Lalor SA', province: 'CAPITAL FEDERAL', location: '25 de Mayo', region_operativa: null, phone: '1140000000', whatsapp: null, featured: false, verified: false },
  { canonical_slug: 'aj-mendizabal', display_name: 'A.J. Mendizabal', province: 'CAPITAL FEDERAL', location: 'Buenos Aires', region_operativa: null, phone: '1141111111', whatsapp: null, featured: false, verified: true },
  { canonical_slug: 'colombo-y-magliano', display_name: 'Colombo y Magliano SA', province: 'BUENOS AIRES', location: 'Buenos Aires', region_operativa: null, phone: '1142222222', whatsapp: null, featured: false, verified: true },
  { canonical_slug: 'reggi', display_name: 'Reggi y Cia. SRL', province: 'CORRIENTES', location: null, region_operativa: null, phone: '3794000000', whatsapp: '3794000000', featured: true, verified: true },
]

/** Stub mínimo: matchConsignatarias hace un solo `.from().select().limit()`. */
function fakeDb(rows: Row[]): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        limit: async () => ({ data: rows, error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

describe('matchConsignatarias', () => {
  it('prioriza la firma que está EN la zona por encima de las de la capital', async () => {
    const m = await matchConsignatarias(fakeDb(FIRMAS), {
      province: 'Buenos Aires',
      zona: 'saavedra',
      limit: 3,
    })
    expect(m[0].slug).toBe('oregui')
    expect(m[0].zoneMatch).toBe(true)
    expect(m[0].score).toBeGreaterThan(m[1].score)
    expect(m[0].porQue.join(' ')).toContain('Saavedra')
  })

  it('no descarta una firma de Capital que opera en la zona del lead', async () => {
    // Lalor tiene province=CAPITAL FEDERAL pero location=25 de Mayo. Antes del fix
    // el filtro por provincia la sacaba y el lead iba a una firma de la ciudad.
    const m = await matchConsignatarias(fakeDb(FIRMAS), {
      province: 'Buenos Aires',
      zona: 'Isla, partido de 25 de Mayo (BA)',
      limit: 3,
    })
    expect(m[0].slug).toBe('lalor')
    expect(m[0].zoneMatch).toBe(true)
  })

  it('no deja que un partner de otra provincia se cuele por un remate suelto', async () => {
    // Reggi es featured (+100) y de Corrientes. Un solo remate en Buenos Aires no
    // alcanza para considerarla candidata bonaerense.
    const m = await matchConsignatarias(fakeDb(FIRMAS), {
      province: 'Buenos Aires',
      zona: 'nueve de julio',
      limit: 5,
    })
    expect(m.map((f) => f.slug)).not.toContain('reggi')
  })

  it('entre dos firmas de la misma zona, gana la partner', async () => {
    const conPartnerLocal: Row[] = [
      ...FIRMAS,
      { ...FIRMAS[0], canonical_slug: 'reggi', display_name: 'Reggi y Cia. SRL', province: 'BUENOS AIRES', location: 'Saavedra', featured: true },
    ]
    const m = await matchConsignatarias(fakeDb(conPartnerLocal), {
      province: 'Buenos Aires',
      zona: 'saavedra',
      limit: 2,
    })
    expect(m[0].slug).toBe('reggi')
    expect(m[0].porQue).toContain('partner PRO')
  })

  it('el orden es reproducible cuando hay empate', async () => {
    const a = await matchConsignatarias(fakeDb(FIRMAS), { province: 'Buenos Aires', limit: 5 })
    const b = await matchConsignatarias(fakeDb(FIRMAS), { province: 'Buenos Aires', limit: 5 })
    expect(a.map((f) => f.slug)).toEqual(b.map((f) => f.slug))
  })

  it('ignora filas cuyo slug no tiene perfil público', async () => {
    const conHuerfana: Row[] = [
      ...FIRMAS,
      { ...FIRMAS[0], canonical_slug: 'gregorio-aberasturi-s-r-l', display_name: 'Gregorio Aberasturi SRL', location: 'Saavedra' },
    ]
    const m = await matchConsignatarias(fakeDb(conHuerfana), { province: 'Buenos Aires', zona: 'saavedra', limit: 5 })
    expect(m.map((f) => f.slug)).not.toContain('gregorio-aberasturi-s-r-l')
  })

  it('sin zona declarada sigue funcionando por provincia', async () => {
    const m = await matchConsignatarias(fakeDb(FIRMAS), { province: 'Buenos Aires', limit: 5 })
    expect(m.length).toBeGreaterThan(0)
    expect(m.every((f) => f.zoneMatch === false)).toBe(true)
  })
})

describe('normalizeGeo', () => {
  it('saca acentos, sube a mayúsculas y colapsa espacios', () => {
    expect(normalizeGeo('  Córdoba   Capital ')).toBe('CORDOBA CAPITAL')
  })

  it('devuelve string vacío para null', () => {
    expect(normalizeGeo(null)).toBe('')
  })
})

describe('whatsappLink', () => {
  const t = 'hola'

  it('agrega el 9 de móvil a un número local, que es como vienen en la DB', () => {
    // Sin el 9, wa.me abre "número inválido" en vez del chat. Era el caso de TODOS
    // los links que el Ovejero prearmaba para el outreach.
    expect(whatsappLink('2214189529', t)).toContain('wa.me/5492214189529')
  })

  it('agrega el 9 aunque el número ya traiga el 54', () => {
    expect(whatsappLink('+541133623833', t)).toContain('wa.me/5491133623833')
  })

  it('no duplica el 9 si ya viene en formato móvil', () => {
    expect(whatsappLink('+5493764124038', t)).toContain('wa.me/5493764124038')
  })

  it('saca el 0 de larga distancia', () => {
    expect(whatsappLink('01122181791', t)).toContain('wa.me/5491122181791')
  })

  it('no intenta adivinar dónde va el 15 viejo (límite documentado)', () => {
    // Requiere tabla de códigos de área (11 / 221 / 2914). Se prefiere fallar a
    // mutilar un número bueno; el link sale con el 15 adentro y no abre.
    expect(whatsappLink('221154189529', t)).toContain('wa.me/549221154189529')
  })

  it('devuelve null sin teléfono o con uno demasiado corto', () => {
    expect(whatsappLink(null, t)).toBeNull()
    expect(whatsappLink('1234', t)).toBeNull()
  })

  it('escapa el texto del mensaje', () => {
    const link = whatsappLink('2214189529', '¿Seguís buscando? 40 cab.')!
    expect(link).toContain('text=')
    expect(link).not.toContain(' ')
  })
})

describe('estimateOperation', () => {
  it('no estima valor sin cabezas (arrendamiento, tasación)', () => {
    const e = estimateOperation({ headCount: null, category: null })
    expect(e.estimatedValueArs).toBeNull()
    expect(e.feeArs).toBeNull()
  })

  it('usa el peso de referencia de la categoría', () => {
    const novillos = estimateOperation({ headCount: 10, category: 'novillos' })
    const terneros = estimateOperation({ headCount: 10, category: 'terneros' })
    // 430 kg vs 190 kg de referencia.
    expect(novillos.estimatedValueArs!).toBeGreaterThan(terneros.estimatedValueArs!)
  })
})
