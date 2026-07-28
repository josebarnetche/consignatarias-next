/**
 * Handler compartido de los endpoints pagos x402 (/api/x402/*).
 * Flujo (spec v1, transporte HTTP): sin X-PAYMENT → 402 con PaymentRequirements;
 * con X-PAYMENT → verify + settle en el facilitator y recién ahí se responde el
 * dato, con el header X-PAYMENT-RESPONSE. Sin envs X402_* → 503 (apagado).
 *
 * Los args se parsean ANTES del 402: permiten precios dinámicos (usdCents como
 * función de los args) y validación previa (nadie paga por args inválidos).
 */
import { NextRequest, NextResponse } from 'next/server'
import { logEvent } from '@/lib/ops'
import {
  buildPaymentRequirements,
  decodePaymentHeader,
  encodePaymentResponseHeader,
  getX402Config,
  payment402Body,
  verifyAndSettle,
} from '@/lib/x402'

export interface PaidToolSpec {
  /** Ruta pública completa, ej. https://www.consignatarias.com.ar/api/x402/valuar-tropa */
  resource: string
  description: string
  /** Precio en centavos de USD — fijo, o función de los args (ej. PRO × meses). */
  usdCents: number | ((args: Record<string, unknown>) => number)
  /** Devuelve un mensaje de error si los args no sirven — corta con 400 ANTES de cobrar. */
  validate?: (args: Record<string, unknown>) => string | null
  /** Ejecuta la consulta/acción una vez liquidado el pago. */
  run: (
    args: Record<string, unknown>,
    pago: { payer: string; transaction: string; network: string },
  ) => Promise<{ texto: string; data: Record<string, unknown> }> | { texto: string; data: Record<string, unknown> }
}

async function parseArgs(req: NextRequest): Promise<Record<string, unknown>> {
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (body && typeof body === 'object') return body as Record<string, unknown>
    } catch {
      /* cae a query */
    }
  }
  const out: Record<string, unknown> = {}
  req.nextUrl.searchParams.forEach((v, k) => {
    out[k] = v
  })
  return out
}

export async function handlePaidTool(req: NextRequest, spec: PaidToolSpec): Promise<NextResponse> {
  const started = Date.now()
  const cfg = getX402Config()
  if (!cfg) {
    return NextResponse.json(
      { error: 'x402 no configurado todavía. Los mismos datos están gratis (con cupo diario) en el MCP: https://www.consignatarias.com.ar/mcp' },
      { status: 503 },
    )
  }

  const args = await parseArgs(req)

  if (spec.validate) {
    const invalid = spec.validate(args)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  }

  let usdCents: number
  try {
    usdCents = typeof spec.usdCents === 'function' ? spec.usdCents(args) : spec.usdCents
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Args inválidos.' }, { status: 400 })
  }

  const requirements = buildPaymentRequirements(cfg, { resource: spec.resource, description: spec.description, usdCents })
  const headerValue = req.headers.get('x-payment')

  if (!headerValue) {
    return NextResponse.json(payment402Body(requirements), { status: 402 })
  }

  const paymentPayload = decodePaymentHeader(headerValue)
  if (!paymentPayload) {
    return NextResponse.json(payment402Body(requirements, 'X-PAYMENT header inválido (base64 JSON, x402 v1)'), { status: 402 })
  }

  const result = await verifyAndSettle(cfg, paymentPayload, requirements)
  if (!result.ok || !result.settlement) {
    logEvent({
      eventType: 'x402_payment',
      status: 'error',
      route: new URL(spec.resource).pathname,
      latencyMs: Date.now() - started,
      statusCode: 402,
      metadata: { reason: result.reason ?? 'unknown', network: cfg.network, usd_cents: usdCents },
    })
    return NextResponse.json(payment402Body(requirements, `Pago rechazado: ${result.reason ?? 'invalid_payment'}`), { status: 402 })
  }

  let payload: { texto: string; data: Record<string, unknown> }
  try {
    payload = await spec.run(args, result.settlement)
  } catch (e) {
    // El pago ya se liquidó pero la ejecución falló: responder 200 con el error
    // explicado y dejar rastro — es el caso a mirar en /admin/ops.
    console.error('[x402] run() falló con pago liquidado:', e)
    payload = {
      texto: `La ejecución falló después de liquidar el pago: ${e instanceof Error ? e.message : 'error'}. Escribinos a agro@memola.com.ar con el hash de la transacción y lo resolvemos.`,
      data: { error: true },
    }
  }

  logEvent({
    eventType: 'x402_payment',
    status: 'ok',
    route: new URL(spec.resource).pathname,
    latencyMs: Date.now() - started,
    statusCode: 200,
    metadata: {
      payer: result.settlement.payer,
      transaction: result.settlement.transaction,
      network: result.settlement.network,
      usd_cents: usdCents,
      error_post_pago: payload.data.error === true || undefined,
    },
  })

  return NextResponse.json(
    { ...payload.data, texto: payload.texto, pago: { red: result.settlement.network, tx: result.settlement.transaction } },
    { status: 200, headers: { 'X-PAYMENT-RESPONSE': encodePaymentResponseHeader(result.settlement) } },
  )
}
