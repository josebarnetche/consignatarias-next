import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Contrato de ownership: una alerta que no existe o no es del usuario → 404
// (sin distinguir, para no filtrar ownership). Sin auth → 401.
const { state } = vi.hoisted(() => ({
  state: {
    authOk: true as boolean,
    // Resultado de .single() sobre alertas: null + PGRST116 = no existe / no es tuya.
    singleResult: { data: null as unknown, error: { code: 'PGRST116' } as unknown },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  authenticate: async () =>
    state.authOk
      ? { ok: true, key: { userId: 'u1', id: 'k1' }, plan: 'starter' }
      : { ok: false, response: NextResponse.json({ success: false, error: { code: 'auth_required' } }, { status: 401 }) },
}))

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.eq = () => b
      b.single = () => Promise.resolve(state.singleResult)
      return b
    },
  }),
}))

import { GET } from './route'

const req = () => ({ headers: new Headers() }) as unknown as import('next/server').NextRequest
const params = { params: Promise.resolve({ alerta_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }) }

beforeEach(() => {
  state.authOk = true
  state.singleResult = { data: null, error: { code: 'PGRST116' } }
})

describe('GET /api/alertas/[alerta_id] — ownership', () => {
  it('sin auth → 401', async () => {
    state.authOk = false
    const res = await GET(req(), params)
    expect(res.status).toBe(401)
  })

  it('alerta inexistente / de otro usuario → 404 (no filtra ownership)', async () => {
    state.singleResult = { data: null, error: { code: 'PGRST116' } }
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('alerta propia → 200', async () => {
    state.singleResult = {
      data: {
        id: 'a1', name: 'x', webhook_url: 'https://e/h', filters: {}, events: ['remate.created'],
        frequency: 'immediate', status: 'active', triggers_count: 0, last_triggered_at: null,
        created_at: 't', updated_at: 't',
      },
      error: null,
    }
    const res = await GET(req(), params)
    expect(res.status).toBe(200)
    expect((await res.json()).data.alerta_id).toBe('a1')
  })
})
