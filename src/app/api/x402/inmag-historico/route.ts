import { NextRequest, NextResponse } from 'next/server'
import { handlePaidTool } from '@/lib/x402-handler'
import { requireServiceClient } from '@/lib/supabase'
import {
  PRECIO_SERIE_COMPLETA_USD_CENTS,
  SERIE_ARRANCA,
  formatearSerie,
  leerSerie,
  resolverRango,
} from '@/lib/inmag-historico'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Endpoint pago x402: la serie INMAG completa, sin el techo de 365 días
 * (US$0,25 en USDC/Base por consulta).
 *
 * La misma consulta, recortada a los últimos 365 días, está gratis y sin cupo como
 * tool `get_inmag_historico` del MCP. Lo que se paga acá es la PROFUNDIDAD —la serie
 * empalmada Liniers→MAG desde 2015, que es el gráfico que una consultora compra— no
 * el acceso al dato: el valor de hoy, la tendencia del año y cualquier fecha puntual
 * siguen abiertos.
 *
 * Comparte todo el armado con la tool gratis (`lib/inmag-historico.ts`) para que la
 * versión paga no pueda despegarse de la gratis sin que nadie lo note.
 */
const ARGS_NUMERICOS = new Set(['dias'])

function normalizar(args: Record<string, unknown>): Record<string, unknown> {
  // Por query string todo llega como texto; `resolverRango` distingue número de fecha.
  const out: Record<string, unknown> = { ...args }
  for (const k of ARGS_NUMERICOS) {
    if (typeof out[k] === 'string' && out[k] !== '') {
      const n = Number(out[k])
      if (Number.isFinite(n)) out[k] = n
    }
  }
  return out
}

const SPEC = {
  resource: 'https://www.consignatarias.com.ar/api/x402/inmag-historico',
  description:
    `Serie histórica completa del Índice Novillo (INMAG), diaria desde ${SERIE_ARRANCA}: empalme Mercado de Liniers → MAG/Cañuelas, en ARS o USD (dólar blue). Sin el techo de 365 días de la tool gratuita. Params: dias (hasta 5000) o desde/hasta (YYYY-MM-DD), moneda (ars|usd).`,
  usdCents: PRECIO_SERIE_COMPLETA_USD_CENTS,
  validate: (args: Record<string, unknown>) => {
    const r = resolverRango(normalizar(args), new Date().toISOString().slice(0, 10))
    // Nadie paga por un rango que no existe.
    return 'error' in r ? r.error : null
  },
  run: async (args: Record<string, unknown>) => {
    const norm = normalizar(args)
    const moneda = norm.moneda === 'usd' ? ('usd' as const) : ('ars' as const)
    const rango = resolverRango(norm, new Date().toISOString().slice(0, 10))
    if ('error' in rango) throw new Error(rango.error)

    const service = requireServiceClient()
    const serie = await leerSerie(service, rango, moneda)
    if ('error' in serie) throw new Error(serie.error)
    if (serie.rows.length === 0) {
      return {
        texto: `Sin ruedas INMAG en el rango ${rango.label}. La serie arranca el ${SERIE_ARRANCA}.`,
        data: { ruedas: 0, desde: rango.desde, hasta: rango.hasta },
      }
    }

    const fmtArs = (v: number) => `$${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
    const { texto, data } = formatearSerie(serie.rows, rango, moneda, fmtArs)
    // La serie entera, no la muestra de ~8 puntos: es lo que se pagó.
    return { texto, data: { ...data, recortado: false, serie: serie.rows } }
  },
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handlePaidTool(req, SPEC)
}
export async function POST(req: NextRequest): Promise<NextResponse> {
  return handlePaidTool(req, SPEC)
}
