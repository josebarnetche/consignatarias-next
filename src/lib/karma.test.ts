import { describe, it, expect } from 'vitest'
import { computeKarma } from './karma'

describe('computeKarma', () => {
  it('usuario nuevo sin nada = Novato, score 0', () => {
    const k = computeKarma({ cabezas: 0, attended: 0, following: 0, tenureMonths: 0 })
    expect(k.score).toBe(0)
    expect(k.level).toBe('Novato')
  })

  it('suma hacienda (1 pt cada 5 cabezas, tope 200) + 20 de arranque por cargar', () => {
    const k100 = computeKarma({ cabezas: 100, attended: 0, following: 0, tenureMonths: 0 })
    expect(k100.breakdown.hacienda).toBe(20)
    expect(k100.breakdown.arranque).toBe(20)
    expect(computeKarma({ cabezas: 5000, attended: 0, following: 0, tenureMonths: 0 }).breakdown.hacienda).toBe(200)
  })

  it('suma engagement (attended*15 + following*5, tope 150)', () => {
    expect(computeKarma({ cabezas: 0, attended: 2, following: 3, tenureMonths: 0 }).breakdown.engagement).toBe(45)
    expect(computeKarma({ cabezas: 0, attended: 20, following: 0, tenureMonths: 0 }).breakdown.engagement).toBe(150)
  })

  it('arranque: 20 pts por paso del checklist (hacienda, alerta, newsletter, marcas)', () => {
    const k = computeKarma({
      cabezas: 10, attended: 0, following: 1, tenureMonths: 0,
      alertaSemanal: true, newsletter: true,
    })
    expect(k.breakdown.arranque).toBe(80)
  })

  it('3 de 4 pasos del checklist ya sale de Novato (>=50 -> Productor)', () => {
    // alerta + newsletter + primer follow — sin hacienda cargada
    const k = computeKarma({
      cabezas: 0, attended: 0, following: 1, tenureMonths: 0,
      alertaSemanal: true, newsletter: true,
    })
    expect(k.breakdown.arranque).toBe(60)
    expect(k.score).toBeGreaterThanOrEqual(50)
    expect(k.level).toBe('Productor')
  })

  it('sube de nivel según el score total', () => {
    // 200 (hacienda tope) + 150 (engagement tope) + 40 arranque = 390 -> Referente
    const k = computeKarma({ cabezas: 5000, attended: 20, following: 0, tenureMonths: 0 })
    expect(k.score).toBe(390)
    expect(k.level).toBe('Referente')
    expect(k.nextLevel).toBeNull()
  })

  it('calcula lo que falta para el próximo nivel', () => {
    // hacienda 100 cab -> 20 pts + 20 arranque = 40 -> Novato, faltan 10
    const k = computeKarma({ cabezas: 100, attended: 0, following: 0, tenureMonths: 0 })
    expect(k.level).toBe('Novato')
    expect(k.nextLevel).toBe('Productor')
    expect(k.toNext).toBe(10)
  })
})
