import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createConsignatariaSubscriptionLink } from '@/lib/rebill'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
})

/**
 * POST /api/consignataria/checkout-public  { slug, email }
 *
 * Email-first PRO Consignataria checkout — the money path for a firm's first peso.
 * Mirrors /api/subscribe/checkout-public, but PRO Consignataria activates by
 * entitySlug (webhook Branch 2), not by userId, so no server-side auth user is
 * created. Flow: validate the slug is a real canonical firm → create the recurring
 * Rebill link bound to the entity → return its checkout URL. On payment, the webhook
 * upserts subscriptions(active) → getEntityTier() returns 'pro' → the firm's public
 * profile shows the PRO badge immediately (redirect lands on the profile).
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`consignataria-checkout:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá en un minuto.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  // Validate against the canonical firm list — never create a payment link for a
  // slug that isn't a real consignataria (a bad slug → orphaned charge).
  const canonical = getCanonicalSlug(parsed.data.slug.trim())
  if (!canonical || !getProfile(canonical)) {
    return NextResponse.json({ error: 'Consignataria no encontrada.' }, { status: 404 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  try {
    const link = await createConsignatariaSubscriptionLink(canonical, email)
    if (!link?.url) {
      return NextResponse.json({ error: 'Rebill devolvió un link inválido.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, checkoutUrl: link.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[consignataria-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
