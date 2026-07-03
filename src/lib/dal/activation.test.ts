import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del client tipado: cada from(table) devuelve un builder chainable y
// awaitable que resuelve al resultado configurado por tabla.
const { results } = vi.hoisted(() => ({
  results: {
    remate_favorites: { count: 0, error: null as null | { message: string } },
    user_favorites: { count: 0, error: null as null | { message: string } },
  } as Record<string, { count: number; error: null | { message: string } }>,
}))

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      builder.select = () => builder
      builder.eq = () => builder
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve(results[table]).then(onFulfilled)
      return builder
    },
  }),
}))

import { getActivationStatus } from './activation'

beforeEach(() => {
  results.remate_favorites = { count: 0, error: null }
  results.user_favorites = { count: 0, error: null }
})

describe('getActivationStatus', () => {
  it('usuario sin datos → todo false', async () => {
    const s = await getActivationStatus('u1')
    expect(s).toEqual({ hasSavedRemates: false, hasAlerts: false })
  })

  it('usuario con remate guardado → hasSavedRemates true (mide remate_favorites, NO user_favorites)', async () => {
    results.remate_favorites = { count: 2, error: null }
    const s = await getActivationStatus('u1')
    expect(s.hasSavedRemates).toBe(true)
    expect(s.hasAlerts).toBe(false)
  })

  it('usuario con notify_new_remate → hasAlerts true', async () => {
    results.user_favorites = { count: 1, error: null }
    const s = await getActivationStatus('u1')
    expect(s.hasAlerts).toBe(true)
  })

  it('NO silencia fallas: si la query de remate_favorites devuelve error → LANZA', async () => {
    results.remate_favorites = { count: 0, error: { message: 'boom' } }
    await expect(getActivationStatus('u1')).rejects.toThrow(/remate_favorites/)
  })

  it('NO silencia fallas: si la query de user_favorites devuelve error → LANZA', async () => {
    results.user_favorites = { count: 0, error: { message: 'boom' } }
    await expect(getActivationStatus('u1')).rejects.toThrow(/user_favorites/)
  })
})
