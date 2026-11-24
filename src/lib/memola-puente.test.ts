import { afterEach, describe, expect, it } from 'vitest'
import { memolaUrl, trackMemolaBlockView, trackMemolaClick, type MemolaPlacement } from '@/lib/analytics'
import arrMensual from '@/lib/data/arrendamiento-mensual.json'

const PLACEMENTS: MemolaPlacement[] = ['footer', 'quienes_somos', 'quienes_somos_cta', 'para_consignatarias', 'arrendamiento', 'frigorificos', 'consignatarias_directorio', 'ficha', 'sumar', 'remates', 'arrendamiento_top', 'arrendamiento_plaza', 'arrendamiento_mensual', 'inmag', 'canuelas', 'liniers', 'guia', 'frigorifico_ficha', 'remates_plaza']

describe('puente a MEMOLA', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('cada placement lleva la UTM del puente', () => {
    for (const p of PLACEMENTS) {
      const u = new URL(memolaUrl(p))
      expect(u.origin).toBe('https://memola.com.ar')
      expect(u.searchParams.get('utm_source')).toBe('consignatarias')
      expect(u.searchParams.get('utm_medium')).toBe(p)
      expect(u.searchParams.get('utm_campaign')).toBe('puente_memola')
    }
  })

  it('la oferta B2B (oferta_sumar) va a /servicios/ con su campaña y el placement en utm_content', () => {
    const u = new URL(memolaUrl('oferta_sumar'))
    expect(u.origin + u.pathname).toBe('https://memola.com.ar/servicios/')
    expect(Object.fromEntries(u.searchParams)).toEqual({
      utm_source: 'consignatarias',
      utm_medium: 'referral',
      utm_campaign: 'oferta_consignatarias',
      utm_content: 'oferta_sumar',
    })
  })

  it('el click en la oferta emite memola_click con placement y link_url de la oferta', () => {
    const w = { location: { hostname: 'localhost' }, __CNSG_TRACK_TEST__: true, __cnsgEvents: [] as Array<{ event: string; params?: Record<string, unknown> }> }
    ;(globalThis as { window?: unknown }).window = w
    trackMemolaClick('oferta_sumar')
    expect(w.__cnsgEvents).toEqual([
      { event: 'memola_click', params: { placement: 'oferta_sumar', link_url: memolaUrl('oferta_sumar') } },
    ])
    expect(String(w.__cnsgEvents[0].params?.link_url)).toContain('utm_campaign=oferta_consignatarias')
  })

  it('el click emite memola_click con el placement', () => {
    const w = { location: { hostname: 'localhost' }, __CNSG_TRACK_TEST__: true, __cnsgEvents: [] as Array<{ event: string; params?: Record<string, unknown> }> }
    ;(globalThis as { window?: unknown }).window = w
    trackMemolaClick('footer')
    expect(w.__cnsgEvents).toEqual([
      { event: 'memola_click', params: { placement: 'footer', link_url: memolaUrl('footer') } },
    ])
  })

  it('variante B: va a /caso-consignatarias/ con la UTM del puente y utm_content=b', () => {
    for (const p of ['guia', 'frigorifico_ficha', 'arrendamiento_top'] as MemolaPlacement[]) {
      const u = new URL(memolaUrl(p, 'b'))
      expect(u.origin + u.pathname).toBe('https://memola.com.ar/caso-consignatarias/')
      expect(Object.fromEntries(u.searchParams)).toEqual({
        utm_source: 'consignatarias',
        utm_medium: p,
        utm_campaign: 'puente_memola',
        utm_content: 'b',
      })
    }
  })

  it('variante B: click y exposición llevan variant=b', () => {
    const w = { location: { hostname: 'localhost' }, __CNSG_TRACK_TEST__: true, __cnsgEvents: [] as Array<{ event: string; params?: Record<string, unknown> }> }
    ;(globalThis as { window?: unknown }).window = w
    trackMemolaClick('guia', 'b')
    trackMemolaBlockView({ placement: 'guia', page_path: '/que-es-la-invernada', variant: 'b' })
    expect(w.__cnsgEvents).toEqual([
      { event: 'memola_click', params: { placement: 'guia', link_url: memolaUrl('guia', 'b'), variant: 'b' } },
      { event: 'memola_block_view', params: { placement: 'guia', page_path: '/que-es-la-invernada', variant: 'b' } },
    ])
  })

  it('la exposición emite memola_block_view con placement y page_path', () => {
    const w = { location: { hostname: 'localhost' }, __CNSG_TRACK_TEST__: true, __cnsgEvents: [] as Array<{ event: string; params?: Record<string, unknown> }> }
    ;(globalThis as { window?: unknown }).window = w
    trackMemolaBlockView({ placement: 'arrendamiento_top', page_path: '/mercado/arrendamiento' })
    expect(w.__cnsgEvents).toEqual([
      { event: 'memola_block_view', params: { placement: 'arrendamiento_top', page_path: '/mercado/arrendamiento' } },
    ])
  })
})

describe('índice de arrendamiento mensual (MAG haciinfo000013)', () => {
  it('octubre 2026 es el índice de arrendamiento, no el INMAG', () => {
    const oct = arrMensual.months.find((m) => m.year === 2026 && m.month === 10)
    expect(oct?.index).toBe(4186.564) // INMAG octubre (haciinfo000011) = 4122.039
  })
})
