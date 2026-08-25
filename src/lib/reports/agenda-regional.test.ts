import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAgendaRegional, type Auction } from './agenda-regional'

const HOY = Date.now()
const d = (dias: number) => new Date(HOY + dias * 86_400_000).toISOString().slice(0, 10)

function rem(over: Partial<Auction> = {}): Auction {
  return {
    consignatariaSlug: 'reggi',
    consignatariaName: 'REGGI Y CIA. S.R.L.',
    date: d(5),
    location: 'MERCEDES, CORRIENTES',
    province: 'CORRIENTES',
    type: 'general',
    estimatedHeads: 100,
    status: 'scheduled',
    ...over,
  }
}

function fakeDb(provincia: string | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: provincia ? { province: provincia } : null }) }) }),
    }),
  } as unknown as SupabaseClient
}

describe('getAgendaRegional', () => {
  it('devuelve null si la firma no tiene provincia', async () => {
    expect(await getAgendaRegional(fakeDb(null), 'reggi', [rem()])).toBeNull()
  })

  it('devuelve null si no hay remates en la zona', async () => {
    expect(await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [])).toBeNull()
  })

  it('cuenta los remates propios aunque el calendario use variantes del slug', async () => {
    // El scrape emite `reggi`, `reggi-y-cia` y `reggi-y-cia-s-r-l` para la misma
    // casa. Comparando por igualdad, la firma veía "0 remates tuyos" en una semana
    // con tres.
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ consignatariaSlug: 'reggi', date: d(3) }),
      rem({ consignatariaSlug: 'reggi-y-cia', date: d(4) }),
      rem({ consignatariaSlug: 'reggi-y-cia-s-r-l', date: d(5) }),
    ])
    expect(a!.misRemates).toBe(3)
  })

  it('detecta el día en que comparte fecha con otra casa', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ date: d(3), location: 'MONTE CASEROS' }),
      rem({ consignatariaSlug: 'aguerre', consignatariaName: 'AGUERRE S.R.L.', date: d(3), location: 'MERCEDES' }),
      rem({ consignatariaSlug: 'madelan', consignatariaName: 'MADELAN S.A.', date: d(3), location: 'MERCEDES' }),
    ])
    expect(a!.diasCompartidos).toHaveLength(1)
    expect(a!.diasCompartidos[0].otros.map((o) => o.firma)).toEqual(['AGUERRE S.R.L.', 'MADELAN S.A.'])
  })

  it('no marca choque cuando el otro remate es de otra provincia', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ date: d(3) }),
      rem({ consignatariaSlug: 'otra', consignatariaName: 'OTRA', date: d(3), province: 'ENTRE RIOS' }),
    ])
    expect(a!.diasCompartidos).toHaveLength(0)
  })

  it('ofrece días sin ningún remate en la provincia', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [rem({ date: d(2) })])
    expect(a!.ventanasLibres.length).toBeGreaterThan(0)
    // Ninguna ventana puede caer en un día ya ocupado.
    expect(a!.ventanasLibres.map((v) => v.fecha)).not.toContain(d(2))
  })

  it('no parte a una casa en varias por las variantes de slug', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'otra-casa', [
      rem({ consignatariaSlug: 'reggi', date: d(3) }),
      rem({ consignatariaSlug: 'reggi-y-cia', date: d(4) }),
      rem({ consignatariaSlug: 'otra-casa', consignatariaName: 'OTRA CASA', date: d(5) }),
    ])
    const reggi = a!.competidores.filter((c) => c.nombre.includes('REGGI'))
    expect(reggi).toHaveLength(1)
    expect(reggi[0].remates).toBe(2)
  })

  it('ordena por cantidad de remates, no por cabezas declaradas', async () => {
    // Menos de un tercio del calendario declara cabezas: ordenar por ellas deja
    // arriba a quien las cargó, no a quien más opera.
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ consignatariaSlug: 'chica', consignatariaName: 'CHICA', date: d(3), estimatedHeads: 5000 }),
      ...[4, 5, 6].map((n) => rem({ consignatariaSlug: 'activa', consignatariaName: 'ACTIVA', date: d(n), estimatedHeads: null })),
    ])
    expect(a!.competidores[0].nombre).toBe('ACTIVA')
  })

  it('ignora los remates cancelados', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ date: d(3) }),
      rem({ date: d(4), status: 'cancelled' }),
    ])
    expect(a!.misRemates).toBe(1)
  })

  it('no mira hacia atrás', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ date: d(-10) }),
      rem({ date: d(3) }),
    ])
    expect(a!.rematesProvincia).toBe(1)
  })

  it('señala las categorías de la zona que la firma no cubre', async () => {
    const a = await getAgendaRegional(fakeDb('CORRIENTES'), 'reggi', [
      rem({ date: d(3), type: 'general' }),
      rem({ consignatariaSlug: 'otra', consignatariaName: 'OTRA', date: d(4), type: 'reproductores' }),
    ])
    expect(a!.categoriasSinCubrir).toContain('reproductores')
  })

  it('tolera que la provincia venga con acentos o distinto casing', async () => {
    const a = await getAgendaRegional(fakeDb('Corrientes'), 'reggi', [rem({ province: 'CORRIENTES' })])
    expect(a!.rematesProvincia).toBe(1)
  })
})
