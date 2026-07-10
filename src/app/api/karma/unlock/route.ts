import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import {
  KARMA,
  getKarmaBalance,
  hasUnlock,
  unlockWithKarma,
  type KarmaUnlock,
} from '@/lib/karma-ledger'
import { syncUserReputation } from '@/lib/karma-reputation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Gasto de coins para desbloquear una función (Fase 3 del gating/karma).
 *  GET  ?unlock=<key> → estado { loggedIn, unlocked, balance, cost }
 *  POST { unlock }    → gasta los coins y desbloquea; 402 si el saldo no alcanza.
 *
 * El productor NO paga plata: gasta coins que ganó usando la app. El costo lo
 * define el server (KARMA.unlockCost), nunca el cliente.
 */

function isUnlock(x: unknown): x is KarmaUnlock {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(KARMA.unlockCost, x)
}

async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const sb = await createServerSupabase()
    const {
      data: { user },
    } = await sb.auth.getUser()
    return user ? { id: user.id, email: user.email ?? null } : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const unlock = req.nextUrl.searchParams.get('unlock')
  if (!isUnlock(unlock)) {
    return NextResponse.json({ error: 'unknown unlock' }, { status: 400 })
  }
  const user = await currentUser()
  const cost = KARMA.unlockCost[unlock]
  if (!user) {
    return NextResponse.json({ loggedIn: false, unlocked: false, balance: 0, cost })
  }
  // Sincroniza la reputación al ledger → el saldo mostrado está COMPLETO aunque el
  // usuario no haya pasado por /cuenta.
  const [unlocked, { coins }] = await Promise.all([
    hasUnlock(user.id, unlock),
    syncUserReputation(user.id, user.email),
  ])
  return NextResponse.json({ loggedIn: true, unlocked, balance: coins, cost })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const unlock = (body as { unlock?: unknown }).unlock
  if (!isUnlock(unlock)) {
    return NextResponse.json({ error: 'unknown unlock' }, { status: 400 })
  }
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'auth' }, { status: 401 })
  }
  const cost = KARMA.unlockCost[unlock]

  // Sincroniza la reputación al ledger ANTES de gastar → el saldo está completo.
  await syncUserReputation(user.id, user.email)

  // Idempotente: si ya está desbloqueado, no re-cobra.
  if (await hasUnlock(user.id, unlock)) {
    return NextResponse.json({ ok: true, already: true, balance: await getKarmaBalance(user.id), cost })
  }

  const newBalance = await unlockWithKarma(user.id, unlock, `${user.id}:${Date.now()}`)
  if (newBalance === null) {
    return NextResponse.json(
      { error: 'insufficient', balance: await getKarmaBalance(user.id), cost },
      { status: 402 },
    )
  }
  return NextResponse.json({ ok: true, balance: newBalance, cost })
}
