import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCartera } from './cartera'
import { claveRemitente, repararTexto, mediana } from './mag-lotes'

/**
 * La cartera es el producto. Si dice "este cliente se te fue a tal casa" y no es
 * cierto, la firma deja de creerle a todo el panel — y con razón.
 */

const MI_ID = 7
const OTRO_ID = 9
const HOY = Date.now()

/** Fecha ISO de hace N días. */
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
    category: 'NOVILLO',
    price: 4000,
    head_count: 10,
    total_kgs: 4000,
    date: d(10),
    remitente: 'ESTANCIA X',
    localidad: 'AZUL',
    provincia: 'BUENOS AIRES',
    mag_consignataria_id: MI_ID,
    ...over,
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
              : {
                  eq: () => ({ maybeSingle: async () => ({ data: magId ? { mag_id: magId } : null }) }),
                },
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

describe('getCartera', () => {
  it('devuelve null si la firma no opera en el MAG', async () => {
    expect(await getCartera(fakeDb([], null), 'reggi')).toBeNull()
  })

  it('NO marca en riesgo a un cliente que respeta su propio ritmo', async () => {
    // Consigna cada 10 días y hace 8 que no aparece: está al día.
    const lotes = [8, 18, 28, 38].map((n) => lote({ date: d(n), remitente: 'PUNTUAL SA' }))
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo).toHaveLength(0)
  })

  it('marca en riesgo a quien rompió su ritmo', async () => {
    // Consignaba cada ~7 días; hace 60 que no aparece.
    const lotes = [60, 67, 74, 81].map((n) => lote({ date: d(n), remitente: 'SE FUE SA' }))
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo).toHaveLength(1)
    expect(c!.enRiesgo[0].nombre).toBe('SE FUE SA')
    expect(c!.enRiesgo[0].cadenciaDias).toBe(7)
  })

  it('NO alarma por menos de un mes de silencio, por corto que sea su ritmo', async () => {
    // Feedlot que consigna cada 3 días y hace 20 que no manda. Con el factor solo
    // (3 × 3 = 9) saltaba la alerta; en hacienda 20 días no son nada — la tropa se
    // junta, se coordina flete, hay que esperar remate. Por eso el piso de 30.
    const lotes = [20, 23, 26, 29].map((n) => lote({ date: d(n), remitente: 'FEEDLOT SA' }))
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo).toHaveLength(0)
  })

  it('tampoco alarma a los 47 días si su ritmo es de 17', async () => {
    // 47 < 3 × 17. Le falta poco para su ventana normal.
    const lotes = [47, 64, 81, 98].map((n) => lote({ date: d(n), remitente: 'PAUSADO SA' }))
    const c = await getCartera(fakeDb(lotes), 'x', 150)
    expect(c!.enRiesgo).toHaveLength(0)
  })

  it('NO marca en riesgo a un criador de ciclo largo', async () => {
    // Éste es el falso positivo que hundía la lista: vende al destete, cada ~180
    // días. 90 días de silencio para él son normales.
    const lotes = [90, 270, 450].map((n) => lote({ date: d(n), remitente: 'CRIADOR SA' }))
    const c = await getCartera(fakeDb(lotes), 'x', 500)
    expect(c!.enRiesgo).toHaveLength(0)
  })

  it('no opina sobre un cliente con pocas consignaciones', async () => {
    // Dos fechas = un solo intervalo: no alcanza para hablar de ritmo.
    const lotes = [70, 80].map((n) => lote({ date: d(n), remitente: 'POCAS SA' }))
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo).toHaveLength(0)
  })

  it('dice a qué casa se fue el cliente', async () => {
    const lotes = [
      ...[60, 67, 74].map((n) => lote({ date: d(n), remitente: 'MUDADO SA' })),
      // Después de dejarnos, aparece con la competencia.
      lote({ date: d(20), remitente: 'MUDADO SA', mag_consignataria_id: OTRO_ID }),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo[0].seFueA).toBe('LA COMPETENCIA S.R.L.')
  })

  it('no inventa destino si el cliente simplemente dejó de operar', async () => {
    const lotes = [60, 67, 74].map((n) => lote({ date: d(n), remitente: 'QUIETO SA' }))
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.enRiesgo[0].seFueA).toBeNull()
  })

  it('detecta al cliente que le sacamos a otra casa', async () => {
    const lotes = [
      lote({ date: d(70), remitente: 'CAPTURADO SA', mag_consignataria_id: OTRO_ID }),
      lote({ date: d(20), remitente: 'CAPTURADO SA' }),
      lote({ date: d(10), remitente: 'CAPTURADO SA' }),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.ganados).toHaveLength(1)
    expect(c!.ganados[0].veniaDe).toBe('LA COMPETENCIA S.R.L.')
  })

  it('un cliente ganado no se cuenta también como nuevo', async () => {
    const lotes = [
      lote({ date: d(70), remitente: 'CAPTURADO SA', mag_consignataria_id: OTRO_ID }),
      lote({ date: d(20), remitente: 'CAPTURADO SA' }),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.ganados).toHaveLength(1)
    expect(c!.nuevos.map((n) => n.nombre)).not.toContain('CAPTURADO SA')
  })

  it('sólo llama nuevo a quien no aparece con ninguna otra casa', async () => {
    const lotes = [
      lote({ date: d(10), remitente: 'DEBUTANTE SA' }),
      // Éste también empieza en la segunda mitad, pero venía de otra casa.
      lote({ date: d(80), remitente: 'VIEJO SA', mag_consignataria_id: OTRO_ID }),
      lote({ date: d(10), remitente: 'VIEJO SA' }),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.nuevos.map((n) => n.nombre)).toEqual(['DEBUTANTE SA'])
  })

  it('calcula la concentración de los 5 más grandes', async () => {
    const lotes = [
      lote({ remitente: 'GRANDE SA', head_count: 900 }),
      ...Array.from({ length: 10 }, (_, i) => lote({ remitente: `CHICO ${i}`, head_count: 10 })),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.concentracionTop5).toBeGreaterThan(90)
    expect(c!.top[0].nombre).toBe('GRANDE SA')
  })

  it('cuenta un cliente una sola vez aunque el MAG escriba distinto su nombre', async () => {
    const lotes = [
      lote({ remitente: 'Estancia La Lucía', date: d(30) }),
      lote({ remitente: '  ESTANCIA LA LUCIA ', date: d(20) }),
      lote({ remitente: 'ESTANCIA LA LUCÍA.', date: d(10) }),
    ]
    const c = await getCartera(fakeDb(lotes), 'x')
    expect(c!.totalClientes).toBe(1)
  })

  it('pagina: no se queda con las primeras 1000 filas', async () => {
    const relleno = Array.from({ length: 1500 }, (_, i) => lote({ remitente: `R${i}` }))
    const c = await getCartera(fakeDb(relleno), 'x')
    expect(c!.totalClientes).toBe(1500)
  })
})

describe('repararTexto', () => {
  it('recupera la Ñ que el scrape perdió', () => {
    // El origen viene en latin-1 y se lee como UTF-8. Se verificaron todos los casos
    // del período: el 100% son Ñ (CABAÑA, ACUÑA, CAÑADA, PEÑA...).
    expect(repararTexto('CABAï¿½A EL RESPIRO S.A.')).toBe('CABAÑA EL RESPIRO S.A.')
    expect(repararTexto('ACU�A FRANCISCO')).toBe('ACUÑA FRANCISCO')
  })

  it('no toca un texto sano', () => {
    expect(repararTexto('ESTANCIA LA LUCÍA')).toBe('ESTANCIA LA LUCÍA')
  })
})

describe('claveRemitente', () => {
  it('colapsa acentos, puntos, mayúsculas y espacios', () => {
    expect(claveRemitente('  Estancia La Lucía. ')).toBe(claveRemitente('ESTANCIA LA LUCIA'))
  })

  it('repara la Ñ antes de comparar', () => {
    expect(claveRemitente('CABAï¿½A EL RESPIRO')).toBe(claveRemitente('CABAÑA EL RESPIRO'))
  })

  it('devuelve vacío para nulo', () => {
    expect(claveRemitente(null)).toBe('')
  })
})

describe('mediana', () => {
  it('no se corre por un intervalo raro', () => {
    // Un cliente que consigna cada 7 días y una vez tardó 200.
    expect(mediana([7, 7, 7, 200])).toBe(7)
  })

  it('promedia los dos del medio si son pares', () => {
    expect(mediana([2, 4, 6, 8])).toBe(5)
  })
})
