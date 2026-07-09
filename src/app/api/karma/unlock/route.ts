import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import {
  KARMA,
  getKarmaBalance,
  hasUnlock,
  unlockWithKarma,
  type KarmaUnlock,
} from '@/lib/karma-ledger'

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

async function currentUserId(): Promise<string | null> {
  try {
    const sb = await createServerSupabase()
    const {
      data: { user },
    } = await sb.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const unlock = req.nextUrl.searchParams.get('unlock')
  if (!isUnlock(unlock)) {
    return NextResponse.json({ error: 'unknown unlock' }, { status: 400 })
  }
  const userId = await currentUserId()
  const cost = KARMA.unlockCost[unlock]
  if (!userId) {
    return NextResponse.json({ loggedIn: false, unlocked: false, balance: 0, cost })
  }
  const [unlocked, balance] = await Promise.all([hasUnlock(userId, unlock), getKarmaBalance(userId)])
  return NextResponse.json({ loggedIn: true, unlocked, balance, cost })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const unlock = (body as { unlock?: unknown }).unlock
  if (!isUnlock(unlock)) {
    return NextResponse.json({ error: 'unknown unlock' }, { status: 400 })
  }
  const userId = await currentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'auth' }, { status: 401 })
  }
  const cost = KARMA.unlockCost[unlock]

  // Idempotente: si ya está desbloqueado, no re-cobra.
  if (await hasUnlock(userId, unlock)) {
    return NextResponse.json({ ok: true, already: true, balance: await getKarmaBalance(userId), cost })
  }

  const newBalance = await unlockWithKarma(userId, unlock, `${userId}:${Date.now()}`)
  if (newBalance === null) {
    return NextResponse.json(
      { error: 'insufficient', balance: await getKarmaBalance(userId), cost },
      { status: 402 },
    )
  }
  return NextResponse.json({ ok: true, balance: newBalance, cost })
}
