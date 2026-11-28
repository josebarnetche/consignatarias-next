import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { sendArrendamientoCierre } from '@/lib/email'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { fetchMonthClose } from '@/lib/mag/monthly-close'
import { fetchArrendamientoMonthClose } from '@/lib/mag/arrendamiento-index'
import arrMensualData from '@/lib/data/arrendamiento-mensual.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cierre mensual de arrendamiento — a principio de cada mes:
 *  1) baja del MAG el INMAG del mes que cerró (haciinfo000011, fila Totales) y lo
 *     guarda en inmag_monthly_close (idempotente; sin cambios — lo leen otras páginas);
 *  2) baja el ÍNDICE ARRENDAMIENTO del mes (haciinfo000013, fila Totales) — el índice
 *     sugerido para arrendamientos rurales y el que muestra /mercado/arrendamiento —
 *     y lo manda por email a los suscriptos (source arrendamiento-liquidacion), con su
 *     canon calculado sobre ESE índice si guardaron su contrato (kg/ha × ha).
 *     Si el índice arrendamiento no está disponible, NO sale ningún mail (no se cae al
 *     INMAG: son números distintos, oct-2026 4.186,564 vs. 4.122,039).
 * Auth: authorizeCron. Se puede forzar un mes con ?month=YYYY-MM.
 */

type ArrMes = { year: number; month: number; index: number }
const arrMensual = (arrMensualData as { months: ArrMes[] }).months

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

      // 1) INMAG del mes → inmag_monthly_close, igual que antes (otros lo leen). En el
      //    mail va solo como referencia, así que su falta no frena el envío.
      const close = await fetchMonthClose(y, m)
      const db = requireServiceClient() as unknown as SupabaseClient
      if (close) {
        await db
          .from('inmag_monthly_close')
          .upsert(
            { year: y, month: m, inmag: close.inmag, cabezas: close.cabezas, importe: close.importe, scraped_at: new Date().toISOString() },
            { onConflict: 'year,month' },
          )
      }

      // 2) Índice Arrendamiento del mes: número principal y canon del mail. Sin él, no hay mail.
      const arr = await fetchArrendamientoMonthClose(y, m)
      if (!arr) {
        return {
          status: 'error' as const,
          message: `MAG sin Índice Arrendamiento (haciinfo000013) para ${mesLabel} — no se envían mails`,
          metadata: { _status: 502, sent: 0, inmag: close?.inmag ?? null },
        }
      }

      // Variación vs. el mes anterior, sobre el MISMO índice: MAG primero, si no el JSON
      // committeado (src/lib/data/arrendamiento-mensual.json). Si no hay ninguno, sin variación.
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      const prevIndex =
        (await fetchArrendamientoMonthClose(py, pm).catch(() => null))?.index ??
        arrMensual.find((r) => r.year === py && r.month === pm)?.index ??
        null
      const change = prevIndex ? ((arr.index - prevIndex) / prevIndex) * 100 : null
      const prevMesLabel = `${MESES[pm - 1]} ${py}`

      // 3) Suscriptos de arrendamiento (con su contrato guardado).
      const { data: subs } = await requireServiceClient()
        .from('newsletter_subscribers')
        .select('email, lease_kg_ha, lease_hectareas')
        .eq('status', 'active')
        .eq('source', 'arrendamiento-liquidacion')

      if (!subs || subs.length === 0) {
        return {
          message: `Índice Arrendamiento ${mesLabel} $${arr.index}; sin suscriptos`,
          metadata: { indice: arr.index, inmag: close?.inmag ?? null, sent: 0 },
        }
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
            indice: arr.index,
            prevMesLabel,
            change,
            inmagRef: close?.inmag ?? null,
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
        message: `Índice Arrendamiento ${mesLabel} ($${arr.index}) → ${sent} mails`,
        metadata: { indice: arr.index, inmag: close?.inmag ?? null, change, sent, skipped, errors: errors.slice(0, 5) },
      }
    }),
  )
}
