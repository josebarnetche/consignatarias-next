import { describe, it, expect } from 'vitest'
import { getAuctionsForProfile, colapsarDuplicadosDelCalendario } from './consignataria-slugs'
import type { Auction } from '@/lib/db/schema'

/**
 * El caso real que motivó el colapso de duplicados: UMC publica en `umcsa.net` y en
 * `umchv.ar`, y su venta de genética del 17-sep-2026 en Mercedes entró dos veces. El
 * contraejemplo que fija el límite es Madelán, que el 09-sep tuvo DOS remates de
 * verdad en El Colorado, a las 10:00 y a las 14:00.
 */
function remate(p: Partial<Auction> & { id: number; consignatariaSlug: string }): Auction {
  return {
    title: 'Remate',
    consignatariaName: 'Firma',
    date: '2026-09-17',
    time: '14:00',
    location: 'MERCEDES, CORRIENTES',
    province: 'CORRIENTES',
    type: 'general',
    mainCategory: 'mixto',
    estimatedHeads: null,
    description: '',
    youtubeUrl: null,
    catalogUrl: null,
    source: 'web',
    sourceUrl: null,
    status: 'scheduled',
    ...p,
  } as Auction
}

describe('getAuctionsForProfile: la misma subasta publicada por dos sitios de la firma', () => {
  it('colapsa dos fuentes de la misma firma con misma fecha, localidad y hora', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'u-m-c-s-a', title: 'Cabaña Pilincho' }),
      remate({ id: 2, consignatariaSlug: 'umc-haciendas-villaguay', title: 'UMC HV — Genetica' }),
    ]
    expect(getAuctionsForProfile(filas, 'umc-villaguay')).toHaveLength(1)
  })

  it('colapsa el caso real de UMC, que difiere media hora entre sus dos sitios', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'u-m-c-s-a', time: '14:00', title: 'Cabaña Pilincho y Cabaña La Morenita' }),
      remate({ id: 2, consignatariaSlug: 'umc-haciendas-villaguay', time: '14:30', title: 'UMC HV — Genetica Productiva' }),
    ]
    expect(getAuctionsForProfile(filas, 'umc-villaguay')).toHaveLength(1)
  })

  it('colapsa cuando una de las dos no sabe la hora', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'f-rauch', time: null, location: 'RAUCH, BUENOS AIRES' }),
      remate({ id: 2, consignatariaSlug: 'ferias-rauch', time: '11:30', location: 'RAUCH, BUENOS AIRES' }),
    ]
    const out = getAuctionsForProfile(filas, 'ferias-rauch')
    expect(out).toHaveLength(1)
    // Sobrevive la que trae la hora: es la que más información aporta.
    expect(out[0].time).toBe('11:30')
  })

  it('ignora acentos y mayúsculas al comparar la localidad', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'u-m-c-s-a', location: 'MERCEDES, CORRIENTES' }),
      remate({ id: 2, consignatariaSlug: 'umc-haciendas-villaguay', location: 'Mercedes, Corrientes' }),
    ]
    expect(getAuctionsForProfile(filas, 'umc-villaguay')).toHaveLength(1)
  })

  it('NO toca dos remates reales de la misma firma el mismo día en el mismo pueblo', () => {
    // Madelán, 09-sep-2026, El Colorado: invernada a las 10:00 y programa genético
    // a las 14:00. Horas distintas y las dos conocidas: no se colapsa nada.
    const filas = [
      remate({ id: 1, consignatariaSlug: 'madelan-y-cia', date: '2026-09-09', time: '10:00', location: 'EL COLORADO, FORMOSA', title: 'Invernada' }),
      remate({ id: 2, consignatariaSlug: 'madelan-s-a', date: '2026-09-09', time: '14:00', location: 'EL COLORADO, FORMOSA', title: 'EL MIRADOR Programa Genético' }),
    ]
    expect(getAuctionsForProfile(filas, 'madelan')).toHaveLength(2)
  })

  it('NO colapsa dos filas del MISMO slug: eso es la fuente repitiéndose, no dos fuentes', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'umc-haciendas-villaguay' }),
      remate({ id: 2, consignatariaSlug: 'umc-haciendas-villaguay' }),
    ]
    expect(getAuctionsForProfile(filas, 'umc-villaguay')).toHaveLength(2)
  })

  it('es determinista: el mismo insumo en otro orden deja la misma fila', () => {
    const a = remate({ id: 7, consignatariaSlug: 'u-m-c-s-a' })
    const b = remate({ id: 3, consignatariaSlug: 'umc-haciendas-villaguay' })
    const uno = getAuctionsForProfile([a, b], 'umc-villaguay')
    const otro = getAuctionsForProfile([b, a], 'umc-villaguay')
    expect(uno).toHaveLength(1)
    expect(otro).toHaveLength(1)
    expect(uno[0].id).toBe(otro[0].id)
    expect(uno[0].id).toBe(3) // a igual información, gana el id menor
  })
})

/**
 * El calendario (/remates, sus vistas y el MCP) mezcla todas las firmas. Casos reales
 * del 22-nov-2026: UMC publica en umcsa.net («U.M.C. S.A.», sin hora) y en umchv.ar
 * («UMC SA - Haciendas Villaguay SRL», 14:00) el remate del 01-dic en Goya; HRE y
 * «Horacio Rodríguez Egaña Consignaciones SRL» publican el 10-dic en Chajarí a las
 * 11:00 y a las 14:00 (horas lejanas: lo resuelve una persona, no el código).
 */
describe('colapsarDuplicadosDelCalendario: el calendario completo, todas las firmas', () => {
  it('colapsa el caso real de UMC en Goya y deja la fila con hora y la razón social canónica', () => {
    const filas = [
      remate({ id: 1294, consignatariaSlug: 'u-m-c-s-a', consignatariaName: 'U.M.C. S.A.', date: '2026-12-01', time: null, location: 'GOYA, CORRIENTES', title: 'PEQUEÑOS PRODUCTORES Remate de Invernada' }),
      remate({ id: 1300, consignatariaSlug: 'umc-haciendas-villaguay', consignatariaName: 'UMC SA - Haciendas Villaguay SRL', date: '2026-12-01', time: '14:00', location: 'Goya, Corrientes', title: 'UMC HV — Remate Feria' }),
    ]
    const out = colapsarDuplicadosDelCalendario(filas)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe(1300)
    expect(out[0].consignatariaName).toBe('UMC SA - Haciendas Villaguay SRL')
  })

  it('a la sobreviviente le pone el nombre del perfil sin mutar la fila original', () => {
    const navarro = { date: '2026-11-24', location: 'NAVARRO, BUENOS AIRES' }
    const rica = remate({ id: 1230, consignatariaSlug: 'f-rauch', consignatariaName: 'F Rauch', time: '12:00', estimatedHeads: 400, ...navarro })
    const filas = [
      remate({ id: 1229, consignatariaSlug: 'ferias-rauch-s-a', consignatariaName: 'FERIAS RAUCH S.A.', time: '11:30', ...navarro }),
      rica,
    ]
    const out = colapsarDuplicadosDelCalendario(filas)
    expect(out.map(a => a.id)).toEqual([1230])
    expect(out[0].consignatariaName).toBe('Ferias Rauch SA')
    expect(rica.consignatariaName).toBe('F Rauch')
  })

  it('NO colapsa horas conocidas y lejanas de la misma firma (HRE en Chajarí, 11:00 y 14:00)', () => {
    const chajari = { date: '2026-12-10', location: 'CHAJARI, ENTRE RÍOS' }
    const filas = [
      remate({ id: 1351, consignatariaSlug: 'hre', consignatariaName: 'HRE', time: '11:00', ...chajari }),
      remate({ id: 1354, consignatariaSlug: 'horacio-rodriguez-egana-consignaciones-s-r-l', time: '14:00', ...chajari }),
    ]
    expect(colapsarDuplicadosDelCalendario(filas)).toBe(filas)
  })

  it('NO colapsa firmas distintas el mismo día en el mismo pueblo', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'u-m-c-s-a', time: null }),
      remate({ id: 2, consignatariaSlug: 'reggi-y-cia', time: '14:00' }),
    ]
    expect(colapsarDuplicadosDelCalendario(filas)).toBe(filas)
  })

  it('NO colapsa dos filas del mismo slug ni firmas sin perfil', () => {
    const filas = [
      remate({ id: 1, consignatariaSlug: 'firma-sin-perfil' }),
      remate({ id: 2, consignatariaSlug: 'firma-sin-perfil' }),
      remate({ id: 3, consignatariaSlug: 'umc-haciendas-villaguay' }),
      remate({ id: 4, consignatariaSlug: 'umc-haciendas-villaguay' }),
    ]
    expect(colapsarDuplicadosDelCalendario(filas)).toHaveLength(4)
  })

  it('conserva el orden del calendario', () => {
    const filas = [
      remate({ id: 10, consignatariaSlug: 'reggi-y-cia', date: '2026-11-26' }),
      remate({ id: 11, consignatariaSlug: 'u-m-c-s-a', date: '2026-12-10', time: null }),
      remate({ id: 12, consignatariaSlug: 'aguerre-srl', date: '2026-12-17' }),
      remate({ id: 13, consignatariaSlug: 'umc-haciendas-villaguay', date: '2026-12-10', time: '14:00' }),
    ]
    expect(colapsarDuplicadosDelCalendario(filas).map(a => a.id)).toEqual([10, 12, 13])
  })
})
