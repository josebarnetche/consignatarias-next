import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { computeKarma, levelForScore } from '@/lib/karma'
import { syncReputationAndBalance } from '@/lib/karma-ledger'
import { getReputationInputs } from '@/lib/karma-reputation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/karma — karma del productor logueado, unificado en un SALDO de coins.
 * La reputación (hacienda cargada + marcas + antigüedad + opt-ins) se sincroniza al
 * ledger; la actividad in-app suma coins encima. Sin sesión → { loggedIn: false }.
 */
export async function GET() {
  const { user } = await getCurrentSession()
  if (!user) return NextResponse.json({ loggedIn: false })

  const inputs = await getReputationInputs(user.id, user.email)
  const rep = computeKarma(inputs)
  // Unificación (Fase 2): el número que ve el usuario = SALDO de coins (ledger).
  const { coins, reputation } = await syncReputationAndBalance(user.id, rep.score)
  const lvl = levelForScore(coins)
  const actividad = Math.max(0, coins - reputation)

  return NextResponse.json({
    loggedIn: true,
    score: coins, // UNIFICADO — el saldo de coins ES el karma (entero)
    coins,
    level: lvl.level,
    levelIndex: lvl.levelIndex,
    nextLevel: lvl.nextLevel,
    toNext: lvl.toNext,
    breakdown: { ...rep.breakdown, actividad },
    inputs: { cabezas: inputs.cabezas, attended: inputs.attended, following: inputs.following },
    checklist: {
      hacienda: inputs.cabezas > 0,
      alerta: inputs.alertaSemanal,
      newsletter: inputs.newsletter,
      marcas: inputs.attended + inputs.following > 0,
    },
  })
}
