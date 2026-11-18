import { afterEach, describe, expect, it } from 'vitest'
import { memolaUrl, trackMemolaClick, type MemolaPlacement } from '@/lib/analytics'
import arrMensual from '@/lib/data/arrendamiento-mensual.json'

const PLACEMENTS: MemolaPlacement[] = ['footer', 'quienes_somos', 'quienes_somos_cta', 'para_consignatarias']

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
})

describe('índice de arrendamiento mensual (MAG haciinfo000013)', () => {
  it('octubre 2026 es el índice de arrendamiento, no el INMAG', () => {
    const oct = arrMensual.months.find((m) => m.year === 2026 && m.month === 10)
    expect(oct?.index).toBe(4186.564) // INMAG octubre (haciinfo000011) = 4122.039
  })
})
