import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  EXPO,
  REMATES_EXPO,
  plazasPorConcentracion,
  posicionNacional,
  expoVigente,
  esMercedesCorrientes,
} from './expo-mercedes'

describe('la rueda de remates de la Expo de Mercedes', () => {
  it('tiene los siete remates del cronograma, en orden y sin fechas repetidas', () => {
    expect(REMATES_EXPO).toHaveLength(7)
    const fechas = REMATES_EXPO.map((r) => r.fecha)
    expect([...fechas].sort()).toEqual(fechas)
    expect(new Set(fechas).size).toBe(7)
  })

  it('rodea la muestra: abre antes de que entren los animales y cierra después', () => {
    expect(REMATES_EXPO[0].fecha < EXPO.muestraDesde).toBe(true)
    expect(REMATES_EXPO[REMATES_EXPO.length - 1].fecha > EXPO.muestraHasta).toBe(true)
  })

  it('cada slug apunta a una consignataria que existe de verdad en el directorio', () => {
    // Prometer un perfil que no está es un 404 en la cara del visitante — y acá los
    // enlaces son media razón de ser de la página.
    const slugs = readFileSync(join(process.cwd(), 'src/lib/data/consignataria-slugs.ts'), 'utf8')
    for (const r of REMATES_EXPO) {
      if (!r.slug) continue
      expect(slugs, `slug inexistente: ${r.slug} (${r.firma})`).toContain(`'${r.slug}'`)
    }
  })
})

describe('el dato que sostiene el destacado', () => {
  /**
   * La afirmación de la página es que, fuera de Palermo y Expoagro, no hay en el país
   * una plaza que junte tantas firmas en dos semanas. Si algún día deja de ser cierto,
   * estos tests fallan y el copy se corrige — en vez de quedar mintiendo por inercia.
   */
  const pos = posicionNacional()

  it('Mercedes junta seis firmas en siete remates', () => {
    expect(pos.firmas).toBe(6)
    expect(pos.remates).toBe(7)
  })

  it('sólo la superan las dos megamuestras nacionales', () => {
    expect(pos.puesto).toBe(3)
    expect(pos.porEncima).toHaveLength(2)

    const sedes = pos.porEncima.map((p) => p.sede.toLowerCase()).join(' | ')
    expect(sedes).toContain('capital federal') // Palermo
    expect(sedes).toContain('san nicolas') // Expoagro
  })

  it('la siguiente plaza del interior junta bastantes menos', () => {
    const siguiente = plazasPorConcentracion().find(
      (p) => p.firmas <= pos.firmas && !/mercedes/i.test(p.sede),
    )
    expect(siguiente).toBeDefined()
    expect(siguiente!.firmas).toBeLessThan(pos.firmas)
  })

  it('no se compara contra Mercedes misma', () => {
    // La base tiene cargados 4 de los 7: incluirla sería competir contra una versión
    // incompleta de sí misma y arruinar el número.
    expect(pos.porEncima.every((p) => !/mercedes/i.test(p.sede))).toBe(true)
  })
})

describe('el destacado se apaga solo', () => {
  it('está vigente durante la rueda', () => {
    expect(expoVigente(new Date('2026-09-01T12:00:00Z'))).toBe(true)
    expect(expoVigente(new Date('2026-09-17T12:00:00Z'))).toBe(true)
  })

  it('se apaga el día después del último remate', () => {
    // Un evento vencido en la portada de remates envejece todo lo demás.
    expect(expoVigente(new Date('2026-09-18T12:00:00Z'))).toBe(false)
    expect(expoVigente(new Date('2026-12-01T12:00:00Z'))).toBe(false)
  })
})

describe('los tres Mercedes del calendario', () => {
  it('distingue Corrientes de Buenos Aires y de Villa Mercedes', () => {
    expect(esMercedesCorrientes('MERCEDES, CORRIENTES')).toBe(true)
    expect(esMercedesCorrientes('Mercedes, Corrientes')).toBe(true)
    expect(esMercedesCorrientes('Mercedes, BUENOS AIRES')).toBe(false)
    expect(esMercedesCorrientes('VILLA MERCEDES, SAN LUIS')).toBe(false)
  })
})
