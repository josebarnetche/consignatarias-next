import { NextRequest } from 'next/server'
import { handlePaidTool } from '@/lib/x402-handler'
import { valuarArrendamiento } from '@/lib/valuaciones'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint pago x402: valuación de arrendamiento ganadero (US$0,10 en USDC/Base).
 * "¿Cuánto cuesta arrendar 3.500 has en Corrientes?" → GET ?hectareas=3500&provincia=Corrientes
 * Con kg_ha_anio pactado da el canon exacto; sin él, escenarios 40-100 kg/ha/año
 * al índice oficial de arrendamientos del MAG. Gratis (con cupo) en el MCP.
 */
const SPEC = {
  resource: 'https://www.consignatarias.com.ar/api/x402/valuar-arrendamiento',
  description:
    'Canon de arrendamiento ganadero argentino al índice oficial MAG (haciinfo000013), anual y mensual, ARS y USD. Params: hectareas, kg_ha_anio?, provincia?.',
  usdCents: 10,
  run: (args: Record<string, unknown>) =>
    valuarArrendamiento({
      hectareas: Number(args.hectareas),
      kgHaAnio: args.kg_ha_anio != null ? Number(args.kg_ha_anio) : undefined,
      provincia: args.provincia ? String(args.provincia) : undefined,
    }),
}

export async function GET(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
export async function POST(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
