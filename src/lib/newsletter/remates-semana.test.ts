import { describe, it, expect } from 'vitest'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { armarRematesNewsletter, elegirDestacado, NEWSLETTER_CAP, type RemateNewsletter } from './remates-semana'

// Una firma real con un slug VARIANTE distinto del canónico (el caso que la
// regla vieja perdía: comparaba el slug crudo del remate contra el set canónico).
const conVariante = getAllProfiles().find((p) => p.allSlugs.some((s) => s !== p.canonicalSlug))!
const variante = conVariante.allSlugs.find((s) => s !== conVariante.canonicalSlug)!

function remate(i: number, slug: string): Auction {
  return {
    id: i,
    title: `Remate ${i}`,
    consignatariaSlug: slug,
    consignatariaName: `Firma ${slug}`,
    date: `2026-10-${String(10 + i).padStart(2, '0')}`,
    time: null,
    location: 'Lugar',
    province: 'CORRIENTES',
    type: 'general',
    mainCategory: 'mixto',
    estimatedHeads: null,
  } as unknown as Auction
}

describe('armarRematesNewsletter', () => {
  it('reconoce PRO por slug canónico aunque el remate traiga una variante', () => {
    const { remates, proCount } = armarRematesNewsletter(
      [remate(1, 'otra-firma-x'), remate(2, variante)],
      new Set([conVariante.canonicalSlug]),
    )
    expect(proCount).toBe(1)
    expect(remates[0].isPro).toBe(true)
    // Se registra a nombre del canónico (lo que consulta el panel de la firma).
    expect(remates[0].slug).toBe(conVariante.canonicalSlug)
    expect(remates[1].isPro).toBe(false)
  })

  it('pone los PRO primero pero respeta el tope', () => {
    const regulares = Array.from({ length: 8 }, (_, i) => remate(i + 1, `regular-${i}`))
    const pros = Array.from({ length: 12 }, (_, i) => remate(i + 1, 'firma-pro'))
    const { remates, proCount } = armarRematesNewsletter([...regulares, ...pros], new Set(['firma-pro']))
    expect(remates).toHaveLength(NEWSLETTER_CAP)
    expect(proCount).toBe(NEWSLETTER_CAP)
    expect(remates.every((r) => r.isPro)).toBe(true)
  })

  it('completa con regulares en orden cuando sobran lugares', () => {
    const { remates, proCount } = armarRematesNewsletter(
      [remate(1, 'a'), remate(2, 'b'), remate(3, 'firma-pro')],
      new Set(['firma-pro']),
    )
    expect(proCount).toBe(1)
    expect(remates.map((r) => r.title)).toEqual(['Remate 3', 'Remate 1', 'Remate 2'])
  })
})

describe('elegirDestacado', () => {
  const r = (o: Partial<RemateNewsletter>): RemateNewsletter => ({
    title: 't', date: '2026-10-20', time: null, location: '', consignataria: 'F', slug: 'f', heads: null, isPro: true, path: '/remates/x', ...o,
  })
  it('sin PRO no hay destacado', () => {
    expect(elegirDestacado([r({ isPro: false })])).toBeNull()
  })
  it('prefiere el PRO con descripción, después el de más cabezas', () => {
    const a = r({ title: 'sin desc', heads: 500 })
    const b = r({ title: 'con desc', heads: 100, description: '50 toros', date: '2026-10-23' })
    expect(elegirDestacado([a, b])?.title).toBe('con desc')
    expect(elegirDestacado([r({ title: 'chico', heads: 10 }), r({ title: 'grande', heads: 90 })])?.title).toBe('grande')
  })
  it('la ficha sale del slug del remate', () => {
    const { remates } = armarRematesNewsletter([remate(1, 'otra-firma-x')], new Set())
    expect(remates[0].path).toBe('/remates/otra-firma-x-general-corrientes-2026-10-11')
  })
})
