import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { registrarCampanas, getDistribucion, CANALES, CANAL_LABEL, type Canal } from './promotion'

function dbInsert(capturar: (filas: Record<string, unknown>[]) => { error: unknown }): SupabaseClient {
  return {
    from: () => ({ insert: async (filas: Record<string, unknown>[]) => capturar(filas) }),
  } as unknown as SupabaseClient
}

describe('registrarCampanas', () => {
  it('escribe una fila por firma promocionada', async () => {
    let guardado: Record<string, unknown>[] = []
    const n = await registrarCampanas(
      dbInsert((f) => { guardado = f; return { error: null } }),
      [
        { canal: 'newsletter', consignatariaSlug: 'oregui', remateTitle: 'Remate A', destinatarios: 88 },
        { canal: 'newsletter', consignatariaSlug: 'lalor', remateTitle: 'Remate B', destinatarios: 88 },
      ],
    )
    expect(n).toBe(2)
    expect(guardado[0]).toMatchObject({ canal: 'newsletter', consignataria_slug: 'oregui', destinatarios: 88 })
  })

  it('no rompe si no hay nada que registrar', async () => {
    expect(await registrarCampanas(dbInsert(() => ({ error: null })), [])).toBe(0)
    expect(await registrarCampanas(null, [{ canal: 'newsletter', consignatariaSlug: 'x', destinatarios: 1 }])).toBe(0)
  })

  it('nunca tira el envío abajo si la escritura falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // El mail ya salió: perder el registro es malo, abortar sería peor.
    const n = await registrarCampanas(dbInsert(() => ({ error: { message: 'boom' } })), [
      { canal: 'newsletter', consignatariaSlug: 'x', destinatarios: 10 },
    ])
    expect(n).toBe(0)
    spy.mockRestore()
  })

  it('nunca guarda un alcance negativo', async () => {
    let guardado: Record<string, unknown>[] = []
    await registrarCampanas(dbInsert((f) => { guardado = f; return { error: null } }), [
      { canal: 'outreach', consignatariaSlug: 'x', destinatarios: -5 },
    ])
    expect(guardado[0].destinatarios).toBe(0)
  })
})

describe('getDistribucion', () => {
  function dbSelect(filas: unknown[]): SupabaseClient {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({ limit: async () => ({ data: filas, error: null }) }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient
  }

  it('suma el alcance y agrupa por canal', async () => {
    const d = await getDistribucion(
      dbSelect([
        { canal: 'newsletter', remate_title: 'A', remate_date: '2026-09-01', destinatarios: 88, created_at: '2026-08-20T10:00:00Z' },
        { canal: 'newsletter', remate_title: 'B', remate_date: '2026-09-08', destinatarios: 90, created_at: '2026-08-13T10:00:00Z' },
        { canal: 'outreach', remate_title: null, remate_date: null, destinatarios: 1, created_at: '2026-08-12T10:00:00Z' },
      ]),
      'oregui',
    )
    expect(d!.alcance).toBe(179)
    expect(d!.campanas).toBe(3)
    expect(d!.porCanal[0]).toMatchObject({ canal: 'newsletter', campanas: 2, alcance: 178 })
  })

  it('devuelve null cuando no hubo distribución', async () => {
    // El panel prefiere no mostrar el bloque antes que un cero que parece un error.
    expect(await getDistribucion(dbSelect([]), 'oregui')).toBeNull()
    expect(await getDistribucion(null, 'oregui')).toBeNull()
  })

  it('trae las últimas para poder citarlas', async () => {
    const d = await getDistribucion(
      dbSelect([{ canal: 'newsletter', remate_title: 'Remate del 5', remate_date: '2026-09-05', destinatarios: 88, created_at: '2026-08-20T10:00:00Z' }]),
      'oregui',
    )
    expect(d!.ultimas[0]).toMatchObject({ remateTitle: 'Remate del 5', destinatarios: 88, label: 'Newsletter semanal' })
  })
})

describe('catálogo de canales', () => {
  it('cada canal tiene etiqueta en castellano', () => {
    for (const c of CANALES) expect(CANAL_LABEL[c as Canal]).toBeTruthy()
  })
})
