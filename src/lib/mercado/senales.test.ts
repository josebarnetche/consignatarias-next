import { describe, it, expect } from 'vitest'
import {
  aMensual, estacionalidad, entradaDeCapital, posicionHistorica, MIN_ANIOS_ESTACIONAL,
} from './senales'

/**
 * Lo que se fija acá son las dos formas de mentir con estos números:
 * calcular estacionalidad sobre una serie con tendencia (y leer la inflación como
 * si fuera el ciclo ganadero), y publicar un rendimiento de campo mezclando tierra
 * agrícola con ganadera.
 */

/** Serie sintética: un ciclo estacional conocido MÁS una tendencia fuerte. */
function serieConTendenciaYCiclo(anios: number, subaAnual: number) {
  const ciclo = [0.92, 0.94, 0.98, 1.02, 1.06, 1.08, 1.06, 1.02, 0.98, 0.96, 0.98, 1.0]
  const out: { date: string; valor: number }[] = []
  for (let a = 0; a < anios; a++) {
    for (let m = 0; m < 12; m++) {
      const base = 100 * Math.pow(subaAnual, a + m / 12)
      out.push({ date: `${2015 + a}-${String(m + 1).padStart(2, '0')}-15`, valor: base * ciclo[m] })
    }
  }
  return out
}

describe('estacionalidad', () => {
  it('encuentra el ciclo aunque la serie venga con una tendencia que lo tape', () => {
    // La serie duplica todos los años: en nominal, diciembre siempre "vale más"
    // que enero. Dividir por el promedio del propio año es lo que lo corrige.
    const m = aMensual(serieConTendenciaYCiclo(6, 2))
    const e = estacionalidad(m)
    expect(e.aniosBase).toBeGreaterThanOrEqual(MIN_ANIOS_ESTACIONAL)
    const junio = e.indicePorMes.find((x) => x.mes === 6)!
    const enero = e.indicePorMes.find((x) => x.mes === 1)!
    expect(junio.indice).toBeGreaterThan(enero.indice)
    // El pico sintético es junio: tiene que salir el mes más caro de los doce.
    const pico = [...e.indicePorMes].sort((a, b) => b.indice - a.indice)[0]
    expect(pico.mes).toBe(6)
  })

  it('ubica el mes consultado contra su propia norma', () => {
    const m = aMensual(serieConTendenciaYCiclo(6, 1.5))
    const e = estacionalidad(m, '2020-06')
    expect(e.mesConsultado).not.toBeNull()
    expect(e.mesConsultado!.nombre).toBe('junio')
    expect(['barata', 'cara', 'en_su_nivel']).toContain(e.mesConsultado!.lectura)
  })

  it('no inventa lectura para un mes que no está en la serie', () => {
    const e = estacionalidad(aMensual(serieConTendenciaYCiclo(6, 1.2)), '2099-01')
    expect(e.mesConsultado).toBeNull()
  })

  it('ignora los años incompletos, que deformarían su propio promedio', () => {
    const puntos = serieConTendenciaYCiclo(5, 1.3)
    puntos.push({ date: '2030-01-15', valor: 999 }) // un año con un solo mes
    const e = estacionalidad(aMensual(puntos))
    expect(e.aniosBase).toBe(5)
  })
})

describe('entrada de capital en campo', () => {
  const zonas = [
    { provincia: 'Corrientes', zona: 'Centro', usd_ha: 1900, kg_ha_ano: 150, anos_repago: 7, aptitud: 'ganadera', n: 12, fecha: '2026-08' },
    { provincia: 'Buenos Aires', zona: 'Salado', usd_ha: 3200, kg_ha_ano: 180, anos_repago: 6.5, aptitud: 'ganadera', n: 17, fecha: '2026-08' },
    { provincia: 'Córdoba', zona: 'Núcleo', usd_ha: 18500, kg_ha_ano: null, anos_repago: null, aptitud: 'agrícola', n: 9, fecha: '2026-08' },
  ]

  it('deja afuera la tierra agrícola: no se valúa con canon de hacienda', () => {
    const r = entradaDeCapital(zonas, 2.6)
    expect(r.map((x) => x.provincia)).not.toContain('Córdoba')
    expect(r).toHaveLength(2)
  })

  it('ordena por rendimiento y lo calcula sobre el canon en kilos', () => {
    const r = entradaDeCapital(zonas, 2.6)
    // Corrientes: 150 kg × 2,6 USD = 390 USD/ha sobre 1.900 = 20,5 %
    expect(r[0].provincia).toBe('Corrientes')
    expect(r[0].rendimientoPct).toBeCloseTo(20.53, 1)
    expect(r[0].rentaAnualUsdHa).toBeCloseTo(390, 0)
    expect(r[0].rendimientoPct!).toBeGreaterThan(r[1].rendimientoPct!)
  })

  it('traduce la hectárea a kilos de novillo, que es como se piensa el precio acá', () => {
    const r = entradaDeCapital(zonas, 2.5)
    expect(r.find((x) => x.provincia === 'Corrientes')!.kgNovilloPorHa).toBe(760)
  })

  it('reparte un presupuesto en hectáreas', () => {
    const r = entradaDeCapital(zonas, 2.6, 500_000)
    expect(r.find((x) => x.provincia === 'Corrientes')!.hectareasPorPresupuesto).toBe(263)
  })

  it('sin precio de novillo no devuelve nada en vez de devolver cualquier cosa', () => {
    expect(entradaDeCapital(zonas, 0)).toEqual([])
  })
})

describe('posición histórica', () => {
  it('dice cuánto se aparta del promedio', () => {
    const p = posicionHistorica(Array(24).fill(100), 118)!
    expect(p.desvioPct).toBe(18)
    expect(p.lectura).toBe('por_encima')
  })

  it('no se pronuncia con una serie corta', () => {
    expect(posicionHistorica([100, 101, 99], 120)).toBeNull()
  })

  it('no llama movimiento al ruido', () => {
    expect(posicionHistorica(Array(24).fill(100), 101)!.lectura).toBe('en_promedio')
  })
})
