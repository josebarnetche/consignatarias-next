import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertarLeadConDedupe, type ProducerLeadInsert } from './insertar-lead'

function fakeSupabase(opts: {
  recientes?: { id: number; email: string | null; phone: string | null; intent: string }[]
  insert?: { data: { id: number } | null; error: { message: string } | null }
  throwEnFrom?: boolean
}) {
  const inserts: unknown[] = []
  const from = vi.fn(() => {
    if (opts.throwEnFrom) throw new Error('red caída')
    const b: Record<string, unknown> = {}
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.gte = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => Promise.resolve({ data: opts.recientes ?? [], error: null }))
    b.insert = vi.fn((row: unknown) => {
      inserts.push(row)
      return { select: () => ({ single: () => Promise.resolve(opts.insert ?? { data: { id: 100 }, error: null }) }) }
    })
    return b
  })
  return { client: { from } as unknown as SupabaseClient, inserts }
}

const fila = { intent: 'comprar', email: 'a@b.com', name: 'X', status: 'needs_review', source: 'mcp:market_match' } as ProducerLeadInsert

describe('insertarLeadConDedupe', () => {
  it('inserta y devuelve el id', async () => {
    const { client, inserts } = fakeSupabase({})
    expect(await insertarLeadConDedupe(client, fila)).toEqual({ ok: true, leadId: 100, duplicate: false })
    expect(inserts).toHaveLength(1)
  })

  it('deduplica por email + intent dentro de la ventana', async () => {
    const { client, inserts } = fakeSupabase({ recientes: [{ id: 8, email: 'A@B.com', phone: null, intent: 'comprar' }] })
    expect(await insertarLeadConDedupe(client, fila)).toEqual({ ok: true, leadId: 8, duplicate: true })
    expect(inserts).toHaveLength(0)
  })

  it('si el insert falla devuelve ok:false sin tirar', async () => {
    const { client } = fakeSupabase({ insert: { data: null, error: { message: 'violates check constraint' } } })
    expect(await insertarLeadConDedupe(client, fila)).toEqual({ ok: false, error: 'violates check constraint' })
  })

  it('si el cliente tira, no propaga', async () => {
    const { client } = fakeSupabase({ throwEnFrom: true })
    await expect(insertarLeadConDedupe(client, fila)).resolves.toEqual({ ok: false, error: 'red caída' })
  })
})
