import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Pedir El Corredor no le quita a nadie el mail que ya tenía: el source queda y el
// pedido se marca en el_corredor.
const { db } = vi.hoisted(() => ({
  db: { subs: [] as Record<string, unknown>[] },
}))

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: () => {
      let filtro: [string, unknown] | null = null
      let cambios: Record<string, unknown> | null = null
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = (c: string, v: unknown) => {
        filtro = [c, v]
        if (cambios) {
          db.subs.filter((f) => f[filtro![0]] === filtro![1]).forEach((f) => Object.assign(f, cambios))
          return Promise.resolve({ error: null })
        }
        return q
      }
      q.maybeSingle = async () => ({ data: db.subs.find((f) => f[filtro![0]] === filtro![1]) ?? null, error: null })
      q.insert = async (fila: Record<string, unknown>) => { db.subs.push({ id: `n${db.subs.length}`, el_corredor: false, ...fila }); return { error: null } }
      q.update = (c: Record<string, unknown>) => { cambios = c; return q }
      return q
    },
  }),
}))
vi.mock('@/lib/email', () => ({ sendElCorredorDelivery: async () => ({ success: true }) }))
vi.mock('@/lib/rate-limit-db', () => ({
  enforceRateLimit: async () => ({ ok: true }),
  clientIp: () => '1.2.3.4',
  rateLimitedResponse: () => NextResponse.json({ error: 'rate' }, { status: 429 }),
}))
vi.mock('@/lib/el-corredor-manifest', () => ({
  loadCorredorManifest: async () => ({ current: { edition_label: 'Octubre · 2026', pdf_path: '/el-corredor/x.pdf' } }),
}))

import { POST } from './route'

const req = (email: string) => ({ json: async () => ({ email }), headers: new Headers() }) as unknown as import('next/server').NextRequest
const fila = (email: string) => db.subs.find((f) => f.email === email)!

beforeEach(() => {
  db.subs = [
    { id: '1', email: 'canon@x.com', source: 'arrendamiento-liquidacion', status: 'active', el_corredor: false },
    { id: '2', email: 'baja@x.com', source: 'cierre-mensual', status: 'unsubscribed', el_corredor: false },
  ]
})

describe('POST /api/el-corredor/subscribe', () => {
  it('correo nuevo → source el-corredor', async () => {
    expect((await POST(req('Nuevo@X.com'))).status).toBe(200)
    expect(fila('nuevo@x.com')).toMatchObject({ source: 'el-corredor', status: 'active' })
  })

  it('suscripto por otro lado → conserva su source y queda marcado el_corredor', async () => {
    await POST(req('canon@x.com'))
    expect(fila('canon@x.com')).toMatchObject({ source: 'arrendamiento-liquidacion', status: 'active', el_corredor: true })
  })

  it('dado de baja → vuelve activo por el Corredor', async () => {
    await POST(req('baja@x.com'))
    expect(fila('baja@x.com')).toMatchObject({ source: 'el-corredor', status: 'active', el_corredor: true, unsubscribed_at: null })
  })
})
