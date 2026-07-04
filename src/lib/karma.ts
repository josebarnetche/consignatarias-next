/**
 * Karma del productor — reputación del usuario free como contribuidor de dato.
 *
 * Entradas (todas son "valor aportado", no dinero):
 *  - cabezas: hacienda cargada en Mi Ganado (rodeo real declarado).
 *  - attended: remates marcados como "estuve acá".
 *  - following: consignatarias que sigue.
 *  - tenureMonths: antigüedad de la cuenta.
 *
 * Función PURA (sin DB) para ser testeable y reusable en server/cliente.
 */

export interface KarmaInput {
  cabezas: number
  attended: number
  following: number
  tenureMonths: number
}

export interface KarmaBreakdown {
  hacienda: number
  engagement: number
  tenure: number
}

export interface Karma {
  score: number
  level: string
  levelIndex: number
  nextLevel: string | null
  toNext: number
  breakdown: KarmaBreakdown
}

export const KARMA_LEVELS: Array<{ min: number; name: string }> = [
  { min: 0, name: 'Novato' },
  { min: 50, name: 'Productor' },
  { min: 150, name: 'Baqueano' },
  { min: 350, name: 'Referente' },
]

export function computeKarma(i: KarmaInput): Karma {
  const hacienda = Math.min(Math.round((i.cabezas || 0) / 5), 200) // 1 pt cada 5 cabezas, tope 200
  const engagement = Math.min((i.attended || 0) * 15 + (i.following || 0) * 5, 150)
  const tenure = Math.min((i.tenureMonths || 0) * 4, 60)
  const score = hacienda + engagement + tenure

  let levelIndex = 0
  for (let k = KARMA_LEVELS.length - 1; k >= 0; k--) {
    if (score >= KARMA_LEVELS[k].min) {
      levelIndex = k
      break
    }
  }
  const next = KARMA_LEVELS[levelIndex + 1] ?? null
  return {
    score,
    level: KARMA_LEVELS[levelIndex].name,
    levelIndex,
    nextLevel: next ? next.name : null,
    toNext: next ? Math.max(0, next.min - score) : 0,
    breakdown: { hacienda, engagement, tenure },
  }
}
