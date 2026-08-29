import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createInformePurchaseLink } from '@/lib/rebill'
import { getProducto } from '@/lib/productos-datos'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1),
  /** Coordenada del entregable dentro del producto: 'corrientes/mercedes', 'buenos-aires'. */
  variante: z.string().trim().max(120).optional(),
  varianteLabel: z.string().trim().max(160).optional(),
  email: z.string().email(),
  razonSocial: z.string().trim().max(200).optional(),
  cuit: z.string().trim().max(20).optional(),
})

/**
 * POST /api/informes/checkout  { slug, variante?, email }
 *
 * Checkout email-first de un informe de datos. No exige cuenta: el email ES la llave del
 * entitlement, igual que en las guías premium. **El precio y el título los pone el servidor
 * desde el catálogo, nunca el cliente** — si llegaran del body, cualquiera compraría a
 * cualquier precio.
 *
 * Si ese email ya compró esta variante, no se cobra de nuevo: se devuelve `alreadyOwned`.
 *
 * El producto tiene que estar `publicado` en el catálogo. Un producto retirado por el kill
 * switch deja de tener checkout sin que haya que borrar la página.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`informe-checkout:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const producto = getProducto(parsed.data.slug.trim())
  if (!producto || !producto.publicado) {
    return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })
  }
  if (producto.modalidad !== 'compra-unica') {
    return NextResponse.json(
      { error: 'Este producto es una suscripción y no se cobra por acá.' },
      { status: 400 },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const variante = parsed.data.variante || ''

  // Ya lo compró → no se le cobra dos veces.
  try {
    const service = requireServiceClient()
    const { data: existing } = await service
      .from('informe_purchases')
      .select('id')
      .eq('producto_slug', producto.slug)
      .eq('variante_slug', variante)
      .eq('email', email)
      .eq('status', 'paid')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, alreadyOwned: true, downloadUrl: '/cuenta/informes' })
    }
  } catch (err) {
    // No bloquea la venta: en el peor caso recompra, y el upsert del webhook contra el
    // índice único (producto, variante, email) no duplica el entitlement.
    console.error('[informe-checkout] chequeo de compra previa falló:', err)
  }

  try {
    const link = await createInformePurchaseLink({
      productoSlug: producto.slug,
      title: producto.nombre,
      amountArs: producto.precio,
      customerEmail: email,
      variante: variante || undefined,
      varianteLabel: parsed.data.varianteLabel || undefined,
      razonSocial: parsed.data.razonSocial || undefined,
      cuit: parsed.data.cuit ? parsed.data.cuit.replace(/[^0-9]/g, '') : undefined,
    })
    if (!link?.url) {
      return NextResponse.json({ error: 'Rebill devolvió un link inválido.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, checkoutUrl: link.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[informe-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
