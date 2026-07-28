import { NextRequest } from 'next/server'
import { handlePaidTool } from '@/lib/x402-handler'
import { valuarTropa } from '@/lib/valuaciones'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint pago x402: valuación de tropa por consulta (US$0,05 en USDC/Base).
 * "¿Cuánto valen 350 novillos en Formosa?" → GET ?categoria=novillos&cabezas=350&provincia=Formosa
 * La misma consulta está gratis (con cupo diario) como tool `valuar_tropa` del MCP.
 */
const SPEC = {
  resource: 'https://www.consignatarias.com.ar/api/x402/valuar-tropa',
  description:
    'Valuación de tropa de hacienda argentina a precio MAG del día, en ARS y USD. Params: categoria (novillos|novillitos|vaquillonas|vacas|toros|terneros), cabezas, kg_promedio?, provincia?.',
  usdCents: 5,
  run: (args: Record<string, unknown>) =>
    valuarTropa({
      categoria: String(args.categoria ?? ''),
      cabezas: Number(args.cabezas),
      kgPromedio: args.kg_promedio != null ? Number(args.kg_promedio) : undefined,
      provincia: args.provincia ? String(args.provincia) : undefined,
    }),
}

export async function GET(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
export async function POST(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
