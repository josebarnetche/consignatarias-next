import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { getActivationStatus } from '@/lib/dal/activation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/activation
 *
 * Estado de activación del usuario para el checklist gamificado de DT-e.
 * Server-side + service_role a propósito: las señales viven en tablas con RLS que
 * el client anon del browser no puede leer. La lógica vive en el DAL
 * `getActivationStatus` (fuente única), no ad-hoc acá.
 *
 * Historia: el componente `ActivationChecklist` consultaba `alerts`/`saved_remates`
 * (tablas inexistentes) con el client anon → fallaba en silencio. Este endpoint lo
 * resuelve; y si la query de datos falla, devuelve **500 explícito**, NO un
 * `false` que parezca válido.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  try {
    const status = await getActivationStatus(auth.userId!)
    return NextResponse.json(status)
  } catch (err) {
    console.error('[api/me/activation] lookup failed:', err)
    return NextResponse.json({ error: 'activation_lookup_failed' }, { status: 500 })
  }
}
