import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { createEnterpriseStarterLink } from '@/lib/rebill'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })

/**
 * POST /api/enterprise/checkout-public  { email }
 *
 * Email-first Enterprise Starter checkout — removes the login wall for cold/anonymous
 * traffic (same fix as the B2C /api/subscribe/checkout-public). Creates OR recovers the
 * auth user SERVER-SIDE FIRST (the Rebill webhook activates by userId), then returns the
 * Starter checkout URL. Post-payment the buyer logs in with the same email (magic-link).
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`ent-checkout-public:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ message: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Email inválido.' }, { status: 400 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  try {
    const admin = createAdminClient()

    // Create or recover the user first. No userId → no link → no charge.
    // email_confirm:false — unauthenticated endpoint with an arbitrary email;
    // pre-confirming let an attacker squat any victim's address. The user
    // confirms via the post-payment magic-link login.
    let userId: string | null = null
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
    })
    if (created?.user?.id) {
      userId = created.user.id
    } else {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email)
      if (existing) {
        userId = existing.id
      } else {
        console.error('[enterprise/checkout-public] no se pudo crear/encontrar usuario:', createErr?.message)
        return NextResponse.json({ message: 'No pudimos crear tu cuenta. Probá de nuevo.' }, { status: 500 })
      }
    }

    const link = await createEnterpriseStarterLink(userId, email)
    const checkoutUrl = (link?.shortUrl as string) || (link?.url as string) || null
    if (!checkoutUrl) {
      return NextResponse.json({ message: 'Rebill no devolvió URL. Probá de nuevo.' }, { status: 502 })
    }
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('[enterprise/checkout-public]', err)
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Error generando link de pago.' },
      { status: 500 },
    )
  }
}
