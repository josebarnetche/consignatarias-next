import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import remates from './data/remates.json'
import { rematesDesdeHoy, rematesDeHoy, esProximo } from './remates-conteo'

/**
 * Los números que la home publica salieron mal dos veces por el mismo motivo: un
 * criterio escrito a mano en `page.tsx` y un archivo derivado que nadie derivaba.
 * Estos tests fijan las dos invariantes.
 */
describe('conteo de remates', () => {
  const hoy = '2026-09-30'

  it('los remates de hoy cuentan como próximos (el scraper los marca live)', () => {
    expect(esProximo({ date: hoy, status: 'live' }, hoy)).toBe(true)
    expect(esProximo({ date: hoy, status: 'scheduled' }, hoy)).toBe(true)
    expect(esProximo({ date: '2026-09-29', status: 'live' }, hoy)).toBe(false)
    expect(esProximo({ date: hoy, status: 'completed' }, hoy)).toBe(false)
  })

  it('nunca cuenta menos que los que están agendados a futuro', () => {
    const proximos = rematesDesdeHoy(remates as { date: string; status?: string }[], hoy)
    const soloScheduled = (remates as { date: string; status?: string }[]).filter(
      (r) => r.date >= hoy && r.status === 'scheduled',
    )
    expect(proximos.length).toBeGreaterThanOrEqual(soloScheduled.length)
  })

  it('los de hoy son un subconjunto de los próximos', () => {
    const data = remates as { date: string; status?: string }[]
    const deHoy = rematesDeHoy(data, hoy).filter((r) => r.status !== 'completed')
    const proximos = new Set(rematesDesdeHoy(data, hoy))
    for (const r of deHoy) expect(proximos.has(r)).toBe(true)
  })
})

describe('frigorificos-summary.json', () => {
  it('es un derivado al día de frigorificos.json, no un archivo escrito a mano', () => {
    const summary = JSON.parse(readFileSync('src/lib/data/frigorificos-summary.json', 'utf-8'))
    const datos = JSON.parse(readFileSync('src/lib/data/frigorificos.json', 'utf-8')) as {
      senasaActive?: boolean
      province?: string
    }[]
    // El 30-sep decía 364 con 1.115 indexados: la home subdeclaraba dos tercios del
    // directorio. Se regenera con scripts/build-frigorificos-summary.mjs.
    expect(summary.total).toBe(datos.length)
    expect(summary.habilitados).toBe(datos.filter((f) => f.senasaActive === true).length)
    expect(summary.provincias).toBe(new Set(datos.map((f) => f.province).filter(Boolean)).size)
  })
})
