import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { CATEGORIAS_DEMANDA, crearDemanda, normalizarCategoria } from '@/lib/demanda'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/demanda — entrada web del growth engine (form /quiero-comprar).
 * Registra una demanda de compra y devuelve los remates programados que ya
 * matchean. El gemelo MCP es el tool `quiero_comprar`.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await enforceRateLimit({ action: 'demanda_compra', identity: `ip:${ip}`, limit: 5, windowSeconds: 86_400 })
  if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const categoria = normalizarCategoria(body.categoria)
  if (!categoria) {
    return NextResponse.json({ error: `Categoría inválida. Válidas: ${CATEGORIAS_DEMANDA.join(', ')}` }, { status: 400 })
  }
  const email = typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ? body.email.trim().toLowerCase()
    : null
  if (!email) {
    return NextResponse.json({ error: 'Email requerido para avisarte de los remates que matcheen.' }, { status: 400 })
  }
  const cabezas = Number.isFinite(Number(body.cabezas)) && Number(body.cabezas) > 0
    ? Math.min(Math.round(Number(body.cabezas)), 100_000)
    : null
  const provincia = typeof body.provincia === 'string' && body.provincia.trim() ? body.provincia.trim().slice(0, 60) : null
  const notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim().slice(0, 500) : null

  try {
    const { id, matches } = await crearDemanda({
      categoria,
      cabezas,
      provincia,
      email,
      webhookUrl: null,
      origen: 'web',
      originIp: ip,
      notas,
    })
    return NextResponse.json({ ok: true, id, matches })
  } catch (e) {
    console.error('[demanda]', e)
    return NextResponse.json({ error: 'No se pudo registrar la búsqueda.' }, { status: 500 })
  }
}
