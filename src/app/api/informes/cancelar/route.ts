import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getProducto } from '@/lib/productos-datos'
import { cancelarSuscripcionRebill } from '@/lib/rebill'
import { sendBajaSinConfirmar } from '@/lib/email'

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
 * Y **da de baja el débito en Rebill**, verificando el efecto: no alcanza con que la API
 * acepte el PATCH, hay que confirmar por GET que la suscripción dejó de estar activa. Si
 * no se puede confirmar, la baja de nuestro lado queda igual —el usuario pidió irse y se
 * va— pero se marca como pendiente y se avisa por mail, porque ahí hay alguien a quien le
 * pueden seguir cobrando.
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

  // 1) Se corta el débito en Rebill ANTES de marcar nada nuestro. Si se hiciera al revés
  //    y el proceso muriera en el medio, quedaría una baja registrada con el cobro vivo.
  let baja = {
    ok: false,
    verificada: false,
    detalle: 'Sin rebill_subscription_id: la suscripción se otorgó a mano.',
    estadoFinal: null as string | null,
    intento: null as string | null,
  }
  if (sub.rebill_subscription_id) {
    try {
      baja = await cancelarSuscripcionRebill(sub.rebill_subscription_id)
    } catch (err) {
      baja = {
        ...baja,
        detalle: err instanceof Error ? err.message : 'Error al llamar a Rebill',
      }
    }
  }

  // 2) La baja de nuestro lado se registra SIEMPRE. El usuario pidió irse: se va. Que el
  //    débito haya quedado o no es un problema nuestro, no suyo.
  const { error: updErr } = await service
    .from('producto_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: {
        baja_rebill: {
          verificada: baja.verificada,
          estado_final: baja.estadoFinal,
          intento: baja.intento,
          detalle: baja.detalle,
          at: new Date().toISOString(),
        },
      },
    })
    .eq('id', sub.id)

  if (updErr) {
    console.error('[informe-cancelar] update falló:', updErr.message)
    return NextResponse.json({ error: 'No pudimos procesar la baja.' }, { status: 500 })
  }

  // 3) Si NO se pudo confirmar que el débito se cortó, hay alguien a quien le pueden
  //    seguir cobrando. Eso no puede quedar en un console.warn que nadie lee.
  if (!baja.verificada) {
    console.error(
      `[informe-cancelar] DEBITO SIN CONFIRMAR — producto=${producto.slug} email=${email} sub=${sub.rebill_subscription_id ?? 'sin id'} · ${baja.detalle}`,
    )
    try {
      await sendBajaSinConfirmar({
        producto: producto.nombre,
        email,
        rebillSubscriptionId: sub.rebill_subscription_id,
        detalle: baja.detalle,
      })
    } catch (err) {
      console.error('[informe-cancelar] no se pudo avisar de la baja pendiente:', err)
    }
  }

  return NextResponse.json({
    ok: true,
    vigenteHasta: sub.current_period_end,
    debitoCortado: baja.verificada,
  })
}
