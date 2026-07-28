/**
 * x402 (HTTP 402 Payment Required) — capa de cobro por consulta para agentes.
 * Implementado contra specs/x402-specification-v1.md + transports-v1/http.md
 * (github.com/coinbase/x402): el server responde 402 con PaymentRequirements,
 * el cliente paga USDC (EIP-3009) y reintenta con el header X-PAYMENT (base64);
 * acá se verifica Y liquida contra el facilitator ANTES de responder el dato.
 *
 * Env (sin estas vars el sistema queda apagado y los endpoints responden 503):
 *   X402_PAYTO_ADDRESS    wallet EVM que recibe los USDC (Base)
 *   X402_NETWORK          "base" | "base-sepolia" (default base-sepolia)
 *   X402_FACILITATOR_URL  default: x402.org/facilitator en sepolia; con claves CDP
 *                         presentes, el facilitator de Coinbase (mainnet, 1.000 tx/mes free)
 *   X402_FACILITATOR_AUTH opcional: header Authorization estático hacia el facilitator
 *   CDP_API_KEY_ID + CDP_API_KEY_SECRET  claves de Coinbase Developer Platform:
 *                         si están, cada llamada al facilitator va firmada con un
 *                         JWT por-request (generateJwt del SDK) — requisito de mainnet.
 */

const USDC_BY_NETWORK: Record<string, { asset: string; extra: { name: string; version: string } }> = {
  // USDC nativo en Base mainnet
  base: { asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', extra: { name: 'USD Coin', version: '2' } },
  // USDC de testeo en Base Sepolia (dominio EIP-712 "USDC")
  'base-sepolia': { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', extra: { name: 'USDC', version: '2' } },
}

export interface X402Config {
  payTo: string
  network: string
  facilitatorUrl: string
  facilitatorAuth: string | null
  asset: string
  assetExtra: { name: string; version: string }
}

const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402'

function hasCdpKeys(): boolean {
  return Boolean(process.env.CDP_API_KEY_ID?.trim() && process.env.CDP_API_KEY_SECRET?.trim())
}

export function getX402Config(): X402Config | null {
  const payTo = process.env.X402_PAYTO_ADDRESS?.trim()
  if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) return null
  const network = (process.env.X402_NETWORK?.trim() || 'base-sepolia').toLowerCase()
  const usdc = USDC_BY_NETWORK[network]
  if (!usdc) return null
  // Con claves CDP el default es el facilitator de Coinbase (el que banca mainnet).
  const defaultFacilitator = hasCdpKeys() ? CDP_FACILITATOR_URL : 'https://x402.org/facilitator'
  return {
    payTo,
    network,
    facilitatorUrl: (process.env.X402_FACILITATOR_URL?.trim() || defaultFacilitator).replace(/\/$/, ''),
    facilitatorAuth: process.env.X402_FACILITATOR_AUTH?.trim() || null,
    asset: usdc.asset,
    assetExtra: usdc.extra,
  }
}

export interface PaymentRequirements {
  scheme: 'exact'
  network: string
  maxAmountRequired: string
  asset: string
  payTo: string
  resource: string
  description: string
  mimeType: string
  maxTimeoutSeconds: number
  extra: { name: string; version: string }
}

/** Centavos de USD → unidades atómicas de USDC (6 decimales). */
export function usdCentsToAtomic(cents: number): string {
  return String(Math.round(cents * 10_000))
}

export function buildPaymentRequirements(
  cfg: X402Config,
  opts: { resource: string; description: string; usdCents: number },
): PaymentRequirements {
  return {
    scheme: 'exact',
    network: cfg.network,
    maxAmountRequired: usdCentsToAtomic(opts.usdCents),
    asset: cfg.asset,
    payTo: cfg.payTo,
    resource: opts.resource,
    description: opts.description,
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    extra: cfg.assetExtra,
  }
}

/** Cuerpo del 402 (PaymentRequirementsResponse del spec). */
export function payment402Body(requirements: PaymentRequirements, error = 'X-PAYMENT header is required') {
  return { x402Version: 1, error, accepts: [requirements] }
}

interface PaymentPayload {
  x402Version: number
  scheme: string
  network: string
  payload: unknown
}

export function decodePaymentHeader(headerValue: string): PaymentPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(headerValue, 'base64').toString('utf8')) as PaymentPayload
    if (parsed?.x402Version !== 1 || typeof parsed.scheme !== 'string' || typeof parsed.network !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export interface SettlementResult {
  ok: boolean
  reason?: string
  /** SettlementResponse del spec, para el header X-PAYMENT-RESPONSE. */
  settlement?: { success: boolean; transaction: string; network: string; payer: string }
}

/**
 * Verifica y liquida el pago contra el facilitator. Regla de seguridad: nunca
 * responder el dato sin `settle` exitoso — la verificación sola no mueve fondos.
 */
export async function verifyAndSettle(
  cfg: X402Config,
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettlementResult> {
  if (paymentPayload.scheme !== 'exact' || paymentPayload.network !== cfg.network) {
    return { ok: false, reason: 'unsupported_scheme_or_network' }
  }
  const body = JSON.stringify({ x402Version: 1, paymentPayload, paymentRequirements })

  const call = async (path: '/verify' | '/settle') => {
    const url = new URL(`${cfg.facilitatorUrl}${path}`)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (hasCdpKeys()) {
      // Mainnet (facilitator CDP): JWT firmado por-request con las claves del portal.
      // Import dinámico para no cargar el SDK cuando x402 corre sin CDP.
      const { generateJwt } = await import('@coinbase/cdp-sdk/auth')
      const jwt = await generateJwt({
        apiKeyId: process.env.CDP_API_KEY_ID!.trim(),
        apiKeySecret: process.env.CDP_API_KEY_SECRET!.trim(),
        requestMethod: 'POST',
        requestHost: url.host,
        requestPath: url.pathname,
      })
      headers['Authorization'] = `Bearer ${jwt}`
    } else if (cfg.facilitatorAuth) {
      headers['Authorization'] = cfg.facilitatorAuth
    }
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`facilitator ${path} HTTP ${res.status}`)
    return res.json()
  }

  try {
    const verify = (await call('/verify')) as { isValid: boolean; invalidReason?: string }
    if (!verify.isValid) return { ok: false, reason: verify.invalidReason || 'invalid_payment' }

    const settle = (await call('/settle')) as {
      success: boolean
      errorReason?: string
      transaction: string
      network: string
      payer: string
    }
    if (!settle.success) return { ok: false, reason: settle.errorReason || 'settlement_failed' }
    return {
      ok: true,
      settlement: { success: true, transaction: settle.transaction, network: settle.network, payer: settle.payer },
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'facilitator_unreachable' }
  }
}

export function encodePaymentResponseHeader(settlement: NonNullable<SettlementResult['settlement']>): string {
  return Buffer.from(JSON.stringify(settlement), 'utf8').toString('base64')
}
