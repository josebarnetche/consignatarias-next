import { describe, expect, it } from 'vitest'
import frigorificos from '@/lib/data/frigorificos.json'
import { formatCuit, getFichaFrigorifico } from '@/lib/frigorificos/ficha'
import {
  MAX_DESCRIPTION,
  MAX_TITLE,
  descripcionFicha,
  estadoSenasaCorto,
  razonSocialLegible,
  tituloFicha,
} from './metadata-ficha'

const basicos = frigorificos as { cuit: string; name: string }[]

describe('razonSocialLegible', () => {
  it('saca las mayúsculas del padrón y respeta las siglas societarias', () => {
    expect(razonSocialLegible('FRIGORIFICO REGIONAL GENERAL LAS HERAS S.A.')).toBe(
      'Frigorifico Regional General Las Heras S.A.',
    )
    expect(razonSocialLegible('COOPERATIVA DE TRABAJO SRL')).toBe('Cooperativa de Trabajo SRL')
  })
})

describe('tituloFicha', () => {
  it('con nombre corto lleva la forma completa', () => {
    expect(tituloFicha('GORINA S.A.', '30-50012088-2', 'Gorina')).toBe(
      'Gorina S.A. · CUIT 30-50012088-2 · Frigorífico SENASA en Gorina',
    )
  })

  it('achica la cola antes de recortar el nombre', () => {
    const t = tituloFicha('FRIGORIFICO REGIONAL GENERAL LAS HERAS S.A.', '30-59731858-4', 'General Las Heras')
    expect(t).toBe('Frigorifico Regional General Las… · CUIT 30-59731858-4 · SENASA')
  })

  it('ninguna ficha del directorio pasa de MAX_TITLE y todas llevan razón social y CUIT', () => {
    for (const f of basicos) {
      const ficha = getFichaFrigorifico(f.cuit)!
      const t = tituloFicha(f.name, formatCuit(f.cuit), ficha.localidad || ficha.provinciaDisplay)
      expect(t.length).toBeLessThanOrEqual(MAX_TITLE)
      expect(t).toContain(`CUIT ${formatCuit(f.cuit)}`)
      expect(t.toLowerCase().startsWith(razonSocialLegible(f.name).slice(0, 10).toLowerCase())).toBe(true)
    }
  })
})

describe('descripcionFicha', () => {
  it('arranca con el estado SENASA y nunca pasa de MAX_DESCRIPTION', () => {
    for (const f of basicos) {
      const ficha = getFichaFrigorifico(f.cuit)!
      const d = descripcionFicha(`${estadoSenasaCorto(ficha)} · ${ficha.lugar}`, [
        `${f.name}, CUIT ${ficha.cuitFormateado}`,
        'Datos oficiales SENASA/MAGYP',
      ])
      expect(d.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
      expect(d.startsWith(ficha.senasa.vigente ? 'Habilitación SENASA vigente' : 'No figura en el padrón SENASA')).toBe(true)
    }
  })

  it('recorta la base si sola no entra', () => {
    const d = descripcionFicha('x'.repeat(300), ['extra'])
    expect(d.length).toBe(MAX_DESCRIPTION)
    expect(d.endsWith('….')).toBe(true)
  })
})
