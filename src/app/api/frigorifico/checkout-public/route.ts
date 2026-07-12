import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createFrigorificoSubscriptionLink } from '@/lib/rebill'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'
import frigorificosData from '@/lib/data/frigorificos.json'

export const dynamic = 'force-dynamic'

const frigos = frigorificosData as Array<{ cuit: string }>

const schema = z.object({
  cuit: z.string().min(1),
  email: z.string().email(),
})

/**
 * POST /api/frigorifico/checkout-public  { cuit, email }
 *
 * Checkout email-first de PRO Frigorífico (espeja el de consignataria). Activa por
 * entitySlug=cuit (webhook Branch 2, entity_type='frigorifico'), sin crear usuario
 * server-side. Al pagar, el webhook prende featured → la vitrina de carna + RFQ se
 * habilitan y el redirect cae en el perfil.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`frigorifico-checkout:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const cuit = parsed.data.cuit.trim()
  if (!frigos.some(f => f.cuit === cuit)) {
    return NextResponse.json({ error: 'Frigorífico no encontrado.' }, { status: 404 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  try {
    const link = await createFrigorificoSubscriptionLink(cuit, email)
    if (!link?.url) {
      return NextResponse.json({ error: 'Rebill devolvió un link inválido.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, checkoutUrl: link.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[frigorifico-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
