import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock de auth y del DAL para probar el CONTRATO de la route: 401 sin auth,
// 200 con estado, 500 si el lookup falla (nunca un false silencioso).
const { state } = vi.hoisted(() => ({
  state: {
    auth: { authorized: true, userId: 'u1', response: null as unknown },
    activation: null as unknown, // objeto → ok; Error → throw
  },
}))

vi.mock('@/lib/admin-auth', () => ({
  requireAuth: async () => state.auth,
}))
vi.mock('@/lib/dal/activation', () => ({
  getActivationStatus: async () => {
    if (state.activation instanceof Error) throw state.activation
    return state.activation
  },
}))

import { GET } from './route'

beforeEach(() => {
  state.auth = { authorized: true, userId: 'u1', response: null }
  state.activation = { hasSavedRemates: false, hasAlerts: false }
})

describe('GET /api/me/activation', () => {
  it('usuario NO autenticado → devuelve la response de auth (401)', async () => {
    state.auth = {
      authorized: false,
      userId: '',
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('autenticado + estado → 200 con el JSON del DAL', async () => {
    state.activation = { hasSavedRemates: true, hasAlerts: false }
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hasSavedRemates: true, hasAlerts: false })
  })

  it('si el DAL LANZA (falla de datos) → 500 explícito, NUNCA un false silencioso', async () => {
    state.activation = new Error('db down')
    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'activation_lookup_failed' })
  })
})
