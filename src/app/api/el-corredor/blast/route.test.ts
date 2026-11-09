import { describe, it, expect, vi, beforeEach } from 'vitest'

// El envío del Corredor registra a quién le llegó cada edición y manda solo a quien
// falta: el tope diario deja el resto para `continuar`, y re-disparar no duplica.
const { db, enviados } = vi.hoisted(() => ({
  db: {
    subs: [] as { email: string; source: string; status: string; el_corredor: boolean }[],
    envios: [] as { ym: string; tipo: string; email: string }[],
    falla: new Set<string>(),
  },
  enviados: [] as string[],
}))

type Fila = Record<string, unknown>
vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: (tabla: string) => {
      const filtros: ((f: Fila) => boolean)[] = []
      const q: Record<string, unknown> = {}
      const filas = () => (tabla === 'el_corredor_envios' ? db.envios : db.subs) as unknown as Fila[]
      q.select = () => q
      q.order = () => q
      q.eq = (c: string, v: unknown) => { filtros.push((f) => f[c] === v); return q }
      q.or = (expr: string) => {
        const fuentes = expr.match(/source\.in\.\(([^)]*)\)/)![1].split(',')
        filtros.push((f) => fuentes.includes(f.source as string) || f.el_corredor === true)
        return q
      }
      q.upsert = async (fila: { ym: string; tipo: string; email: string }) => {
        if (!db.envios.some((e) => e.ym === fila.ym && e.tipo === fila.tipo && e.email === fila.email)) db.envios.push(fila)
        return { error: null }
      }
      q.then = (ok: (r: unknown) => unknown) => ok({ data: filas().filter((f) => filtros.every((p) => p(f))), error: null })
      return q
    },
  }),
}))
vi.mock('@/lib/email', () => {
  const enviar = async (email: string) => {
    if (db.falla.has(email)) return { success: false, error: 'rechazado' }
    enviados.push(email)
    return { success: true }
  }
  return { sendElCorredorDelivery: enviar, sendElCorredorCorreccion: enviar }
})
vi.mock('@/lib/email-limits', () => ({
  capForFreePlan: <T,>(r: T[]) => ({ toSend: r.slice(0, 2), skipped: Math.max(0, r.length - 2) }),
}))
vi.mock('@/lib/ops', () => ({ trackCron: async (_n: string, fn: () => Promise<unknown>) => fn() }))
vi.mock('@/lib/cron-auth', () => ({ authorizeCron: () => true }))
vi.mock('@/lib/el-corredor-manifest', () => ({
  loadCorredorManifest: async () => ({
    current: { ym: '2026-10', edition_label: 'Octubre · 2026', pdf_path: '/el-corredor/x.pdf' },
  }),
}))
vi.spyOn(globalThis, 'setTimeout').mockImplementation(((f: () => void) => { f(); return 0 }) as unknown as typeof setTimeout)

import { POST } from './route'

const req = (body: unknown) => ({ json: async () => body }) as unknown as import('next/server').NextRequest
const sub = (email: string, source = 'el-corredor', el_corredor = false, status = 'active') => ({ email, source, status, el_corredor })

beforeEach(() => {
  db.subs = [
    sub('a@x.com'), sub('b@x.com'), sub('c@x.com', 'remates'),
    sub('d@x.com', 'cierre-mensual', true), // lo pidió desde otra suscripción
    sub('e@x.com', 'cierre-mensual'),        // no lo pidió
    sub('f@x.com', 'el-corredor', false, 'unsubscribed'),
  ]
  db.envios = []
  db.falla = new Set()
  enviados.length = 0
})

describe('POST /api/el-corredor/blast', () => {
  it('día 1: manda hasta el tope y deja el resto pendiente', async () => {
    const r = await (await POST(req({ expected_ym: '2026-10' }))).json()
    expect(r).toMatchObject({ recipients_total: 4, sent: 2, pending: 2, already_sent: 0 })
    expect(db.envios).toHaveLength(2)
  })

  it('continuar: manda solo a quien falta, sin repetir, hasta terminar', async () => {
    await POST(req({ expected_ym: '2026-10' }))
    const r2 = await (await POST(req({ mode: 'continuar' }))).json()
    expect(r2).toMatchObject({ sent: 2, pending: 0, already_sent: 2 })
    const r3 = await (await POST(req({ mode: 'continuar' }))).json()
    expect(r3).toMatchObject({ sent: 0, pending: 0 })
    expect(enviados.sort()).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'])
  })

  it('incluye a quien marcó el_corredor y deja afuera al que no lo pidió y al dado de baja', async () => {
    await POST(req({ expected_ym: '2026-10' }))
    await POST(req({ mode: 'continuar' }))
    expect(enviados).toContain('d@x.com')
    expect(enviados).not.toContain('e@x.com')
    expect(enviados).not.toContain('f@x.com')
  })

  it('continuar no abre una edición que el día 1 no mandó', async () => {
    const r = await (await POST(req({ mode: 'continuar' }))).json()
    expect(r).toMatchObject({ sent: 0, reason: 'no_iniciada' })
    expect(enviados).toHaveLength(0)
  })

  it('un rechazo de Resend queda pendiente y sale al día siguiente', async () => {
    db.falla.add('a@x.com')
    const r1 = await (await POST(req({ expected_ym: '2026-10' }))).json()
    expect(r1).toMatchObject({ sent: 1, failed: 1, pending: 3 })
    db.falla.clear()
    await POST(req({ mode: 'continuar' }))
    await POST(req({ mode: 'continuar' }))
    expect(enviados.sort()).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'])
  })

  it('edición desincronizada → 409 y no manda nada', async () => {
    const res = await POST(req({ expected_ym: '2026-11' }))
    expect(res.status).toBe(409)
    expect(enviados).toHaveLength(0)
  })
})
