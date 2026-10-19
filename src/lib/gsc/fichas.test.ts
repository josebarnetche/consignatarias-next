import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  agregarPorFicha,
  consultasDeRemate,
  crearSlugDePath,
  PROVINCIAS_DIRECTORIO,
  TOP_CONSULTAS,
  ventanaGsc,
  type FilaGsc,
} from './fichas'

const SITIO = 'https://www.consignatarias.com.ar'
// Variantes como en consignataria-slugs.ts: reggi-y-cia → reggi.
const CANON: Record<string, string> = { reggi: 'reggi', 'reggi-y-cia': 'reggi', lalor: 'lalor' }
const slugDePath = crearSlugDePath((raw) => CANON[raw] ?? null)

const fila = (page: string, query: string | null, impressions: number, clicks: number, position: number): FilaGsc => ({
  keys: query === null ? [`${SITIO}${page}`] : [`${SITIO}${page}`, query],
  impressions,
  clicks,
  position,
})

describe('crearSlugDePath', () => {
  it('resuelve la ficha y sus variantes al slug canónico', () => {
    expect(slugDePath(`${SITIO}/consignatarias/reggi`)).toBe('reggi')
    expect(slugDePath(`${SITIO}/consignatarias/reggi-y-cia/`)).toBe('reggi')
    expect(slugDePath(`${SITIO}/consignatarias/Reggi`)).toBe('reggi')
  })

  it('las provincias del directorio, las subrutas y el índice no son una firma', () => {
    expect(slugDePath(`${SITIO}/consignatarias/buenos-aires`)).toBeNull()
    expect(slugDePath(`${SITIO}/consignatarias/corrientes`)).toBeNull()
    expect(slugDePath(`${SITIO}/consignatarias/reggi/activar`)).toBeNull()
    expect(slugDePath(`${SITIO}/consignatarias/activar`)).toBeNull()
    expect(slugDePath(`${SITIO}/consignatarias`)).toBeNull()
    expect(slugDePath(`${SITIO}/remates/consignatarias/x`)).toBeNull()
  })

  it('una firma no curada conserva su slug (su ficha se sintetiza desde los remates)', () => {
    expect(slugDePath(`${SITIO}/consignatarias/firma-nueva`)).toBe('firma-nueva')
  })

  it('PROVINCIAS_DIRECTORIO sigue igual a las claves de PROVINCE_MAP', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/(terminal)/consignatarias/_views/ProvinceView.tsx'),
      'utf8',
    )
    const bloque = src.match(/export const PROVINCE_MAP[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    const claves = [...bloque.matchAll(/'([a-z-]+)'\s*:/g)].map((m) => m[1]).sort()
    expect(claves.length).toBeGreaterThan(0)
    expect([...PROVINCIAS_DIRECTORIO].sort()).toEqual(claves)
  })
})

describe('agregarPorFicha', () => {
  const consultas: FilaGsc[] = [
    fila('/consignatarias/reggi', 'reggi y cia', 1000, 10, 2),
    fila('/consignatarias/reggi-y-cia', 'reggi y cia', 491, 2, 4),
    fila('/consignatarias/reggi', 'remate reggi en vivo', 48, 1, 6),
    fila('/consignatarias/buenos-aires', 'consignatarias buenos aires', 900, 9, 5),
    fila('/consignatarias/lalor', 'lalor', 20, 0, 8),
  ]

  it('funde variantes, suma la misma consulta y pondera la posición por impresiones', () => {
    const r = agregarPorFicha(consultas, slugDePath)
    const reggi = r.get('reggi')!
    expect(reggi.consultas[0]).toEqual({ query: 'reggi y cia', impresiones: 1491, clics: 12, posicion: 2.7 })
    expect(reggi.consultas[1].query).toBe('remate reggi en vivo')
    // Sin filas por página, el total es la suma de las consultas.
    expect(reggi.impresiones).toBe(1539)
    expect(reggi.clics).toBe(13)
    expect(r.has('buenos-aires')).toBe(false)
    expect(r.get('lalor')!.impresiones).toBe(20)
  })

  it('con filas por página, el total sale de la página (Google oculta consultas raras)', () => {
    const paginas: FilaGsc[] = [
      fila('/consignatarias/reggi', null, 2500, 18, 3),
      fila('/consignatarias/reggi-y-cia', null, 562, 3, 5),
      fila('/consignatarias/buenos-aires', null, 5000, 50, 4),
    ]
    const r = agregarPorFicha(consultas, slugDePath, paginas)
    const reggi = r.get('reggi')!
    expect(reggi.impresiones).toBe(3062)
    expect(reggi.clics).toBe(21)
    expect(reggi.posicion).toBeCloseTo((2500 * 3 + 562 * 5) / 3062, 1)
    // Las consultas siguen siendo el detalle.
    expect(reggi.consultas).toHaveLength(2)
  })

  it(`corta en el top ${TOP_CONSULTAS} por impresiones`, () => {
    const muchas = Array.from({ length: 40 }, (_, i) => fila('/consignatarias/lalor', `consulta ${i}`, i + 1, 0, 5))
    const r = agregarPorFicha(muchas, slugDePath).get('lalor')!
    expect(r.consultas).toHaveLength(TOP_CONSULTAS)
    expect(r.consultas[0].impresiones).toBe(40)
  })
})

describe('consultasDeRemate', () => {
  it('detecta las búsquedas del remate en vivo / hoy, no las de nombre o CUIT', () => {
    const qs = ['reggi y cia', 'reggi y cia remate hoy en vivo', 'remate reggi en vivo', 'reggi y cia cuit', 'reggi vivo', 'remates hoy']
      .map((query) => ({ query, impresiones: 1, clics: 0, posicion: 1 }))
    expect(consultasDeRemate(qs).map((c) => c.query)).toEqual([
      'reggi y cia remate hoy en vivo',
      'remate reggi en vivo',
      'reggi vivo',
      'remates hoy',
    ])
  })
})

describe('ventanaGsc', () => {
  it('termina hoy − 3 y cubre exactamente N días', () => {
    expect(ventanaGsc(28, new Date('2026-10-17T15:00:00Z'))).toEqual({ desde: '2026-09-17', hasta: '2026-10-14' })
    expect(ventanaGsc(90, new Date('2026-10-17T15:00:00Z'))).toEqual({ desde: '2026-07-17', hasta: '2026-10-14' })
  })
})
