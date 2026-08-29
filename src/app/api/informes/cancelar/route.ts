import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getProducto } from '@/lib/productos-datos'

export const dynamic = 'force-dynamic'

const schema = z.object({ slug: z.string().min(1) })

/**
 * POST /api/informes/cancelar  { slug }
 *
 * Cancela la suscripción del usuario logueado a un producto de datos.
 *
 * Le prometemos "lo cancelás cuando quieras, sin llamar a nadie", así que esto tiene que
 * funcionar sin intervención. Se exige sesión: la cancelación es una acción sobre la
 * cuenta, no algo que se pueda disparar sabiendo el mail de otro.
 *
 * **No corta el acceso.** Marca `status='cancelled'` y deja `current_period_end` intacto:
 * el mes está pagado y se honra hasta el final (ver `src/lib/informes/acceso.ts`).
 *
 * ⚠️ Esto cancela de NUESTRO lado. La baja del débito en Rebill se hace desde su panel
 * mientras no exista el endpoint de cancelación en la integración — hasta entonces, una
 * cancelación acá sin la baja allá sigue cobrando. Por eso el aviso queda registrado en
 * `meta` y sale por consola: es una cola que alguien tiene que atender.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const producto = getProducto(parsed.data.slug.trim())
  if (!producto) {
    return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user?.email) {
    return NextResponse.json({ error: 'Iniciá sesión para cancelar.' }, { status: 401 })
  }
  const email = user.email.trim().toLowerCase()

  const service = requireServiceClient()
  const { data: sub, error } = await service
    .from('producto_subscriptions')
    .select('id, status, current_period_end, rebill_subscription_id')
    .eq('producto_slug', producto.slug)
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('[informe-cancelar] lookup falló:', error.message)
    return NextResponse.json({ error: 'No pudimos procesar la baja.' }, { status: 500 })
  }
  if (!sub) {
    return NextResponse.json({ error: 'No encontramos una suscripción con este mail.' }, { status: 404 })
  }
  if (sub.status === 'cancelled') {
    return NextResponse.json({ ok: true, yaCancelada: true, vigenteHasta: sub.current_period_end })
  }

  const { error: updErr } = await service
    .from('producto_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  if (updErr) {
    console.error('[informe-cancelar] update falló:', updErr.message)
    return NextResponse.json({ error: 'No pudimos procesar la baja.' }, { status: 500 })
  }

  // La baja del débito en Rebill todavía es manual. Que quede ruidoso a propósito.
  console.warn(
    `[informe-cancelar] BAJA PENDIENTE EN REBILL — producto=${producto.slug} email=${email} rebill_subscription_id=${sub.rebill_subscription_id ?? 'sin id'}`,
  )

  return NextResponse.json({ ok: true, vigenteHasta: sub.current_period_end })
}
