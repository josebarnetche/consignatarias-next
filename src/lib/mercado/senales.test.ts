import { describe, it, expect } from 'vitest'
import {
  aMensual, estacionalidad, rentaCampo, posicionHistorica, MIN_ANIOS_ESTACIONAL,
  type ZonaTierra,
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

describe('renta del campo', () => {
  const PRECIOS = { novilloUsdKg: 2.6, sojaUsdTn: 500 }
  const zonas: ZonaTierra[] = [
    // Corrientes con canon RELEVADO: 3 kg/ha/mes = 36 kg/ha/año. La producción
    // (150) es casi cuatro veces eso y no es lo que paga el arrendatario.
    { provincia: 'Corrientes', zona: 'Centro', usd_ha: 1900, kg_ha_ano: 150, kg_ha_mes_canon: 3, canon_fuente: 'UNNE 2023', qq_soja_ha_anio: null, anos_repago: 7, aptitud: 'ganadera', n: 12, fecha: '2026-08' },
    { provincia: 'Buenos Aires', zona: 'Zona núcleo', usd_ha: 18500, kg_ha_ano: 300, qq_soja_ha_anio: 21, anos_repago: 21.1, aptitud: 'agricola', n: 10, fecha: '2026-06' },
    { provincia: 'Córdoba', zona: null, usd_ha: 5100, kg_ha_ano: 120, qq_soja_ha_anio: 10.5, anos_repago: 14.6, aptitud: 'mixta', n: 26, fecha: '2024' },
    // Sin canon relevado: cae al 30 % de la producción → 100 × 0,3 = 30 kg/ha/año.
    { provincia: 'La Pampa', zona: null, usd_ha: 800, kg_ha_ano: 100, qq_soja_ha_anio: null, anos_repago: 4.5, aptitud: 'ganadera', n: 8, fecha: '2026-08' },
  ]

  it('valúa cada aptitud por su propio canon, no todo con novillo', () => {
    const r = rentaCampo(zonas, PRECIOS)
    const nucleo = r.find((x) => x.zona === 'Zona núcleo')!
    // 21 qq × US$50/qq = US$1.050/ha. Con canon ganadero habría dado 300 × 2,6 = 780.
    expect(nucleo.rentaSegun).toBe('agrícola')
    expect(nucleo.rentaUsdHa).toBeCloseTo(1050, 0)
    const ctes = r.find((x) => x.provincia === 'Corrientes')!
    expect(ctes.rentaSegun).toBe('ganadero')
    // 36 kg de canon × 2,6 = 93,6. Con la producción (150) habrían sido 390.
    expect(ctes.rentaUsdHa).toBeCloseTo(93.6, 1)
    expect(ctes.canonRelevado).toBe(true)
  })

  it('⚠️ el canon NO es la producción: tomar la producción triplica el rendimiento', () => {
    const r = rentaCampo(zonas, PRECIOS)
    const ctes = r.find((x) => x.provincia === 'Corrientes')!
    // 93,6 sobre 1.900 = 4,93 %. Con la producción daba 20,5 %, que no lo paga nadie.
    expect(ctes.rendimientoPct).toBeCloseTo(4.93, 1)
    expect(ctes.canonKgNovilloHaAno).toBe(36)
  })

  it('sin canon relevado aplica el 30 % de la producción, y lo declara', () => {
    const r = rentaCampo(zonas, PRECIOS)
    const lp = r.find((x) => x.provincia === 'La Pampa')!
    expect(lp.canonKgNovilloHaAno).toBe(30)
    expect(lp.canonRelevado).toBe(false)
    expect(lp.rentaUsdHa).toBeCloseTo(78, 0)
  })

  it('en zona mixta toma la renta mayor y declara cuál es', () => {
    const r = rentaCampo(zonas, PRECIOS)
    const cba = r.find((x) => x.provincia === 'Córdoba')!
    // ganadero: 120 × 0,3 = 36 kg × 2,6 = 93,6 · agrícola 10,5 × 50 = 525 → gana el agrícola
    expect(cba.rentaSegun).toBe('agrícola')
    expect(cba.rentaUsdHa).toBeCloseTo(525, 0)
    expect(cba.rentaGanaderaUsdHa).toBeCloseTo(93.6, 1)
  })

  it('guarda el canon en su unidad real, que es como se firma', () => {
    const r = rentaCampo(zonas, PRECIOS)
    const ctes = r.find((x) => x.provincia === 'Corrientes')!
    expect(ctes.canonKgNovilloHaAno).toBe(36)
    const nucleo = r.find((x) => x.zona === 'Zona núcleo')!
    expect(nucleo.canonQqSojaHaAno).toBe(21)
  })

  it('ya no excluye la tierra agrícola: ahora la valúa bien', () => {
    expect(rentaCampo(zonas, PRECIOS)).toHaveLength(4)
  })

  it('filtra por aptitud cuando se la piden', () => {
    const r = rentaCampo(zonas, PRECIOS, { aptitud: 'ganadera' })
    expect(r.map((x) => x.provincia).sort()).toEqual(['Corrientes', 'La Pampa'])
  })

  it('ordena por rendimiento', () => {
    const r = rentaCampo(zonas, PRECIOS)
    // Córdoba 10,3% · La Pampa 9,8% · núcleo 5,7% · Corrientes 4,9%
    expect(r[0].provincia).toBe('Córdoba')
    expect(r[0].rendimientoPct!).toBeGreaterThan(r.at(-1)!.rendimientoPct!)
  })

  it('sin precio de soja, la agrícola no inventa renta', () => {
    const r = rentaCampo(zonas, { novilloUsdKg: 2.6, sojaUsdTn: null })
    const nucleo = r.find((x) => x.zona === 'Zona núcleo')!
    expect(nucleo.rentaUsdHa).toBeNull()
    expect(nucleo.rendimientoPct).toBeNull()
  })

  it('reparte un presupuesto en hectáreas', () => {
    const r = rentaCampo(zonas, PRECIOS, { presupuestoUsd: 500_000 })
    expect(r.find((x) => x.provincia === 'Corrientes')!.hectareasPorPresupuesto).toBe(263)
  })

  it('sin ningún precio no devuelve nada en vez de devolver cualquier cosa', () => {
    expect(rentaCampo(zonas, { novilloUsdKg: 0, sojaUsdTn: 0 })).toEqual([])
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
