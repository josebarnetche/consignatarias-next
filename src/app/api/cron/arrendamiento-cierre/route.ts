import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { sendArrendamientoCierre } from '@/lib/email'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { fetchMonthClose } from '@/lib/mag/monthly-close'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cierre mensual de arrendamiento — a principio de cada mes:
 *  1) baja del MAG el cierre OFICIAL del mes que cerró (haciinfo000011, fila Totales)
 *     y lo guarda en inmag_monthly_close (idempotente);
 *  2) le manda ese número por email a los suscriptos de /mercado/arrendamiento
 *     (source arrendamiento-liquidacion), con su canon ya calculado si guardaron
 *     su contrato (kg/ha × ha).
 * Auth: authorizeCron. Se puede forzar un mes con ?month=YYYY-MM.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  return NextResponse.json(
    await trackCron('arrendamiento-cierre', async () => {
      // Mes que cerró: por default el mes anterior; ?month=YYYY-MM lo fuerza.
      let y: number
      let m: number
      const forced = req.nextUrl.searchParams.get('month')
      if (forced && /^\d{4}-\d{2}$/.test(forced)) {
        y = parseInt(forced.slice(0, 4), 10)
        m = parseInt(forced.slice(5, 7), 10)
      } else {
        const d = new Date()
        const lastOfPrev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 86400000)
        y = lastOfPrev.getUTCFullYear()
        m = lastOfPrev.getUTCMonth() + 1
      }
      const mesLabel = `${MESES[m - 1]} ${y}`

      // 1) Bajar + guardar el cierre oficial.
      const close = await fetchMonthClose(y, m)
      if (!close) {
        return { status: 'error' as const, message: `MAG sin cierre para ${mesLabel}`, metadata: { _status: 502, sent: 0 } }
      }
      const db = requireServiceClient() as unknown as SupabaseClient
      await db
        .from('inmag_monthly_close')
        .upsert(
          { year: y, month: m, inmag: close.inmag, cabezas: close.cabezas, importe: close.importe, scraped_at: new Date().toISOString() },
          { onConflict: 'year,month' },
        )

      // Variación vs. el mes anterior (para el mail).
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      const { data: prev } = await db.from('inmag_monthly_close').select('inmag').eq('year', py).eq('month', pm).maybeSingle()
      const change = prev?.inmag ? ((close.inmag - Number(prev.inmag)) / Number(prev.inmag)) * 100 : null

      // 2) Suscriptos de arrendamiento (con su contrato guardado).
      const { data: subs } = await requireServiceClient()
        .from('newsletter_subscribers')
        .select('email, lease_kg_ha, lease_hectareas')
        .eq('status', 'active')
        .eq('source', 'arrendamiento-liquidacion')

      if (!subs || subs.length === 0) {
        return { message: `Cierre ${mesLabel} guardado ($${close.inmag}); sin suscriptos`, metadata: { inmag: close.inmag, sent: 0 } }
      }

      const { toSend, skipped } = capForFreePlan(subs)
      let sent = 0
      const errors: string[] = []
      for (const sub of toSend) {
        try {
          // Sanity del canon personalizado: el arrendamiento real es 3-6 kg/ha/mes.
          // Fuera de (0, 20] es carga errónea → mandamos el cierre sin canon (mejor
          // que un número absurdo que rompe la credibilidad del índice).
          const rawKg = sub.lease_kg_ha as number | null
          const kgHa = rawKg != null && rawKg > 0 && rawKg <= 20 ? rawKg : null
          const r = await sendArrendamientoCierre({
            to: sub.email,
            mesLabel,
            inmag: close.inmag,
            change,
            kgHa,
            hectareas: kgHa != null ? (sub.lease_hectareas as number | null) : null,
          })
          if (r.success) sent++
          else errors.push(`${sub.email}: ${r.error}`)
          await new Promise((res) => setTimeout(res, 500))
        } catch (err) {
          errors.push(`${sub.email}: ${err instanceof Error ? err.message : 'error'}`)
        }
      }
      return {
        message: `Cierre ${mesLabel} ($${close.inmag}) → ${sent} mails`,
        metadata: { inmag: close.inmag, sent, skipped, errors: errors.slice(0, 5) },
      }
    }),
  )
}
