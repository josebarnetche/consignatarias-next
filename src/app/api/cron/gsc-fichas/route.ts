import { NextRequest, NextResponse } from 'next/server'
import type { searchconsole_v1 } from 'googleapis'
import { requireServiceClient } from '@/lib/supabase'
import { trackCron, logEvent } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { crearClienteGsc, GSC_SITE } from '@/lib/gsc/cliente'
import {
  agregarPorFicha,
  crearSlugDePath,
  PERIODOS_GSC,
  ventanaGsc,
  type FilaGsc,
} from '@/lib/gsc/fichas'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import type { Json } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * /api/cron/gsc-fichas — "Lo que buscan en Google sobre su firma" (17-10-2026).
 *
 * Semanal (lunes 12:00 UTC, .github/workflows/gsc-fichas.yml). UNA consulta a Search
 * Console por período para TODAS las fichas /consignatarias/<slug> (no una por
 * firma: serían 107 llamadas contra la cuota), se agrega por slug canónico y se
 * guarda en gsc_fichas, para 28 y 90 días que terminan hoy − 3 (atraso de GSC).
 *
 * Sin GSC_SERVICE_ACCOUNT_JSON no rompe: termina "ok" con un mensaje, porque la
 * tabla se puede poblar con scripts/gsc-fichas-local.mjs mientras tanto.
 */

const ROW_LIMIT = 25_000
/** Techo de páginas de resultados: 10 × 25.000 filas sobra para ~110 fichas. */
const MAX_PAGINAS = 10

async function consultarTodo(
  sc: searchconsole_v1.Searchconsole,
  dimensiones: string[],
  desde: string,
  hasta: string,
): Promise<FilaGsc[]> {
  const filas: FilaGsc[] = []
  for (let i = 0; i < MAX_PAGINAS; i++) {
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE,
      requestBody: {
        startDate: desde,
        endDate: hasta,
        dimensions: dimensiones,
        type: 'web',
        dimensionFilterGroups: [
          { filters: [{ dimension: 'page', operator: 'contains', expression: '/consignatarias/' }] },
        ],
        rowLimit: ROW_LIMIT,
        startRow: i * ROW_LIMIT,
      },
    })
    const rows = res.data.rows ?? []
    filas.push(...rows)
    if (rows.length < ROW_LIMIT) break
  }
  return filas
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const outcome = await trackCron('gsc-fichas', async () => {
    const sc = await crearClienteGsc()
    if (!sc) {
      return {
        status: 'ok',
        message: 'GSC_SERVICE_ACCOUNT_JSON sin configurar — no se consultó Google (ver docs/GSC-SERVICE-ACCOUNT.md)',
        metadata: { configurado: false },
      }
    }

    const db = requireServiceClient()
    const slugDePath = crearSlugDePath(getCanonicalSlug)
    const actualizado = new Date().toISOString()
    const resumen: Record<string, { fichas: number; filas: number; desde: string; hasta: string }> = {}

    for (const dias of PERIODOS_GSC) {
      const { desde, hasta } = ventanaGsc(dias)
      // Las filas por página dan el total real (Google oculta las consultas raras);
      // las de página+consulta, el detalle de qué se buscó.
      const [filasConsulta, filasPagina] = await Promise.all([
        consultarTodo(sc, ['page', 'query'], desde, hasta),
        consultarTodo(sc, ['page'], desde, hasta),
      ])
      const fichas = agregarPorFicha(filasConsulta, slugDePath, filasPagina)
      const upserts = [...fichas.values()].map((f) => ({
        slug: f.slug,
        periodo_dias: dias,
        desde,
        hasta,
        impresiones: f.impresiones,
        clics: f.clics,
        posicion: f.posicion,
        consultas: f.consultas as unknown as Json,
        actualizado,
      }))
      for (let i = 0; i < upserts.length; i += 500) {
        const { error } = await db.from('gsc_fichas').upsert(upserts.slice(i, i + 500), { onConflict: 'slug,periodo_dias' })
        if (error) throw new Error(`upsert gsc_fichas (${dias}d): ${error.message}`)
      }
      resumen[`d${dias}`] = { fichas: upserts.length, filas: filasConsulta.length, desde, hasta }
    }

    logEvent({
      eventType: 'cron_finished',
      status: 'ok',
      route: '/api/cron/gsc-fichas',
      metadata: { resumen },
    })
    return {
      status: 'ok',
      message: `gsc_fichas: ${resumen.d28?.fichas ?? 0} fichas (28d) · ${resumen.d90?.fichas ?? 0} (90d)`,
      metadata: { configurado: true, ...resumen },
    }
  })

  return NextResponse.json({ ok: outcome.status === 'ok', message: outcome.message, ...outcome.metadata })
}
