import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getParticipacion } from './participacion'

const MI_ID = 7
const OTRO_ID = 9
const HOY = Date.now()
const d = (dias: number) => new Date(HOY - dias * 86_400_000).toISOString().slice(0, 10)

type Fila = {
  category: string | null
  price: number | null
  head_count: number | null
  total_kgs: number | null
  date: string
  remitente: string | null
  localidad: string | null
  provincia: string | null
  mag_consignataria_id: number
}

function lote(over: Partial<Fila> = {}): Fila {
  return {
    category: 'NOVILLO', price: 4000, head_count: 10, total_kgs: 4000,
    date: d(10), remitente: 'X', localidad: 'AZUL', provincia: 'BUENOS AIRES',
    mag_consignataria_id: MI_ID, ...over,
  }
}

function fakeDb(lotes: Fila[], magId: number | null = MI_ID): SupabaseClient {
  return {
    from: (tabla: string) => {
      if (tabla === 'mag_consignatarias') {
        return {
          select: (cols: string) =>
            cols.includes('name')
              ? Promise.resolve({
                  data: [
                    { mag_id: MI_ID, name: 'MI CASA S.A.' },
                    { mag_id: OTRO_ID, name: 'LA COMPETENCIA S.R.L.' },
                  ],
                })
              : { eq: () => ({ maybeSingle: async () => ({ data: magId ? { mag_id: magId } : null }) }) },
        }
      }
      return {
        select: () => ({
          gte: () => ({
            order: () => ({
              range: async (desde: number, hasta: number) => ({ data: lotes.slice(desde, hasta + 1), error: null }),
            }),
          }),
        }),
      }
    },
  } as unknown as SupabaseClient
}

describe('getParticipacion', () => {
  it('devuelve null si la firma no opera en el MAG', async () => {
    expect(await getParticipacion(fakeDb([], null), 'reggi')).toBeNull()
  })

  it('calcula cuota y puesto', async () => {
    const lotes = [
      ...Array.from({ length: 30 }, () => lote({ head_count: 10 })),           // 300 mías
      ...Array.from({ length: 30 }, () => lote({ head_count: 30, mag_consignataria_id: OTRO_ID })), // 900
    ]
    const p = await getParticipacion(fakeDb(lotes), 'x')
    expect(p!.cuota).toBe(25)
    expect(p!.puesto).toBe(2)
    expect(p!.totalCasas).toBe(2)
    expect(p!.ranking.find((r) => r.esMia)).toBeTruthy()
  })

  it('NO grita cuando el movimiento es de un camión sobre una cuota chica', async () => {
    // Éste era el falso positivo: usando cabezas como muestra, 0,1 punto salía señal.
    // La unidad que se decide es el LOTE — el productor manda el camión entero.
    const previo = [
      ...Array.from({ length: 2 }, () => lote({ date: d(40), head_count: 10 })),
      ...Array.from({ length: 200 }, () => lote({ date: d(40), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const reciente = [
      ...Array.from({ length: 1 }, () => lote({ date: d(5), head_count: 10 })),
      ...Array.from({ length: 200 }, () => lote({ date: d(5), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const p = await getParticipacion(fakeDb([...previo, ...reciente]), 'x')
    expect(p!.significativo).toBe(false)
    expect(p!.leyenda).toContain('se mantiene')
  })

  it('sí marca señal cuando la cuota se mueve de verdad', async () => {
    const previo = [
      ...Array.from({ length: 10 }, () => lote({ date: d(40), head_count: 10 })),
      ...Array.from({ length: 190 }, () => lote({ date: d(40), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const reciente = [
      ...Array.from({ length: 80 }, () => lote({ date: d(5), head_count: 10 })),
      ...Array.from({ length: 120 }, () => lote({ date: d(5), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const p = await getParticipacion(fakeDb([...previo, ...reciente]), 'x')
    expect(p!.significativo).toBe(true)
    expect(p!.leyenda).toContain('Ganaste terreno')
  })

  it('detecta la pérdida de terreno', async () => {
    const previo = [
      ...Array.from({ length: 100 }, () => lote({ date: d(40), head_count: 10 })),
      ...Array.from({ length: 100 }, () => lote({ date: d(40), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const reciente = [
      ...Array.from({ length: 20 }, () => lote({ date: d(5), head_count: 10 })),
      ...Array.from({ length: 180 }, () => lote({ date: d(5), head_count: 10, mag_consignataria_id: OTRO_ID })),
    ]
    const p = await getParticipacion(fakeDb([...previo, ...reciente]), 'x')
    expect(p!.leyenda).toContain('Perdiste terreno')
  })

  it('no divide por cero si el mercado no operó', async () => {
    expect(await getParticipacion(fakeDb([lote({ head_count: 0 })]), 'x')).toBeNull()
  })
})
