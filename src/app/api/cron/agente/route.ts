import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import { correrAgente } from '@/lib/agente/motor'
import { trackCron } from '@/lib/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/cron/agente — el agente que trabaja los leads de hacienda hasta el
 * cierre (ver src/lib/agente/motor.ts). Lo dispara `.github/workflows/agente.yml`.
 *
 * `?dryRun=1` calcula todo y devuelve lo que haría, sin mandar ni escribir.
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  let informe: Awaited<ReturnType<typeof correrAgente>> | null = null
  const outcome = await trackCron('agente', async () => {
    informe = await correrAgente(requireServiceClient(), { dryRun })
    const i = informe
    return {
      status: i.bandeja.errores.length ? ('error' as const) : ('ok' as const),
      message: `${i.dryRun ? '[seco] ' : ''}${i.bandeja.leidos} leídos · ${i.nuevos} casos nuevos · ${i.enviados} enviados · ${i.cierres} cierres · ${i.escalados} escalados`,
      metadata: { ...i },
    }
  })
  return NextResponse.json({ ...outcome, informe })
}
