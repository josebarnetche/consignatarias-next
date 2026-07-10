/**
 * Karma del productor — reputación del usuario free como contribuidor de dato.
 *
 * Entradas (todas son "valor aportado", no dinero):
 *  - cabezas: hacienda cargada en Mi Ganado (rodeo real declarado).
 *  - attended: remates marcados como "estuve acá".
 *  - following: consignatarias que sigue.
 *  - tenureMonths: antigüedad de la cuenta.
 *  - alertaSemanal / newsletter: opt-ins de arranque (checklist de /cuenta).
 *
 * El componente ARRANQUE premia el checklist de activación: 20 pts por cada
 * uno de los 4 pasos (hacienda cargada, alerta semanal, resumen semanal,
 * primer remate marcado). Con 3 de 4 (60 pts) el usuario ya sale de Novato.
 *
 * Función PURA (sin DB) para ser testeable y reusable en server/cliente.
 */

export interface KarmaInput {
  cabezas: number
  attended: number
  following: number
  tenureMonths: number
  alertaSemanal?: boolean
  newsletter?: boolean
}

export interface KarmaBreakdown {
  arranque: number
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

/** Los 4 pasos del checklist de arranque, como booleanos. */
export function arranqueItems(i: KarmaInput): boolean[] {
  return [
    (i.cabezas || 0) > 0,                                // cargó hacienda
    !!i.alertaSemanal,                                   // aviso semanal de valor
    !!i.newsletter,                                      // resumen semanal
    (i.attended || 0) + (i.following || 0) > 0,          // marcó remates / sigue
  ]
}

export function computeKarma(i: KarmaInput): Karma {
  const arranque = arranqueItems(i).filter(Boolean).length * 20
  const hacienda = Math.min(Math.round((i.cabezas || 0) / 5), 200) // 1 pt cada 5 cabezas, tope 200
  const engagement = Math.min((i.attended || 0) * 15 + (i.following || 0) * 5, 150)
  const tenure = Math.min(Math.round((i.tenureMonths || 0) * 4), 60) // redondeado: sin decimales
  const score = arranque + hacienda + engagement + tenure

  const lvl = levelForScore(score)
  return {
    score,
    level: lvl.level,
    levelIndex: lvl.levelIndex,
    nextLevel: lvl.nextLevel,
    toNext: lvl.toNext,
    breakdown: { arranque, hacienda, engagement, tenure },
  }
}

/** Nivel para un puntaje/saldo dado. Reusado por el karma-reputación y por el
 *  saldo unificado de coins (el nivel deriva del número que se muestra). */
export function levelForScore(score: number): {
  level: string
  levelIndex: number
  nextLevel: string | null
  toNext: number
} {
  const n = Math.round(score)
  let levelIndex = 0
  for (let k = KARMA_LEVELS.length - 1; k >= 0; k--) {
    if (n >= KARMA_LEVELS[k].min) {
      levelIndex = k
      break
    }
  }
  const next = KARMA_LEVELS[levelIndex + 1] ?? null
  return {
    level: KARMA_LEVELS[levelIndex].name,
    levelIndex,
    nextLevel: next ? next.name : null,
    toNext: next ? Math.max(0, next.min - n) : 0,
  }
}
