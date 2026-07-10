import { NextResponse } from 'next/server'
import { fetchInmagSeries } from '@/lib/charts/data'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import { hasUnlock } from '@/lib/karma-ledger'

// Reads the session cookie + the DB → must render dynamically.
export const dynamic = 'force-dynamic'

/**
 * GET /api/market/inmag-export
 *
 * CSV export del histórico INMAG completo (2015 → hoy), desde mag_inmag_history.
 * Los charts/tablas de la página muestran solo la ventana reciente (gratis +
 * indexable); el dataset completo se desbloquea con COINS (Fase 3 del karma).
 *
 * Este check es defensa en profundidad: la UI (InmagHistoryExport) ya no expone
 * el link hasta desbloquear, y acá revalidamos el unlock server-side para que no
 * se pueda bajar el CSV pegándole directo al endpoint.
 */
export async function GET() {
  let userId: string | null = null
  try {
    const sb = await createServerSupabase()
    const {
      data: { user },
    } = await sb.auth.getUser()
    userId = user?.id ?? null
  } catch {
    /* sin sesión */
  }

  if (!userId || !(await hasUnlock(userId, 'inmag_history_deep'))) {
    return NextResponse.json(
      { error: 'locked', message: 'Desbloqueá el histórico completo con tus coins en /mercado/inmag.' },
      { status: 403 },
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows = await fetchInmagSeries('2015-01-01', today)
  const clean = rows.filter((r) => r.inmag !== null)

  const header = 'fecha,inmag_ars_kg_vivo,cabezas'
  const body = clean
    .map((r) => `${r.date},${r.inmag},${r.head_count ?? ''}`)
    .join('\n')
  const csv = `${header}\n${body}\n`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inmag-historico-completo-${today}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
