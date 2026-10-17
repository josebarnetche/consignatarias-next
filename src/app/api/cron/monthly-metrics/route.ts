import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMonthlyMetrics, type ReporteMensualFirma } from '@/lib/email'
import { authorizeCron } from '@/lib/cron-auth'
import { getFeaturedSlugs } from '@/lib/featured'
import { esMotorIA } from '@/lib/reports/origen-visitas'
import { logEvent } from '@/lib/ops'

export const dynamic = 'force-dynamic'

/**
 * Reporte mensual a cada firma con la ficha reclamada (reescrito el 17-10-2026).
 *
 * Es el "reportes mensuales" que se le promete a PRO. Antes contaba sólo vistas, leía
 * `profile_views` sin paginar (PostgREST corta en 1.000 filas: con más visitas en el
 * mes, el número salía mal sin avisar) y el workflow que lo disparaba estaba apagado.
 * Ahora cada número es un `count` por firma, con el mes cerrado anterior:
 * vistas, visitas desde IAs, consultas, envíos del newsletter y seguidores.
 *
 * Auth: authorizeCron (CRON_SECRET / ADMIN_SECRET).
 *   ?test=<email>&slug=<firma> → manda el reporte de esa firma a ese mail, nada más.
 *   ?month=YYYY-MM             → otro mes (por defecto, el anterior).
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = requireServiceClient()
  const params = req.nextUrl.searchParams
  const test = params.get('test')
  const testSlug = params.get('slug')

  // Mes cerrado, en hora argentina (UTC−3).
  const ahora = new Date(Date.now() - 3 * 3600_000)
  const [a, m] = (params.get('month') ?? '').match(/^\d{4}-\d{2}$/)
    ? params.get('month')!.split('-').map(Number)
    : [ahora.getUTCMonth() === 0 ? ahora.getUTCFullYear() - 1 : ahora.getUTCFullYear(), ahora.getUTCMonth() === 0 ? 12 : ahora.getUTCMonth()]
  const desde = new Date(Date.UTC(a, m - 1, 1, 3)).toISOString()
  const hasta = new Date(Date.UTC(a, m, 1, 3)).toISOString()
  const monthName = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  let firmas: { canonical_slug: string; display_name: string; claimed_by_email: string | null }[] = []
  if (test && testSlug) {
    const { data } = await db.from('consignatarias').select('canonical_slug, display_name, claimed_by_email').eq('canonical_slug', testSlug).maybeSingle()
    if (!data) return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 })
    firmas = [{ ...data, claimed_by_email: test }]
  } else {
    const { data } = await db
      .from('consignatarias')
      .select('canonical_slug, display_name, claimed_by_email')
      .not('claimed_by_email', 'is', null)
    firmas = data ?? []
  }
  if (firmas.length === 0) return NextResponse.json({ message: 'No hay consignatarias reclamadas', sent: 0 })

  const pro = await getFeaturedSlugs()
  let sent = 0
  const errors: string[] = []

  for (const f of firmas) {
    if (!f.claimed_by_email) continue
    try {
      const ficha = `/consignatarias/${f.canonical_slug}`
      const [vistas, ias, consultas, campanas, seguidores] = await Promise.all([
        db.from('profile_views').select('*', { count: 'exact', head: true })
          .eq('entity_type', 'consignataria').eq('entity_slug', f.canonical_slug).gte('viewed_at', desde).lt('viewed_at', hasta),
        db.from('ai_referrals').select('engine, path').like('path', `${ficha}%`).gte('created_at', desde).lt('created_at', hasta).limit(5000),
        db.from('consignataria_leads').select('*', { count: 'exact', head: true })
          .eq('consignataria_slug', f.canonical_slug).gte('created_at', desde).lt('created_at', hasta),
        db.from('promotion_campaigns').select('destinatarios')
          .eq('consignataria_slug', f.canonical_slug).gte('created_at', desde).lt('created_at', hasta).limit(1000),
        db.from('user_favorites').select('*', { count: 'exact', head: true }).eq('consignataria_slug', f.canonical_slug),
      ])
      const visitasIA = (ias.data ?? []).filter((r) => {
        const p = (r.path ?? '').split(/[?#]/)[0].replace(/\/+$/, '')
        return esMotorIA(r.engine) && (p === ficha || p.startsWith(ficha + '/'))
      }).length
      const datos: ReporteMensualFirma = {
        vistas: vistas.count ?? 0,
        visitasIA,
        consultas: consultas.count ?? 0,
        envios: (campanas.data ?? []).reduce((s, c) => s + (c.destinatarios ?? 0), 0),
        salidas: (campanas.data ?? []).length,
        seguidores: seguidores.count ?? 0,
        esPro: pro.has(f.canonical_slug),
      }
      const res = await sendMonthlyMetrics(f.claimed_by_email, f.display_name, f.canonical_slug, datos, monthName)
      if (res?.error) errors.push(`${f.canonical_slug}: ${res.error.message}`)
      else sent++
    } catch (err) {
      errors.push(`${f.canonical_slug}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  logEvent({
    eventType: 'cron_finished',
    status: errors.length && !sent ? 'error' : 'ok',
    route: '/api/cron/monthly-metrics',
    metadata: { mes: monthName, enviados: sent, firmas: firmas.length, errores: errors, test: !!test },
  })

  return NextResponse.json({ month: monthName, sent, total: firmas.length, errors: errors.length ? errors : undefined })
}
