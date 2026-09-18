import { describe, it, expect } from 'vitest'
import { getAuctionsForProfile } from './consignataria-slugs'
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
