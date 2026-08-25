import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mergeAuctions,
  normalizeOwnerAuction,
  soloProximos,
  getMergedAuctionsForConsignataria,
  OWNER_ID_OFFSET,
} from './auctions'
import type { Auction } from '@/lib/db/schema'

const scrapeada = (over: Partial<Auction> = {}): Auction =>
  ({
    id: 1,
    title: 'Remate scrapeado',
    consignatariaName: 'Oregui Cia SA',
    consignatariaSlug: 'oregui',
    date: '2026-09-10',
    time: '15:00',
    location: 'Saavedra',
    province: 'BUENOS AIRES',
    type: 'invernada',
    mainCategory: 'mixto',
    estimatedHeads: 500,
    description: '',
    youtubeUrl: null,
    catalogUrl: null,
    source: 'web',
    sourceUrl: null,
    status: 'scheduled',
    ...over,
  }) as Auction

const filaOwner = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Remate cargado por la firma',
  date: '2026-09-10',
  time: '16:00',
  location: 'Saavedra',
  province: 'BUENOS AIRES',
  type: 'invernada',
  main_category: 'mixto',
  estimated_heads: 800,
  description: 'con catálogo',
  catalog_url: 'https://ejemplo/catalogo.pdf',
  youtube_url: null,
  status: 'scheduled',
  ...over,
})

describe('normalizeOwnerAuction', () => {
  it('el id depende SÓLO del id de la fila, nunca de la posición', () => {
    // El bug anterior sumaba el índice del array: el id 5 en posición 0 y el id 4
    // en posición 1 daban los dos 100005 — keys duplicadas en React y un enlace al
    // detalle que abría el remate equivocado.
    const a = normalizeOwnerAuction(filaOwner({ id: 5 }), 'X', 'x')
    const b = normalizeOwnerAuction(filaOwner({ id: 4 }), 'X', 'x')
    expect(a.id).toBe(OWNER_ID_OFFSET + 5)
    expect(b.id).toBe(OWNER_ID_OFFSET + 4)
    expect(a.id).not.toBe(b.id)
  })

  it('no colisiona con los ids del scrape', () => {
    const owner = normalizeOwnerAuction(filaOwner({ id: 1 }), 'X', 'x')
    expect(owner.id).toBeGreaterThan(99_999)
  })

  it('marca el origen como manual', () => {
    expect(normalizeOwnerAuction(filaOwner(), 'Oregui', 'oregui').source).toBe('manual')
  })

  it('rellena los campos vacíos sin romper', () => {
    const a = normalizeOwnerAuction(
      filaOwner({ title: null, location: null, province: null, type: null, main_category: null, status: null }),
      'Oregui',
      'oregui',
    )
    expect(a.type).toBe('general')
    expect(a.mainCategory).toBe('mixto')
    expect(a.status).toBe('scheduled')
    expect(a.location).toBe('')
  })
})

describe('mergeAuctions', () => {
  it('cuando el mismo remate está en las dos fuentes, gana el de la firma', () => {
    // El dueño sabe la hora, las cabezas y el catálogo mejor que nuestro parser.
    const propia = normalizeOwnerAuction(filaOwner(), 'Oregui Cia SA', 'oregui')
    const out = mergeAuctions([scrapeada()], [propia])
    expect(out).toHaveLength(1)
    expect(out[0].source).toBe('manual')
    expect(out[0].estimatedHeads).toBe(800)
    expect(out[0].catalogUrl).toContain('catalogo.pdf')
  })

  it('reconoce el mismo remate aunque la localidad venga con acentos o mayúsculas', () => {
    const propia = normalizeOwnerAuction(filaOwner({ location: 'SAAVEDRA' }), 'O', 'oregui')
    expect(mergeAuctions([scrapeada({ location: 'Saavedra' })], [propia])).toHaveLength(1)
  })

  it('no fusiona remates de fechas distintas', () => {
    const propia = normalizeOwnerAuction(filaOwner({ date: '2026-09-20' }), 'O', 'oregui')
    expect(mergeAuctions([scrapeada()], [propia])).toHaveLength(2)
  })

  it('devuelve todo ordenado por fecha y hora', () => {
    const out = mergeAuctions(
      [scrapeada({ id: 1, date: '2026-09-20' }), scrapeada({ id: 2, date: '2026-09-05' })],
      [normalizeOwnerAuction(filaOwner({ id: 9, date: '2026-09-12', location: 'Otra' }), 'O', 'oregui')],
    )
    expect(out.map((a) => a.date)).toEqual(['2026-09-05', '2026-09-12', '2026-09-20'])
  })

  it('sin remates propios devuelve lo scrapeado tal cual', () => {
    expect(mergeAuctions([scrapeada()], [])).toHaveLength(1)
  })
})

describe('soloProximos', () => {
  it('descarta los que ya pasaron', () => {
    const out = soloProximos(
      [
        scrapeada({ id: 1, date: '2026-08-01' }),
        scrapeada({ id: 2, date: '2026-09-10' }),
        scrapeada({ id: 3, date: '2026-08-22' }),
      ],
      '2026-08-22',
    )
    // El de hoy cuenta como próximo: el remate es más tarde en el día.
    expect(out.map((a) => a.id).sort()).toEqual([2, 3])
  })
})

describe('getMergedAuctionsForConsignataria', () => {
  it('sin cliente de base devuelve sólo lo scrapeado', async () => {
    const out = await getMergedAuctionsForConsignataria(null, 'oregui', 'Oregui', [scrapeada()])
    expect(out).toHaveLength(1)
    expect(out[0].source).toBe('web')
  })

  it('si la consulta falla no tira la página abajo', async () => {
    const db = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'boom' } }) }) }),
      }),
    } as unknown as SupabaseClient
    const out = await getMergedAuctionsForConsignataria(db, 'oregui', 'Oregui', [scrapeada()])
    expect(out).toHaveLength(1)
  })

  it('trae y fusiona los remates propios', async () => {
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({ order: async () => ({ data: [filaOwner({ id: 7, date: '2026-09-01', location: 'Puán' })], error: null }) }),
        }),
      }),
    } as unknown as SupabaseClient
    const out = await getMergedAuctionsForConsignataria(db, 'oregui', 'Oregui', [scrapeada()])
    expect(out).toHaveLength(2)
    expect(out[0].date).toBe('2026-09-01')
    expect(out[0].id).toBe(OWNER_ID_OFFSET + 7)
  })
})
