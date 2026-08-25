import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBenchmark, MIN_LOTES } from './benchmark'

/**
 * El benchmark es el argumento de venta de PRO, así que la barra es alta: si dice
 * "vendiste 8% arriba del mercado" tiene que ser cierto y tiene que resistir que la
 * firma lo cruce contra sus propias liquidaciones.
 */

type Lote = {
  category: string | null
  price: number | null
  head_count: number | null
  date: string
  remitente: string | null
  mag_consignataria_id: number
}

const MI_ID = 7
const OTRO_ID = 9

function lote(over: Partial<Lote> = {}): Lote {
  return {
    category: 'NOVILLO',
    price: 4000,
    head_count: 10,
    date: '2026-08-01',
    remitente: 'ESTANCIA X',
    mag_consignataria_id: MI_ID,
    ...over,
  }
}

/** Stub que respeta el paginado por `.range()`. */
function fakeDb(lotes: Lote[], magId: number | null = MI_ID): SupabaseClient {
  return {
    from: (tabla: string) => {
      if (tabla === 'mag_consignatarias') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: magId ? { mag_id: magId } : null }) }),
          }),
        }
      }
      return {
        select: () => ({
          gte: () => ({
            order: () => ({
              range: async (desde: number, hasta: number) => ({
                data: lotes.slice(desde, hasta + 1),
                error: null,
              }),
            }),
          }),
        }),
      }
    },
  } as unknown as SupabaseClient
}

describe('getBenchmark', () => {
  it('devuelve null si la firma no opera en el MAG', async () => {
    // La mayoría de las casas del interior. Decirlo así es mejor que una tabla vacía.
    expect(await getBenchmark(fakeDb([], null), 'reggi')).toBeNull()
  })

  it('devuelve null sin cliente de base', async () => {
    expect(await getBenchmark(null, 'x')).toBeNull()
  })

  it('detecta que vendió por encima del mercado', async () => {
    const mios = Array.from({ length: 40 }, () => lote({ price: 4400 }))
    const otros = Array.from({ length: 100 }, () => lote({ price: 4000, mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...mios, ...otros]), 'x')

    const novillo = b!.filas.find((f) => f.categoria === 'NOVILLO')!
    expect(novillo.diffPct).toBeGreaterThan(0)
    expect(novillo.significativa).toBe(true)
    expect(novillo.leyenda).toContain('por encima')
    expect(b!.fuertes[0].categoria).toBe('NOVILLO')
  })

  it('detecta que vendió por debajo', async () => {
    const mios = Array.from({ length: 40 }, () => lote({ price: 3500 }))
    const otros = Array.from({ length: 100 }, () => lote({ price: 4000, mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...mios, ...otros]), 'x')
    expect(b!.debiles[0].leyenda).toContain('por debajo')
  })

  it('NO afirma nada cuando la brecha entra en la dispersión de los lotes', async () => {
    // Precios muy dispersos: la diferencia de promedios no se distingue del ruido.
    const mios = Array.from({ length: 40 }, (_, i) => lote({ price: 3000 + (i % 2 ? 2200 : 0) }))
    const otros = Array.from({ length: 100 }, () => lote({ price: 4000, mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...mios, ...otros]), 'x')

    const novillo = b!.filas.find((f) => f.categoria === 'NOVILLO')!
    expect(novillo.significativa).toBe(false)
    expect(novillo.leyenda).toContain('dispersión normal')
    expect(b!.fuertes).toHaveLength(0)
    expect(b!.debiles).toHaveLength(0)
  })

  it('ignora categorías donde la firma tiene pocos lotes', async () => {
    const pocos = Array.from({ length: MIN_LOTES - 1 }, () => lote({ category: 'TORO' }))
    const otros = Array.from({ length: 100 }, () => lote({ category: 'TORO', mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...pocos, ...otros]), 'x')
    expect(b).toBeNull() // ninguna categoría llegó al mínimo
  })

  it('ignora categorías donde el mercado no tiene referencia suficiente', async () => {
    // La firma tiene lotes de sobra, pero el mercado casi no operó esa categoría.
    const mios = Array.from({ length: 40 }, () => lote({ category: 'MEJ' }))
    const otros = Array.from({ length: 5 }, () => lote({ category: 'MEJ', mag_consignataria_id: OTRO_ID }))
    expect(await getBenchmark(fakeDb([...mios, ...otros]), 'x')).toBeNull()
  })

  it('nunca mezcla categorías al comparar', async () => {
    // Una casa que vende terneros caros y otra vacas baratas no se comparan entre sí.
    const misNovillos = Array.from({ length: 30 }, () => lote({ category: 'NOVILLO', price: 4200 }))
    const misVacas = Array.from({ length: 30 }, () => lote({ category: 'VACA', price: 2800 }))
    const mercadoNovillo = Array.from({ length: 60 }, () => lote({ category: 'NOVILLO', price: 4200, mag_consignataria_id: OTRO_ID }))
    const mercadoVaca = Array.from({ length: 60 }, () => lote({ category: 'VACA', price: 2800, mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...misNovillos, ...misVacas, ...mercadoNovillo, ...mercadoVaca]), 'x')

    // Vendió exactamente al precio del mercado en las dos: nada significativo.
    for (const f of b!.filas) expect(Math.abs(f.diffPct)).toBeLessThan(0.5)
  })

  it('pagina: no se queda con las primeras 1000 filas', async () => {
    // PostgREST corta en 1000 por respuesta. Sin paginar, el mercado se calculaba
    // sobre una fracción y el promedio salía mal.
    const mios = Array.from({ length: 40 }, () => lote({ price: 4000 }))
    const relleno = Array.from({ length: 2500 }, () => lote({ price: 4000, mag_consignataria_id: OTRO_ID }))
    const b = await getBenchmark(fakeDb([...mios, ...relleno]), 'x')
    expect(b!.filas[0].lotes).toBe(40)
  })

  it('cuenta clientes distintos sin duplicar por mayúsculas o espacios', async () => {
    const lotes = [
      ...Array.from({ length: 20 }, () => lote({ remitente: 'Estancia La Lucía' })),
      ...Array.from({ length: 20 }, () => lote({ remitente: '  ESTANCIA LA LUCÍA  ' })),
      ...Array.from({ length: 100 }, () => lote({ mag_consignataria_id: OTRO_ID })),
    ]
    const b = await getBenchmark(fakeDb(lotes), 'x')
    expect(b!.clientes).toBe(1)
  })

  it('descarta lotes sin precio', async () => {
    const lotes = [
      ...Array.from({ length: 20 }, () => lote({ price: 4400 })),
      ...Array.from({ length: 50 }, () => lote({ price: 0 })),
      ...Array.from({ length: 50 }, () => lote({ price: null })),
      ...Array.from({ length: 100 }, () => lote({ price: 4000, mag_consignataria_id: OTRO_ID })),
    ]
    const b = await getBenchmark(fakeDb(lotes), 'x')
    expect(b!.totalLotes).toBe(20)
  })
})
