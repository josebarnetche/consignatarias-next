import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  describeStatusChange,
  logActivity,
  getActivityByLead,
  HUMAN_KINDS,
  ACTIVITY_KINDS,
  KIND_LABEL,
  OUTCOME_LABEL,
  ACTIVITY_OUTCOMES,
  type ActivityRow,
} from './activity'

describe('describeStatusChange', () => {
  it('describe un movimiento simple', () => {
    expect(describeStatusChange('new', 'contacted')).toBe('new → contacted')
  })

  it('incluye la firma cuando el lead se rutea', () => {
    expect(describeStatusChange('new', 'routed', 'oregui')).toBe('new → routed · ruteado a oregui')
  })

  it('no muestra una flecha falsa si sólo cambió la firma', () => {
    expect(describeStatusChange('routed', 'routed', 'lalor')).toBe('Ruteado a lalor')
  })
})

describe('logActivity', () => {
  function fakeDb(onInsert: (row: Record<string, unknown>) => { error: unknown }): SupabaseClient {
    return {
      from: () => ({ insert: async (row: Record<string, unknown>) => onInsert(row) }),
    } as unknown as SupabaseClient
  }

  it('guarda la actividad con sus campos', async () => {
    let guardado: Record<string, unknown> | null = null
    const ok = await logActivity(fakeDb((row) => { guardado = row; return { error: null } }), {
      leadId: 7,
      kind: 'llamada',
      outcome: 'interesado',
      body: 'sigue con los 40 novillitos',
      actor: 'jose@example.com',
    })
    expect(ok).toBe(true)
    expect(guardado).toMatchObject({
      lead_id: 7,
      kind: 'llamada',
      outcome: 'interesado',
      body: 'sigue con los 40 novillitos',
      actor: 'jose@example.com',
    })
  })

  it('nunca lanza ni corta el flujo si la escritura falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = await logActivity(fakeDb(() => ({ error: { message: 'boom' } })), {
      leadId: 7,
      kind: 'nota',
    })
    // Perder una línea de bitácora es malo; hacer fallar el cambio de estado del
    // lead por eso sería peor.
    expect(ok).toBe(false)
    spy.mockRestore()
  })

  it('recorta cuerpos largos en vez de reventar la columna', async () => {
    let guardado: Record<string, unknown> | null = null
    await logActivity(fakeDb((row) => { guardado = row; return { error: null } }), {
      leadId: 1,
      kind: 'nota',
      body: 'x'.repeat(9000),
    })
    expect((guardado!.body as string).length).toBe(4000)
  })
})

describe('getActivityByLead', () => {
  it('agrupa por lead en una sola query', async () => {
    const filas: Partial<ActivityRow>[] = [
      { id: 3, lead_id: 2, kind: 'llamada', created_at: '2026-08-21T10:00:00Z' },
      { id: 2, lead_id: 1, kind: 'nota', created_at: '2026-08-20T10:00:00Z' },
      { id: 1, lead_id: 2, kind: 'estado', created_at: '2026-08-19T10:00:00Z' },
    ]
    const db = {
      from: () => ({
        select: () => ({
          in: () => ({
            order: () => ({ limit: async () => ({ data: filas, error: null }) }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const porLead = await getActivityByLead(db, [1, 2])
    expect(porLead.get(2)).toHaveLength(2)
    expect(porLead.get(1)).toHaveLength(1)
  })

  it('devuelve un mapa vacío sin ids, sin tocar la base', async () => {
    const db = { from: () => { throw new Error('no debería consultar') } } as unknown as SupabaseClient
    expect((await getActivityByLead(db, [])).size).toBe(0)
  })
})

describe('catálogo de tipos', () => {
  it('todo kind humano es un kind válido', () => {
    for (const k of HUMAN_KINDS) expect(ACTIVITY_KINDS).toContain(k)
  })

  it('los kinds del sistema no son cargables a mano', () => {
    // El endpoint rechaza estos: si se pudieran cargar, el historial dejaría de ser
    // un registro confiable de lo que el backend hizo de verdad.
    for (const k of ['estado', 'ruteo', 'sistema'] as const) {
      expect(HUMAN_KINDS).not.toContain(k)
    }
  })

  it('cada kind y cada outcome tiene etiqueta en español', () => {
    for (const k of ACTIVITY_KINDS) expect(KIND_LABEL[k]).toBeTruthy()
    for (const o of ACTIVITY_OUTCOMES) expect(OUTCOME_LABEL[o]).toBeTruthy()
  })
})
