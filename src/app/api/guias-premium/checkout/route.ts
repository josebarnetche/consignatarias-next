import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createGuiaPurchaseLink } from '@/lib/rebill'
import { getGuiaPremium } from '@/lib/guias-premium'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  // Datos de facturación. Opcionales: el que compra a título personal no los
  // carga. Si vienen, la factura A la emite Memola Medios SAS y estos datos
  // viajan en la metadata de Rebill → `guia_purchases.meta` → backoffice.
  razonSocial: z.string().trim().max(200).optional(),
  cuit: z.string().trim().max(20).optional(),
})

/**
 * POST /api/guias-premium/checkout  { slug, email }
 *
 * Checkout email-first de una guía paga. No exige cuenta: el email ES la llave
 * del entitlement (ver `guia_purchases`), igual que en PRO Consignataria. El
 * precio y el título los pone el servidor desde el catálogo — nunca el cliente.
 *
 * Si ese email ya compró la guía, no se cobra de nuevo: se devuelve
 * `alreadyOwned` y el front lo manda a descargarla.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`guia-checkout:${getClientId(req)}`)
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

  const guia = getGuiaPremium(parsed.data.slug.trim())
  if (!guia) {
    return NextResponse.json({ error: 'Guía no encontrada.' }, { status: 404 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  // Ya la compró → no la cobramos dos veces.
  try {
    const service = requireServiceClient()
    const { data: existing } = await service
      .from('guia_purchases')
      .select('id')
      .eq('guia_slug', guia.slug)
      .eq('email', email)
      .eq('status', 'paid')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyOwned: true,
        downloadUrl: `/api/guias-premium/${guia.slug}/download`,
      })
    }
  } catch (err) {
    // Si la verificación falla no bloqueamos la venta: peor caso, el comprador
    // recompra y el upsert del webhook no duplica el entitlement.
    console.error('[guia-checkout] chequeo de compra previa falló:', err)
  }

  try {
    const link = await createGuiaPurchaseLink({
      guiaSlug: guia.slug,
      title: guia.title,
      amountArs: guia.priceArs,
      customerEmail: email,
      razonSocial: parsed.data.razonSocial || undefined,
      cuit: parsed.data.cuit ? parsed.data.cuit.replace(/[^0-9]/g, '') : undefined,
    })
    if (!link?.url) {
      return NextResponse.json({ error: 'Rebill devolvió un link inválido.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, checkoutUrl: link.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[guia-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
