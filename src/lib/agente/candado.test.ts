import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CANDADO_SEGUNDOS, faltaFuncion, puedeCorrer, soltarCandado, tomarCandado } from './candado'
import { correrAgente } from './motor'

type Resp = { data: unknown; error: { code?: string; message?: string } | null }

/** Un cliente falso: solo rpc. Si el motor toca una tabla, el test lo ve. */
function fakeDb(rpc: (f: string, a: Record<string, unknown>) => Promise<Resp> | Resp) {
  const llamadas: { f: string; a: Record<string, unknown> }[] = []
  const from = vi.fn(() => {
    throw new Error('no debería tocar tablas')
  })
  const db = {
    async rpc(f: string, a: Record<string, unknown>) {
      llamadas.push({ f, a })
      return rpc(f, a)
    },
    from,
  }
  return { db: db as unknown as SupabaseClient, llamadas, from }
}

describe('candado del agente', () => {
  it('toma el candado con vencimiento ≤ 15 min y lo suelta con el mismo dueño', async () => {
    const { db, llamadas } = fakeDb(() => ({ data: true, error: null }))
    const r = await tomarCandado(db, 'run-1')
    expect(r).toEqual({ estado: 'tomado', duenio: 'run-1' })
    expect(puedeCorrer(r)).toBe(true)
    expect(llamadas[0]).toEqual({ f: 'agente_tomar_candado', a: { p_nombre: 'agente', p_duenio: 'run-1', p_segundos: CANDADO_SEGUNDOS } })
    expect(CANDADO_SEGUNDOS).toBeLessThanOrEqual(900)
    await soltarCandado(db, 'run-1')
    expect(llamadas[1]).toEqual({ f: 'agente_soltar_candado', a: { p_nombre: 'agente', p_duenio: 'run-1' } })
  })

  it('ocupado: otra corrida lo tiene, esta no corre', async () => {
    const { db } = fakeDb(() => ({ data: false, error: null }))
    const r = await tomarCandado(db, 'run-2')
    expect(r.estado).toBe('ocupado')
    expect(puedeCorrer(r)).toBe(false)
  })

  it('sin la migración: sigue como antes (con nota)', async () => {
    const { db } = fakeDb(() => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.agente_tomar_candado' } }))
    const r = await tomarCandado(db)
    expect(r.estado).toBe('sin_migracion')
    expect(puedeCorrer(r)).toBe(true)
    expect(faltaFuncion({ code: '42883', message: 'function x does not exist' })).toBe(true)
  })

  it('cualquier otro error: no corre (no se puede saber si hay otra corrida)', async () => {
    const { db } = fakeDb(() => ({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }))
    expect(puedeCorrer(await tomarCandado(db))).toBe(false)
    const { db: roto } = fakeDb(() => {
      throw new Error('fetch failed')
    })
    expect((await tomarCandado(roto)).estado).toBe('error')
  })

  it('soltar nunca tira', async () => {
    const { db } = fakeDb(() => {
      throw new Error('fetch failed')
    })
    await expect(soltarCandado(db, 'run-3')).resolves.toBeUndefined()
  })
})

describe('correrAgente con candado', () => {
  const previo = process.env.AGENTE_IMAP_PASSWORD
  afterEach(() => {
    if (previo === undefined) delete process.env.AGENTE_IMAP_PASSWORD
    else process.env.AGENTE_IMAP_PASSWORD = previo
  })

  it('si otra corrida está viva, sale sin leer la casilla ni tocar tablas ni mandar', async () => {
    process.env.AGENTE_IMAP_PASSWORD = 'x'
    const { db, from, llamadas } = fakeDb(() => ({ data: false, error: null }))
    const inf = await correrAgente(db, { ahora: new Date('2026-10-28T15:00:00Z') })
    expect(from).not.toHaveBeenCalled()
    expect(inf.enviados).toBe(0)
    expect(inf.notas.join(' ')).toMatch(/otra corrida/)
    expect(llamadas.map((l) => l.f)).toEqual(['agente_tomar_candado'])
  })

  it('si el candado da error, tampoco corre', async () => {
    process.env.AGENTE_IMAP_PASSWORD = 'x'
    const { db, from } = fakeDb(() => ({ data: null, error: { code: '08006', message: 'connection failure' } }))
    const inf = await correrAgente(db, { ahora: new Date('2026-10-28T15:00:00Z') })
    expect(from).not.toHaveBeenCalled()
    expect(inf.notas.join(' ')).toMatch(/no corro/)
  })
})
