import { describe, it, expect } from 'vitest'
import {
  bandaSemanal, CATEGORIA_TITULAR, UMBRAL_PP, MIN_SEMANAS_SERIE,
  type PuntoBanda,
} from './banda-consignatarias'

/**
 * Lo que se fija acá es lo que hace citable al número: que el párrafo salga
 * redactado y con la marca adentro, que la comparación semanal se haga contra
 * hace siete días y no contra el punto anterior de la serie, y que no se afirme
 * una tendencia con ruido de ventana móvil.
 */

const p = (date: string, category: string, amplitud: number, extra: Partial<PuntoBanda> = {}): PuntoBanda => ({
  date, category, p10: 100, mediana: 120, p90: 140, amplitud_pct: amplitud, lotes: 400, ...extra,
})

/** Doce semanas de novillo, una por semana, terminando el 2026-10-06. */
function serieNovillo(amplitudes: number[]): PuntoBanda[] {
  const fin = new Date('2026-10-06T12:00:00Z').getTime()
  return amplitudes.map((a, i) =>
    p(new Date(fin - (amplitudes.length - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10), 'NOVILLO', a),
  )
}

describe('Banda Consignatarias', () => {
  it('devuelve la cita redactada, con la marca adentro del nombre', () => {
    const b = bandaSemanal(serieNovillo([25, 26, 27, 28, 29, 30, 28, 27, 29, 30, 28, 31]))
    // La atribución que sobrevive al reenvío es la que va dentro del nombre del
    // índice: "elaborado por X" se pierde en el primer copiar y pegar.
    expect(b.cita).toContain('Banda Consignatarias')
    expect(b.cita).toContain('consignatarias.com.ar')
    expect(b.cita).toContain('31%')
    // Y tiene que explicar qué mide, o el periodista no sabe qué está copiando.
    expect(b.cita).toContain('cuánto se abre')
  })

  it('compara contra hace siete días, no contra el punto anterior de la serie', () => {
    // Dos puntos en la misma semana y uno siete días antes: el delta tiene que
    // medirse contra el de la semana pasada (26), no contra el del lunes (30).
    const puntos = [
      p('2026-09-29', 'NOVILLO', 26),
      p('2026-10-05', 'NOVILLO', 30),
      p('2026-10-06', 'NOVILLO', 31),
    ]
    const b = bandaSemanal(puntos, '2026-10-06')
    expect(b.titular!.amplitudPct).toBe(31)
    expect(b.titular!.deltaSemanaPp).toBe(5)
  })

  it('no llama tendencia a un movimiento que es ruido de la ventana móvil', () => {
    const casi = bandaSemanal([p('2026-09-29', 'NOVILLO', 28), p('2026-10-06', 'NOVILLO', 29)], '2026-10-06')
    expect(casi.titular!.deltaSemanaPp).toBeLessThan(UMBRAL_PP)
    expect(casi.lectura).toBe('estable')

    const abre = bandaSemanal([p('2026-09-29', 'NOVILLO', 28), p('2026-10-06', 'NOVILLO', 33)], '2026-10-06')
    expect(abre.lectura).toBe('se_abre')

    const cierra = bandaSemanal([p('2026-09-29', 'NOVILLO', 33), p('2026-10-06', 'NOVILLO', 28)], '2026-10-06')
    expect(cierra.lectura).toBe('se_cierra')
  })

  it('no ubica el dato contra su historia si la serie es corta', () => {
    const corta = bandaSemanal(serieNovillo([28, 29, 30]))
    expect(corta.posicion).toBeNull()
    const larga = bandaSemanal(serieNovillo(Array(MIN_SEMANAS_SERIE).fill(0).map((_, i) => 25 + i)))
    expect(larga.posicion).not.toBeNull()
    expect(larga.posicion!.semanas).toBe(MIN_SEMANAS_SERIE)
  })

  it('el titular es el novillo aunque no sea el de mayor amplitud', () => {
    const b = bandaSemanal([
      p('2026-10-06', 'VACA', 52),
      p('2026-10-06', 'NOVILLO', 28),
    ], '2026-10-06')
    expect(b.titular!.categoria).toBe(CATEGORIA_TITULAR)
    // Pero el listado sí va ordenado por amplitud: la vaca encabeza la tabla.
    expect(b.categorias[0].categoria).toBe('VACA')
  })

  it('marca el récord, que es lo que convierte el número en titular', () => {
    const bajo = bandaSemanal(serieNovillo([33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22]))
    expect(bajo.cita).toContain('más bajo de la serie')
    const alto = bandaSemanal(serieNovillo([22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]))
    expect(alto.cita).toContain('más alto de la serie')
    // En el medio de su rango no se afirma ningún récord.
    const medio = bandaSemanal(serieNovillo([22, 33, 24, 25, 26, 27, 28, 29, 30, 31, 32, 28]))
    expect(medio.cita).not.toContain('de la serie')
  })

  it('sin datos no inventa un número: lo dice', () => {
    const b = bandaSemanal([])
    expect(b.titular).toBeNull()
    expect(b.cita).toContain('Sin datos suficientes')
  })

  it('declara siempre la ventana móvil, que es lo que limita la lectura', () => {
    const b = bandaSemanal(serieNovillo([28, 29, 30, 31, 30, 29, 28, 27, 28, 29, 30, 31]))
    expect(b.advertencia).toContain('30 días')
    expect(b.advertencia).toContain('nivel y tendencia')
  })
})
