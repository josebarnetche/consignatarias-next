import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createProductoSubscriptionLink } from '@/lib/rebill'
import { getProducto } from '@/lib/productos-datos'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  razonSocial: z.string().trim().max(200).optional(),
  cuit: z.string().trim().max(20).optional(),
})

/**
 * POST /api/informes/suscribir  { slug, email }
 *
 * Alta de suscripción a un producto de datos. Email-first, igual que la compra única: no
 * exige cuenta, y el email es la llave del acceso.
 *
 * **El precio sale del catálogo, nunca del body.** Y el producto tiene que estar
 * `publicado`: uno retirado por el kill switch deja de aceptar altas sin que haya que
 * borrar la página.
 *
 * Si ya tiene una suscripción vigente, no se cobra de nuevo: se devuelve `alreadyOwned`.
 * Incluye el caso de la cancelada con período vigente — ahí volver a cobrar sería cobrar
 * dos veces el mismo mes.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`informe-suscribir:${getClientId(req)}`)
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
    return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })
  }
  if (producto.modalidad !== 'suscripcion') {
    return NextResponse.json(
      { error: 'Este producto se compra una sola vez y no se cobra por acá.' },
      { status: 400 },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()

  try {
    const service = requireServiceClient()
    const { data: existente } = await service
      .from('producto_subscriptions')
      .select('status, current_period_end')
      .eq('producto_slug', producto.slug)
      .eq('email', email)
      .in('status', ['active', 'cancelled'])
      .maybeSingle()

    const vigente =
      existente &&
      (existente.status === 'active' ||
        (existente.current_period_end && new Date(existente.current_period_end) > new Date()))

    if (vigente) {
      return NextResponse.json({ ok: true, alreadyOwned: true, downloadUrl: '/cuenta/informes' })
    }
  } catch (err) {
    // No bloquea el alta: en el peor caso el upsert del webhook contra el índice único
    // (producto, email) actualiza la fila existente en vez de duplicarla.
    console.error('[informe-suscribir] chequeo de suscripción previa falló:', err)
  }

  try {
    const link = await createProductoSubscriptionLink({
      productoSlug: producto.slug,
      title: producto.nombre,
      amountArs: producto.precio,
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
    console.error('[informe-suscribir]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
