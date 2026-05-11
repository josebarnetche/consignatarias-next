import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createUserSubscriptionLink } from '@/lib/rebill'

export const dynamic = 'force-dynamic'

/**
 * POST /api/subscribe/checkout
 *
 * Crea un payment link en Rebill para el usuario logueado actual.
 * Retorna la URL del checkout; el frontend redirige al user a esa URL.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión primero.' },
        { status: 401 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'Tu cuenta no tiene email asociado. Contactanos.' },
        { status: 400 }
      )
    }

    const link = await createUserSubscriptionLink(user.id, user.email)

    if (!link?.url) {
      return NextResponse.json(
        { error: 'Rebill devolvió un payment link inválido.', detail: link },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: link.url,
      paymentLinkId: link.id,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[subscribe/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
