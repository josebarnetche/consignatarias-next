import { NextRequest } from 'next/server'
import { handlePaidTool } from '@/lib/x402-handler'
import { activarProX402, cotizarProUsdCents, proArsMensual, proMeses, validarSlugPro } from '@/lib/pro-x402'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint pago x402: activar PRO Consignataria con USDC (Base) — el mismo
 * producto que Rebill vende en ARS 45.000/mes, cotizado al blue del día.
 * GET/POST ?slug=<consignataria>&meses=1..12 → 402 con el monto exacto → pago
 * → activación inmediata (badge PRO, perfil destacado) y extensión si ya tenía.
 */
const SPEC = {
  resource: 'https://www.consignatarias.com.ar/api/x402/pro',
  description:
    'PRO Consignataria: perfil destacado, badge PRO, video del último remate y leads en consignatarias.com.ar. Precio ARS 45.000/mes cotizado en USDC al dólar blue del día. Params: slug (consignataria del directorio), meses (1-12, default 1).',
  usdCents: (args: Record<string, unknown>) => cotizarProUsdCents(proMeses(args.meses)),
  validate: (args: Record<string, unknown>) => {
    if (!validarSlugPro(args.slug)) {
      return 'slug inválido: tiene que ser una consignataria del directorio. Buscala en https://www.consignatarias.com.ar/consignatarias o con el tool MCP buscar_consignataria.'
    }
    try {
      proMeses(args.meses)
    } catch (e) {
      return e instanceof Error ? e.message : 'meses inválido.'
    }
    return null
  },
  run: async (args: Record<string, unknown>, pago: { payer: string; transaction: string }) => {
    const firma = validarSlugPro(args.slug)!
    const meses = proMeses(args.meses)
    const { hasta } = await activarProX402({
      canonical: firma.canonical,
      meses,
      payer: pago.payer,
      transaction: pago.transaction,
    })
    return {
      texto:
        `PRO activado para ${firma.nombre} hasta el ${hasta} (${meses} mes${meses > 1 ? 'es' : ''}, ` +
        `ARS ${(proArsMensual() * meses).toLocaleString('es-AR')} pagados en USDC). ` +
        `El perfil ya muestra el destaque: https://www.consignatarias.com.ar/consignatarias/${firma.canonical}`,
      data: { slug: firma.canonical, nombre: firma.nombre, meses, pro_hasta: hasta },
    }
  },
}

export async function GET(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
export async function POST(req: NextRequest) {
  return handlePaidTool(req, SPEC)
}
