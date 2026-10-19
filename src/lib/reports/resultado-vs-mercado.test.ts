import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getReferencia, getReferenciaPorPeso, SLUGS_CONOCIDOS, vrVentana } from '@/lib/vr'
import { CATEGORIAS_RESULTADO, SLUGS_SIN_VR } from './resultado-categorias'
import {
  compararResultado,
  getResultadosVsMercado,
  ubicarEnBanda,
  enVentanaVigente,
  puntoHistorico,
  type PuntoHistorico,
} from './resultado-vs-mercado'
import { RESULTADO_VS_MERCADO_MUESTRA } from './muestras'

/**
 * La comparación le dice a una firma del interior "vendiste X% arriba de la mediana".
 * Si eso no resiste que la firma lo cruce con sus liquidaciones, el panel no sirve.
 * Los tests no fijan números del VR (`vr-bandas.json` cambia todos los días): leen
 * la banda vigente y arman los precios alrededor de ella.
 */

const ventana = vrVentana()
const FECHA_VIGENTE = ventana.hasta

function resultado(filas: unknown[], fecha = FECHA_VIGENTE) {
  return { id: 'r1', auction_date: fecha, auction_title: 'Remate de prueba', category_results: filas }
}

const vaca = getReferencia('vaca').banda!

describe('categorías del formulario', () => {
  it('ofrece todas las categorías que el VR conoce, más ternero/ternera', () => {
    const slugs = CATEGORIAS_RESULTADO.map((c) => c.slug)
    for (const s of SLUGS_CONOCIDOS) expect(slugs).toContain(s)
    for (const s of slugs) {
      if (!(SLUGS_SIN_VR as readonly string[]).includes(s)) expect(SLUGS_CONOCIDOS).toContain(s)
    }
  })
})

describe('ubicarEnBanda', () => {
  const b = { p10: 100, mediana: 200, p90: 300 }
  it('clasifica las cuatro posiciones', () => {
    expect(ubicarEnBanda(99, b)).toBe('debajo de la banda')
    expect(ubicarEnBanda(150, b)).toBe('en la banda, debajo de la mediana')
    expect(ubicarEnBanda(200, b)).toBe('en la banda, arriba de la mediana')
    expect(ubicarEnBanda(301, b)).toBe('arriba de la banda')
  })
})

describe('compararResultado — ventana vigente', () => {
  it('ubica el precio y calcula el % contra la mediana', () => {
    const precio = Math.round(vaca.mediana * 1.05)
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', heads: 40, avg_price: precio }]))
    const f = r.filas[0]
    expect(f.codigo).toBe('VACA')
    expect(f.referencia?.mediana).toBe(vaca.mediana)
    expect(f.referencia?.base).toBe('categoria')
    expect(f.pctVsMediana).toBeCloseTo(((precio / vaca.mediana) - 1) * 100, 0)
    expect(f.posicion).toBe(precio > vaca.p90 ? 'arriba de la banda' : 'en la banda, arriba de la mediana')
  })

  it('debajo de P10 dice debajo de la banda', () => {
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: vaca.p10 - 1 }]))
    expect(r.filas[0].posicion).toBe('debajo de la banda')
    expect(r.filas[0].pctVsMediana).toBeLessThan(0)
  })

  it('lee filas viejas en texto libre ("Vacas")', () => {
    const r = compararResultado(resultado([{ category: 'Vacas', avg_price: vaca.mediana }]))
    expect(r.filas[0].codigo).toBe('VACA')
    expect(r.filas[0].referencia).not.toBeNull()
  })

  it('con peso usa el rango de peso cuando tiene base', () => {
    const porPeso = getReferenciaPorPeso('vaca', 425)
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', peso_kg: 425, avg_price: vaca.mediana }]))
    const ref = r.filas[0].referencia!
    if (porPeso.base === 'rango_peso') {
      expect(ref.base).toBe('rango_peso')
      expect(ref.mediana).toBe(porPeso.banda!.mediana)
      expect(ref.origen).toBeNull()
    } else {
      expect(ref.base).toBe('categoria')
    }
  })

  it('aplica el ajuste por origen sólo si vr.ts lo aplica, y lo declara', () => {
    const conOrigen = getReferencia('vaca', 'Córdoba')
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: vaca.mediana }]), { provincia: 'Córdoba' })
    expect(r.provincia).toBe('Córdoba')
    expect(r.filas[0].referencia?.mediana).toBe(conOrigen.banda!.mediana)
    if (conOrigen.origen) expect(r.filas[0].referencia?.origen?.provincia).toBe('CBA')
  })

  it('Corrientes sin base de origen queda con la banda nacional, y lo dice', () => {
    const ref = getReferencia('vaca', 'Corrientes')
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: vaca.mediana }]), { provincia: 'Corrientes' })
    if (!ref.origen) {
      expect(r.filas[0].referencia?.origen).toBeNull()
      expect(r.filas[0].nota).toMatch(/nacional/i)
    }
  })

  it('ternero queda sin referencia y dice por qué', () => {
    const r = compararResultado(resultado([
      { category: 'Ternero', categoria_vr: 'ternero', avg_price: 5000 },
      { category: 'Terneros', avg_price: 5000 },
    ]))
    for (const f of r.filas) {
      expect(f.referencia).toBeNull()
      expect(f.posicion).toBeNull()
      expect(f.nota).toMatch(/terneros/i)
    }
  })

  it('una categoría libre que el VR no conoce no se compara', () => {
    const r = compararResultado(resultado([{ category: 'Vaca con cría', avg_price: 3000 }]))
    expect(r.filas[0].referencia).toBeNull()
    expect(r.filas[0].nota).toMatch(/no tiene equivalente/)
  })

  it('un precio por cabeza (fuera de escala) no se clasifica', () => {
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: 1_200_000 }]))
    expect(r.filas[0].posicion).toBeNull()
    expect(r.filas[0].pctVsMediana).toBeNull()
    expect(r.filas[0].nota).toMatch(/por cabeza/)
  })

  it('sin precio cargado no inventa posición', () => {
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', heads: 10 }]))
    expect(r.filas[0].posicion).toBeNull()
    expect(r.filas[0].referencia).not.toBeNull()
  })

  it('descarta filas basura del JSON', () => {
    const r = compararResultado(resultado([null, 3, { heads: 3 }, { category: 'Vaca', avg_price: vaca.mediana }]))
    expect(r.filas).toHaveLength(1)
    expect(compararResultado({ ...resultado([]), category_results: null }).filas).toEqual([])
  })
})

describe('compararResultado — fechas fuera de la ventana', () => {
  const FECHA_VIEJA = '2026-08-10'
  const hist: PuntoHistorico[] = [
    { date: '2026-08-07', category: 'VACA', p10: 2000, mediana: 2400, p90: 2900, lotes: 800 },
    { date: '2026-08-11', category: 'VACA', p10: 9000, mediana: 9000, p90: 9000, lotes: 800 }, // posterior: no va
    { date: '2026-07-20', category: 'NOVILLO', p10: 3000, mediana: 3500, p90: 3800, lotes: 300 }, // muy lejos
    { date: '2026-08-08', category: 'TORO', p10: 2500, mediana: 2800, p90: 3100, lotes: 15 }, // base fina
  ]

  it('usa la banda del día del remate, no la de hoy', () => {
    expect(enVentanaVigente(FECHA_VIEJA, ventana)).toBe(false)
    const r = compararResultado(resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: 2520 }], FECHA_VIEJA), { historico: hist })
    const f = r.filas[0]
    expect(f.referencia?.base).toBe('historico')
    expect(f.referencia?.fechaBanda).toBe('2026-08-07')
    expect(f.pctVsMediana).toBe(5)
    expect(f.posicion).toBe('en la banda, arriba de la mediana')
  })

  it('sin banda de esa fecha NO compara contra la de hoy', () => {
    const r = compararResultado(resultado([{ category: 'Novillo', categoria_vr: 'novillo', avg_price: 3500 }], FECHA_VIEJA), { historico: hist })
    expect(r.filas[0].referencia).toBeNull()
    expect(r.filas[0].nota).toMatch(/inflación/)
  })

  it('base fina histórica: sólo % contra la mediana', () => {
    const r = compararResultado(resultado([{ category: 'Toro', categoria_vr: 'toro', avg_price: 2800 }], FECHA_VIEJA), { historico: hist })
    expect(r.filas[0].posicion).toBeNull()
    expect(r.filas[0].pctVsMediana).toBe(0)
    expect(r.filas[0].referencia?.confianza).toBe('baja')
  })

  it('puntoHistorico toma el más cercano anterior dentro de la tolerancia', () => {
    expect(puntoHistorico(hist, 'VACA', FECHA_VIEJA)?.date).toBe('2026-08-07')
    expect(puntoHistorico(hist, 'NOVILLO', FECHA_VIEJA)).toBeNull()
  })
})

describe('getResultadosVsMercado', () => {
  function fakeDb(rows: unknown[], province: string | null, error: unknown = null) {
    const calls: string[] = []
    const builder = (tabla: string) => {
      const q: Record<string, unknown> = {}
      const self = () => q
      for (const m of ['select', 'or', 'order', 'eq', 'gte', 'lte']) q[m] = (...a: unknown[]) => { calls.push(`${tabla}.${m}(${a.join(',')})`); return self() }
      q.limit = () => Promise.resolve({ data: rows, error })
      q.maybeSingle = () => Promise.resolve({ data: { province }, error: null })
      q.then = (res: (v: unknown) => unknown) => res({ data: [], error: null })
      return q
    }
    return { db: { from: builder } as unknown as SupabaseClient, calls }
  }

  it('lee por slug o por usuario y compara con la provincia de la firma', async () => {
    const { db, calls } = fakeDb([resultado([{ category: 'Vaca', categoria_vr: 'vaca', avg_price: vaca.mediana }])], 'Corrientes')
    const out = await getResultadosVsMercado(db, '0b6c1f2a-0000-4000-8000-000000000001', 'reggi-y-cia')
    expect(out).toHaveLength(1)
    expect(out![0].provincia).toBe('Corrientes')
    expect(calls.some((c) => c.includes('consignataria_slug.eq.reggi-y-cia,submitted_by.eq.0b6c1f2a-0000-4000-8000-000000000001'))).toBe(true)
  })

  it('sin resultados devuelve [] (empty state) y con error null (no se muestra)', async () => {
    expect(await getResultadosVsMercado(fakeDb([], null).db, 'abc', 'x')).toEqual([])
    expect(await getResultadosVsMercado(fakeDb([], null, { message: 'x' }).db, 'abc', 'x')).toBeNull()
  })

  it('rechaza un slug que rompería el filtro', async () => {
    expect(await getResultadosVsMercado(fakeDb([], null).db, 'abc', 'x,submitted_by.neq.0')).toBeNull()
  })
})

describe('muestra', () => {
  it('es rotulable como ejemplo y tiene las cuatro posiciones o casos sin base', () => {
    const filas = RESULTADO_VS_MERCADO_MUESTRA.flatMap((r) => r.filas)
    expect(filas.length).toBeGreaterThan(2)
    expect(RESULTADO_VS_MERCADO_MUESTRA[0].titulo).toMatch(/ejemplo/i)
  })
})
