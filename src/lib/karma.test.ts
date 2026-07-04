import { describe, it, expect } from 'vitest'
import { computeKarma } from './karma'

describe('computeKarma', () => {
  it('usuario nuevo sin nada = Novato, score 0', () => {
    const k = computeKarma({ cabezas: 0, attended: 0, following: 0, tenureMonths: 0 })
    expect(k.score).toBe(0)
    expect(k.level).toBe('Novato')
  })

  it('suma hacienda (1 pt cada 5 cabezas, tope 200)', () => {
    expect(computeKarma({ cabezas: 100, attended: 0, following: 0, tenureMonths: 0 }).breakdown.hacienda).toBe(20)
    expect(computeKarma({ cabezas: 5000, attended: 0, following: 0, tenureMonths: 0 }).breakdown.hacienda).toBe(200)
  })

  it('suma engagement (attended*15 + following*5, tope 150)', () => {
    expect(computeKarma({ cabezas: 0, attended: 2, following: 3, tenureMonths: 0 }).breakdown.engagement).toBe(45)
    expect(computeKarma({ cabezas: 0, attended: 20, following: 0, tenureMonths: 0 }).breakdown.engagement).toBe(150)
  })

  it('sube de nivel según el score total', () => {
    // 200 (hacienda tope) + 150 (engagement tope) = 350 → Referente
    const k = computeKarma({ cabezas: 5000, attended: 20, following: 0, tenureMonths: 0 })
    expect(k.score).toBe(350)
    expect(k.level).toBe('Referente')
    expect(k.nextLevel).toBeNull()
  })

  it('calcula lo que falta para el próximo nivel', () => {
    const k = computeKarma({ cabezas: 100, attended: 0, following: 0, tenureMonths: 0 }) // score 20 → Novato
    expect(k.nextLevel).toBe('Productor')
    expect(k.toNext).toBe(30) // 50 - 20
  })
})
