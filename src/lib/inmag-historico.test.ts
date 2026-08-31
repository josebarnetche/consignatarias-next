import { describe, it, expect } from 'vitest'
import {
  VENTANA_GRATIS_DIAS,
  SERIE_ARRANCA,
  aplicarTecho,
  diasEntre,
  notaDeRecorte,
  resolverRango,
  formatearSerie,
  type Rango,
} from './inmag-historico'

const HOY = '2026-08-31'
const fmtArs = (v: number) => `$${v.toLocaleString('es-AR')}`

describe('resolverRango', () => {
  it('sin args toma los últimos 30 días', () => {
    const r = resolverRango({}, HOY) as Rango
    expect(r.hasta).toBe(HOY)
    expect(diasEntre(r.desde, r.hasta)).toBe(30)
  })

  it('desde/hasta mandan sobre dias', () => {
    const r = resolverRango({ dias: 5000, desde: '2020-03-20', hasta: '2020-03-20' }, HOY) as Rango
    expect(r.desde).toBe('2020-03-20')
    expect(r.hasta).toBe('2020-03-20')
  })

  it('sólo desde: llega hasta hoy', () => {
    const r = resolverRango({ desde: '2024-01-01' }, HOY) as Rango
    expect(r.hasta).toBe(HOY)
  })

  it('sólo hasta: arranca al principio de la serie', () => {
    const r = resolverRango({ hasta: '2019-06-30' }, HOY) as Rango
    expect(r.desde).toBe(SERIE_ARRANCA)
  })

  it('rechaza fechas mal formadas y rangos invertidos', () => {
    expect(resolverRango({ desde: '20/03/2020' }, HOY)).toHaveProperty('error')
    expect(resolverRango({ desde: '2024-01-01', hasta: '2023-01-01' }, HOY)).toHaveProperty('error')
  })

  it('nunca deja pedir el futuro', () => {
    const r = resolverRango({ hasta: '2099-01-01' }, HOY) as Rango
    expect(r.hasta).toBe(HOY)
  })
})

describe('el techo gratuito', () => {
  /**
   * Las cuatro formas medidas en julio-agosto 2026, sobre 350 llamadas reales.
   * Si alguna de las tres primeras empieza a recortarse, el techo dejó de tocar
   * al 1,7 % y pasó a molestar a la mayoría.
   */
  const NO_SE_TOCAN: Array<[string, Record<string, unknown>]> = [
    ['sin args (default 30 días)', {}],
    ['una semana', { dias: 7 }],
    ['noventa días', { dias: 90 }],
    ['un año justo', { dias: VENTANA_GRATIS_DIAS }],
    ['fecha puntual vieja — es una cita, no el producto', { desde: '2020-03-20', hasta: '2020-03-20' }],
  ]

  it.each(NO_SE_TOCAN)('no recorta: %s', (_nombre, args) => {
    const rango = resolverRango(args, HOY) as Rango
    const { recorte } = aplicarTecho(rango, false)
    expect(recorte).toBeNull()
  })

  it('recorta la serie completa y deja exactamente la ventana gratis', () => {
    const rango = resolverRango({ dias: 5000 }, HOY) as Rango
    const { rango: servido, recorte } = aplicarTecho(rango, false)

    expect(recorte).not.toBeNull()
    expect(diasEntre(servido.desde, servido.hasta)).toBe(VENTANA_GRATIS_DIAS)
    expect(servido.hasta).toBe(HOY)
  })

  it('con autorización devuelve el rango intacto', () => {
    const rango = resolverRango({ dias: 5000 }, HOY) as Rango
    const { rango: servido, recorte } = aplicarTecho(rango, true)

    expect(recorte).toBeNull()
    expect(servido.desde).toBe(rango.desde)
  })

  it('no promete datos anteriores al inicio de la serie', () => {
    // `dias: 5000` arranca en 2012, antes de que exista el índice. La nota debe
    // hablar de 2015-01-05 y no inventar tres años que no tenemos.
    const rango = resolverRango({ dias: 5000 }, HOY) as Rango
    const { recorte } = aplicarTecho(rango, false)
    expect(recorte!.desdePedido).toBe(SERIE_ARRANCA)
  })

  it('respeta un desde explícito posterior al inicio de la serie', () => {
    const rango = resolverRango({ desde: '2018-01-01' }, HOY) as Rango
    const { recorte } = aplicarTecho(rango, false)
    expect(recorte!.desdePedido).toBe('2018-01-01')
  })

  it('es idempotente: recortar lo ya recortado no recorta de nuevo', () => {
    const rango = resolverRango({ dias: 5000 }, HOY) as Rango
    const primera = aplicarTecho(rango, false)
    const segunda = aplicarTecho(primera.rango, false)
    expect(segunda.recorte).toBeNull()
  })
})

describe('la nota del recorte', () => {
  const recorte = aplicarTecho(resolverRango({ dias: 5000 }, HOY) as Rango, false).recorte!

  it('dice qué sigue gratis: sin eso se lee como "ahora todo es pago"', () => {
    expect(notaDeRecorte(recorte, 1872)).toContain('Sigue gratis')
  })

  it('ofrece las dos vías de salida, no un cartel cerrado', () => {
    const nota = notaDeRecorte(recorte, 1872)
    expect(nota).toContain('/planes')
    expect(nota).toContain('/api/x402/inmag-historico')
  })

  it('usa las ruedas reales cuando las sabe, y días cuando no', () => {
    expect(notaDeRecorte(recorte, 1872)).toContain('1872 ruedas')
    expect(notaDeRecorte(recorte, null)).toContain(`${recorte.diasOcultos} días`)
  })
})

describe('formatearSerie', () => {
  const rows = [
    { date: '2026-01-02', valor: 3000 },
    { date: '2026-04-01', valor: 3500 },
    { date: '2026-08-28', valor: 4433.12 },
  ]
  const rango: Rango = { desde: '2026-01-02', hasta: '2026-08-28', label: 'últimos 240 días' }

  it('reporta la variación entre extremos', () => {
    const { data } = formatearSerie(rows, rango, 'ars', fmtArs)
    expect(data.inicio).toBe(3000)
    expect(data.fin).toBe(4433.12)
    expect(data.ruedas).toBe(3)
    expect(Number(data.change_pct)).toBeCloseTo(47.8, 1)
  })

  it('no marca la era Liniers cuando el rango no la cruza', () => {
    const { texto, data } = formatearSerie(rows, rango, 'ars', fmtArs)
    expect(data.era_liniers_hasta).toBeUndefined()
    expect(texto).not.toContain('Mercado de Liniers')
  })

  it('advierte la era Liniers cuando la cruza: nadie debe citar "INMAG 2020" a secas', () => {
    const conLiniers = [{ date: '2020-03-20', valor: 90 }, ...rows]
    const { texto, data } = formatearSerie(conLiniers, rango, 'ars', fmtArs)
    expect(data.era_liniers_hasta).toBe('2022-05-17')
    expect(texto).toContain('Mercado de Liniers')
  })

  it('en USD cambia la unidad y declara la regla de conversión', () => {
    const { texto, data } = formatearSerie(rows, rango, 'usd', fmtArs)
    expect(data.unidad).toBe('USD/kg vivo (blue)')
    expect(texto).toContain('dólar blue venta')
  })

  it('sobrevive a una sola rueda sin dividir por cero', () => {
    const { data } = formatearSerie([rows[0]], rango, 'ars', fmtArs)
    expect(data.ruedas).toBe(1)
    expect(data.change_pct).toBe(0)
  })
})
