import { describe, it, expect } from 'vitest'
import { diasConLotesFaltantes, fechaDeRueda, restarDias } from './mag-lots-rueda'

// BA es UTC-3 fijo (sin horario de verano desde 2009): 19:42 BA = 22:42 UTC.
const ba = (isoLocal: string) => new Date(`${isoLocal}-03:00`)

describe('fechaDeRueda — la rueda de una corrida según la hora de BA al arrancar', () => {
  it('19:42 (horario agendado) → hoy', () => {
    expect(fechaDeRueda(ba('2026-11-17T19:42:00'))).toBe('2026-11-17')
  })
  it('23:59 → hoy', () => {
    expect(fechaDeRueda(ba('2026-11-17T23:59:00'))).toBe('2026-11-17')
  })
  it('00:30 (atraso de ~5h) → ayer', () => {
    expect(fechaDeRueda(ba('2026-11-18T00:30:00'))).toBe('2026-11-17')
  })
  it('05:09 (el peor atraso medido) → ayer', () => {
    expect(fechaDeRueda(ba('2026-11-18T05:09:00'))).toBe('2026-11-17')
  })
  it('11:59 → ayer', () => {
    expect(fechaDeRueda(ba('2026-11-18T11:59:00'))).toBe('2026-11-17')
  })
  it('12:00 → hoy (corrida manual de la tarde)', () => {
    expect(fechaDeRueda(ba('2026-11-18T12:00:00'))).toBe('2026-11-18')
  })
  it('cambio de mes: 01/12 03:00 → 30/11', () => {
    expect(fechaDeRueda(ba('2026-12-01T03:00:00'))).toBe('2026-11-30')
  })
  it('cambio de año: 01/01 01:15 → 31/12', () => {
    expect(fechaDeRueda(ba('2027-01-01T01:15:00'))).toBe('2026-12-31')
  })
  it('el bug de septiembre sigue cubierto: 00:36 UTC es todavía 21:36 del día anterior en BA', () => {
    expect(fechaDeRueda(new Date('2026-11-18T00:36:00Z'))).toBe('2026-11-17')
  })
})

describe('restarDias', () => {
  it('cruza mes, año y bisiesto', () => {
    expect(restarDias('2026-11-20', 6)).toBe('2026-11-14')
    expect(restarDias('2027-01-03', 7)).toBe('2026-12-27')
    expect(restarDias('2028-03-01', 1)).toBe('2028-02-29')
  })
})

describe('diasConLotesFaltantes', () => {
  it('cero lotes y residuo de 1 cabeza son faltantes; un día sano no', () => {
    const r = diasConLotesFaltantes(
      [
        { date: '2026-11-18', head_count: 3985 },
        { date: '2026-11-17', head_count: 10286 },
        { date: '2026-11-13', head_count: 5331 },
      ],
      { '2026-11-18': 1, '2026-11-13': 2043 },
    )
    expect(r).toEqual([
      { date: '2026-11-17', inmag_cabezas: 10286, lotes_cabezas: 0 },
      { date: '2026-11-18', inmag_cabezas: 3985, lotes_cabezas: 1 },
    ])
  })
  it('el mínimo sano medido (25%, 09/10) no dispara', () => {
    expect(diasConLotesFaltantes([{ date: '2026-10-09', head_count: 1392 }], { '2026-10-09': 352 })).toEqual([])
  })
  it('sin INMAG con cabezas no hay nada que curar', () => {
    expect(diasConLotesFaltantes([{ date: '2026-11-16', head_count: 0 }, { date: '2026-11-15', head_count: null }], {})).toEqual([])
  })
})
