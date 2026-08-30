import { describe, it, expect } from 'vitest'
import {
  evaluar,
  fueraDeCooldown,
  redactar,
  VENTANA,
  UMBRAL,
  COOLDOWN_DIAS,
  type PuntoUsd,
} from './novillo-usd'

/** Serie sintética: `n` ruedas al valor dado, con fechas consecutivas. */
function serie(valores: number[], desde = '2026-01-01'): PuntoUsd[] {
  const base = new Date(desde)
  return valores.map((usdKg, i) => ({
    date: new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10),
    usdKg,
  }))
}

describe('la regla', () => {
  it('no evalúa sin los dos bloques completos', () => {
    // Con menos de 40 ruedas no hay comparación posible. Estimar con menos sería
    // inventar una señal.
    expect(evaluar(serie(Array(39).fill(3)))).toBeNull()
    expect(evaluar([])).toBeNull()
    expect(evaluar(serie(Array(40).fill(3)))).not.toBeNull()
  })

  it('un mercado plano nunca dispara', () => {
    const e = evaluar(serie(Array(60).fill(3.1)))!
    expect(e.delta).toBeCloseTo(0, 6)
    expect(e.cruzaUmbral).toBe(false)
  })

  it('dispara con una suba que supera el umbral', () => {
    // 20 ruedas a 3,00 y después 20 a 3,60 = +20 %.
    const e = evaluar(serie([...Array(20).fill(3), ...Array(20).fill(3.6)]))!
    expect(e.previo).toBeCloseTo(3, 6)
    expect(e.actual).toBeCloseTo(3.6, 6)
    expect(e.delta).toBeCloseTo(0.2, 6)
    expect(e.cruzaUmbral).toBe(true)
  })

  it('dispara igual con una baja', () => {
    const e = evaluar(serie([...Array(20).fill(3), ...Array(20).fill(2.4)]))!
    expect(e.delta).toBeCloseTo(-0.2, 6)
    expect(e.cruzaUmbral).toBe(true)
  })

  it('NO dispara justo debajo del umbral', () => {
    // +11 %: se mueve, pero no lo suficiente. Es el caso que separa la alerta del ruido.
    const e = evaluar(serie([...Array(20).fill(3), ...Array(20).fill(3.33)]))!
    expect(e.delta).toBeLessThan(UMBRAL)
    expect(e.cruzaUmbral).toBe(false)
  })

  it('ignora lo que pasó antes de las 40 ruedas', () => {
    // Un derrumbe viejo no puede disparar hoy: la regla mira el mes contra el anterior.
    const e = evaluar(serie([...Array(30).fill(9), ...Array(20).fill(3), ...Array(20).fill(3)]))!
    expect(e.cruzaUmbral).toBe(false)
  })

  it('una sola rueda floja no alcanza para disparar', () => {
    // Ésta es la razón de promediar 20 ruedas: la serie tiene saltos diarios reales de
    // hasta 21 %, y con media de 5 la alerta sonaba 86 veces por año.
    const conBache = [...Array(20).fill(3), ...Array(19).fill(3), 1.5]
    const e = evaluar(serie(conBache))!
    expect(e.cruzaUmbral).toBe(false)
  })

  it('toma las últimas ruedas aunque la serie venga desordenada', () => {
    const s = serie([...Array(20).fill(3), ...Array(20).fill(3.6)])
    const desordenada = [...s].reverse()
    expect(evaluar(desordenada)!.delta).toBeCloseTo(evaluar(s)!.delta, 6)
  })

  it('las constantes son las que se publican', () => {
    expect(VENTANA).toBe(20)
    expect(UMBRAL).toBe(0.12)
    expect(COOLDOWN_DIAS).toBe(30)
  })
})

describe('cooldown', () => {
  const hoy = new Date('2026-08-30')

  it('sin disparo previo, puede sonar', () => {
    expect(fueraDeCooldown(null, hoy)).toBe(true)
  })

  it('no vuelve a sonar dentro de los 30 días', () => {
    expect(fueraDeCooldown('2026-08-25', hoy)).toBe(false)
    expect(fueraDeCooldown('2026-08-01', hoy)).toBe(false)
  })

  it('vuelve a habilitarse a los 30 días exactos', () => {
    expect(fueraDeCooldown('2026-07-31', hoy)).toBe(true)
    expect(fueraDeCooldown('2026-06-01', hoy)).toBe(true)
  })
})

describe('el texto', () => {
  const e = evaluar(serie([...Array(20).fill(3), ...Array(20).fill(3.6)]))!

  it('el asunto dice el número y la dirección', () => {
    const { asunto } = redactar(e, null)
    expect(asunto).toContain('subió')
    expect(asunto).toContain('20')
  })

  it('dice la dirección correcta en una baja', () => {
    const baja = evaluar(serie([...Array(20).fill(3), ...Array(20).fill(2.4)]))!
    expect(redactar(baja, null).asunto).toContain('bajó')
  })

  it('siempre aclara lo que la alerta NO dice', () => {
    // Sin esto, un mail que avisa un movimiento del 12 % se lee como "vendé".
    const { cuerpo } = redactar(e, null)
    expect(cuerpo).toContain('NO dice')
    expect(cuerpo).toContain('si conviene vender')
  })

  it('declara la frecuencia esperada, para que no se lea como urgencia', () => {
    // 4,0 por año es el backtest con el cooldown aplicado día por día. Contar "meses
    // con señal" daría 5,2 y sobrestimaría: un cruce en silencio no es un disparo.
    expect(redactar(e, null).cuerpo).toContain('cuatro veces por año')
  })

  it('nombra cuándo fue la vez anterior si la hubo', () => {
    expect(redactar(e, '2026-03-15').cuerpo).toContain('última vez')
    expect(redactar(e, null).cuerpo).toContain('primera vez')
  })
})
