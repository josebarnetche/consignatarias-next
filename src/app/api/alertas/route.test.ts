import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock de authenticate() y del service client para probar el CONTRATO de alertas/*:
// auth requerido, límite por plan REAL (starter/growth/scale), y creación.
const { state } = vi.hoisted(() => ({
  state: {
    // AuthOk configurable (o AuthFail si authOk=false)
    authOk: true as boolean,
    plan: 'starter' as 'starter' | 'growth' | 'scale',
    countResult: { count: 0, error: null } as { count: number | null; error: unknown },
    insertResult: { data: { id: 'a1', name: 'x', status: 'active', created_at: 't' }, error: null } as {
      data: unknown
      error: unknown
    },
    listResult: { data: [], error: null } as { data: unknown[]; error: unknown },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  authenticate: async () =>
    state.authOk
      ? { ok: true, key: { userId: 'u1', id: 'k1' }, plan: state.plan }
      : { ok: false, response: NextResponse.json({ success: false, error: { code: 'auth_required' } }, { status: 401 }) },
}))

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: () => {
      const b: Record<string, unknown> = { _mode: 'count' }
      b.select = () => b
      b.insert = () => {
        b._mode = 'insert'
        return b
      }
      b.eq = () => b
      b.order = () => {
        if (b._mode !== 'insert') b._mode = 'list'
        return b
      }
      b.single = () => Promise.resolve(state.insertResult)
      b.then = (onF: (v: unknown) => unknown) =>
        Promise.resolve(b._mode === 'list' ? state.listResult : state.countResult).then(onF)
      return b
    },
  }),
}))

import { POST, GET } from './route'

function req(body?: unknown): import('next/server').NextRequest {
  return { json: async () => body, headers: new Headers() } as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  state.authOk = true
  state.plan = 'starter'
  state.countResult = { count: 0, error: null }
  state.insertResult = { data: { id: 'a1', name: 'x', status: 'active', created_at: 't' }, error: null }
  state.listResult = { data: [], error: null }
})

const validBody = {
  name: 'BA vacas',
  webhook_url: 'https://ex.com/hook',
  filters: { provincia: 'Buenos Aires' },
  events: ['remate.created'],
  frequency: 'immediate',
}

describe('POST /api/alertas — contrato de auth y límite', () => {
  it('sin API key válida → 401 (auth requerido)', async () => {
    state.authOk = false
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
  })

  it('plan starter con 3 alertas (< 25) → CREA (no está capado en 3 como el bug viejo)', async () => {
    state.plan = 'starter'
    state.countResult = { count: 3, error: null }
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)
    expect((await res.json()).data.alerta_id).toBe('a1')
  })

  it('plan starter al tope (25) → 403 LIMIT_EXCEEDED (límite real de starter, no free=3)', async () => {
    state.plan = 'starter'
    state.countResult = { count: 25, error: null }
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('LIMIT_EXCEEDED')
  })

  it('plan scale permite muchas más (100 < 500) → CREA', async () => {
    state.plan = 'scale'
    state.countResult = { count: 100, error: null }
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)
  })

  it('body inválido → 400 VALIDATION_ERROR', async () => {
    const res = await POST(req({ name: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/alertas', () => {
  it('sin auth → 401', async () => {
    state.authOk = false
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('con auth → 200 y devuelve el límite del plan', async () => {
    state.plan = 'growth'
    state.listResult = { data: [], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect((await res.json()).data.limit).toBe(100) // growth
  })
})
