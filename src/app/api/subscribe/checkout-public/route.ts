import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { createUserSubscriptionLink } from '@/lib/rebill'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })

/**
 * POST /api/subscribe/checkout-public  { email }
 *
 * Email-first PRO checkout — removes the login wall from the payment path (the
 * confirmed conversion bottleneck: $0 ever because paying required creating an
 * account first). Flow:
 *   1) Create OR recover the auth user SERVER-SIDE FIRST. The Rebill webhook
 *      activates PRO by `userId` (metadata) — so a payment link MUST be bound to a
 *      real user. Never create the link before the user exists, or we'd charge a
 *      card and grant nothing (the userId contract is sacred).
 *   2) Only then create the Rebill payment link → return its checkout URL.
 * Post-payment, the user logs in with the same email via the normal magic-link
 * flow (same email → same user → PRO already active by userId).
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`checkout-public:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  try {
    const admin = createAdminClient()

    // 1) Create or recover the user. No userId → no link → no charge.
    let userId: string | null = null
    // email_confirm:false — do NOT pre-confirm. This endpoint is
    // unauthenticated and takes an arbitrary email; confirming it here let an
    // attacker squat any victim's address. The user confirms naturally via the
    // post-payment magic-link login (same email → same user → PRO already active).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
    })
    if (created?.user?.id) {
      userId = created.user.id
    } else {
      // Already registered (or create failed) → recover the existing user by email.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email)
      if (existing) {
        userId = existing.id
      } else {
        console.error('[checkout-public] no se pudo crear/encontrar el usuario:', createErr?.message)
        return NextResponse.json(
          { error: 'No pudimos crear tu cuenta. Probá de nuevo.' },
          { status: 500 }
        )
      }
    }

    // 2) Now (and only now) create the payment link bound to this userId.
    const link = await createUserSubscriptionLink(userId, email)
    if (!link?.url) {
      return NextResponse.json({ error: 'Rebill devolvió un link inválido.' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, checkoutUrl: link.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[checkout-public]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
