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

  it('el click emite memola_click con el placement', () => {
    const w = { location: { hostname: 'localhost' }, __CNSG_TRACK_TEST__: true, __cnsgEvents: [] as Array<{ event: string; params?: Record<string, unknown> }> }
    ;(globalThis as { window?: unknown }).window = w
    trackMemolaClick('footer')
    expect(w.__cnsgEvents).toEqual([
      { event: 'memola_click', params: { placement: 'footer', link_url: memolaUrl('footer') } },
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
