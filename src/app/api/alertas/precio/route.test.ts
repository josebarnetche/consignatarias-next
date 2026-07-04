import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Contrato de las dos puertas de /api/alertas/precio: validación, puerta AI/API
// (auth + webhook), y la pública (email).
const { state } = vi.hoisted(() => ({
  state: {
    authOk: true as boolean,
    insertResult: { data: { id: 5 }, error: null } as { data: unknown; error: unknown },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  authenticate: async () =>
    state.authOk
      ? { ok: true, key: { userId: 'u1', id: 'k1' }, plan: 'starter' }
      : { ok: false, response: NextResponse.json({ success: false, error: { code: 'auth_required' } }, { status: 401 }) },
}))
vi.mock('@/lib/email', () => ({ sendPriceAlertConfirm: async () => ({ success: true }) }))
vi.mock('@/lib/rate-limit-db', () => ({
  enforceRateLimit: async () => ({ ok: true }),
  clientIp: () => '1.2.3.4',
  rateLimitedResponse: () => NextResponse.json({ error: 'rate' }, { status: 429 }),
}))
vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: () => {
      const b: Record<string, unknown> = { _insert: false }
      b.insert = () => { b._insert = true; return b }
      b.select = () => b
      b.order = () => b
      b.limit = () => b
      b.eq = () => b
      b.maybeSingle = () => Promise.resolve({ data: { inmag_value: 4154 }, error: null })
      b.single = () => Promise.resolve(state.insertResult)
      return b
    },
  }),
}))

import { POST } from './route'

function req(body: unknown, headers?: Record<string, string>) {
  return { json: async () => body, headers: new Headers(headers) } as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  state.authOk = true
  state.insertResult = { data: { id: 5 }, error: null }
})

describe('POST /api/alertas/precio — validación compartida', () => {
  it('categoría inválida → 400', async () => {
    const res = await POST(req({ email: 'a@b.com', category: 'pollo', threshold: 5000 }))
    expect(res.status).toBe(400)
  })
  it('umbral inválido → 400', async () => {
    const res = await POST(req({ email: 'a@b.com', category: 'inmag', threshold: -5 }))
    expect(res.status).toBe(400)
  })
})

describe('puerta HUMANA (email)', () => {
  it('email inválido → 400', async () => {
    const res = await POST(req({ email: 'no-email', category: 'inmag', threshold: 5000 }))
    expect(res.status).toBe(400)
  })
  it('válido → 200 + current', async () => {
    const res = await POST(req({ email: 'a@b.com', category: 'inmag', threshold: 5000 }))
    expect(res.status).toBe(200)
    expect((await res.json()).current).toBe(4154)
  })
})

describe('puerta AI/API (Authorization + webhook)', () => {
  const authHeader = { authorization: 'Bearer sk_live_x' }
  it('sin plan válido → 401', async () => {
    state.authOk = false
    const res = await POST(req({ category: 'inmag', threshold: 5000, webhook_url: 'https://a.com/h' }, authHeader))
    expect(res.status).toBe(401)
  })
  it('webhook http (no https) → 400 anti-SSRF', async () => {
    const res = await POST(req({ category: 'inmag', threshold: 5000, webhook_url: 'http://a.com/h' }, authHeader))
    expect(res.status).toBe(400)
  })
  it('webhook a localhost → 400 anti-SSRF', async () => {
    const res = await POST(req({ category: 'inmag', threshold: 5000, webhook_url: 'https://localhost/h' }, authHeader))
    expect(res.status).toBe(400)
  })
  it('auth ok + webhook https público → 200 + alert_id (delivery webhook)', async () => {
    const res = await POST(req({ category: 'inmag', threshold: 5000, webhook_url: 'https://api.example.com/hook' }, authHeader))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.data.alert_id).toBe(5)
    expect(j.data.delivery).toBe('webhook')
  })
})
