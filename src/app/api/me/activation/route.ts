import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/activation
 *
 * Estado de activación del usuario para el checklist gamificado de DT-e.
 * Server-side + service_role a propósito: las señales viven en tablas con RLS
 * (`user_favorites` tiene RLS on sin policy → el client del browser no las lee).
 * El componente `ActivationChecklist` consumía esto haciendo `.from('alerts')` y
 * `.from('saved_remates')` con el client anon — DOS bugs: (1) esas tablas no
 * existen (typo de `alertas`/`remate_favorites`), y (2) aunque existieran, RLS las
 * bloquea al browser. Este endpoint lo resuelve con la tabla real (`user_favorites`)
 * y el acceso correcto.
 *
 * Mapeo (con la data que SÍ existe en prod):
 *   - hasSavedRemates: el usuario siguió al menos una consignataria (guardó algo).
 *   - hasAlerts: sigue alguna con `notify_new_remate` (creó una alerta de remates).
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!
  const uid = auth.userId!

  const service = requireServiceClient()

  const [{ count: saved }, { count: alerts }] = await Promise.all([
    service.from('user_favorites').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    service
      .from('user_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('notify_new_remate', true),
  ])

  return NextResponse.json({
    hasSavedRemates: (saved ?? 0) > 0,
    hasAlerts: (alerts ?? 0) > 0,
  })
}
