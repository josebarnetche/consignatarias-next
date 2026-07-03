import { lookup } from 'node:dns/promises'
import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import { webhookRegisterSchema, WEBHOOK_EVENTS } from '@/lib/validators/webhook'

// Block private/loopback/link-local hosts. Webhook URLs must be public HTTPS;
// without this, callers can register http://169.254.169.254 (cloud metadata),
// http://127.0.0.1 (local services), or 10.x/192.168.x (internal infra) and
// our dispatcher would happily POST to them.
function isPublicHttpsUrl(raw: string): boolean {
  let u: URL
  try { u = new URL(raw) } catch { return false }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  // Loopback + private IPv4 + link-local + IPv6 loopback + IPv6 ULA
  if (/^127\./.test(host)) return false
  if (/^10\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return false
  if (/^169\.254\./.test(host)) return false
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd')) return false
  if (host === '0.0.0.0') return false
  return true
}

// True if an IP literal is private/loopback/link-local/CGNAT (incl. IPv4-mapped IPv6).
function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase()
  if (v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
  const m = v.startsWith('::ffff:') ? v.slice(7) : v
  if (/^127\./.test(m)) return true
  if (/^10\./.test(m)) return true
  if (/^192\.168\./.test(m)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(m)) return true
  if (/^169\.254\./.test(m)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(m)) return true // CGNAT 100.64/10
  if (m === '0.0.0.0') return true
  return false
}

// The string check above only inspects the literal hostname. A public hostname
// (e.g. evil.example.com) can still resolve to 169.254.169.254 / 127.0.0.1 /
// 10.x — a classic SSRF / DNS-rebinding bypass. Resolve the host and reject if
// ANY answer is a private address.
// NOTE: this is registration-time only; the dispatcher should re-resolve and
// pin/validate the IP at send time to fully defeat DNS rebinding.
async function resolvesToPublicHost(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address))
  } catch {
    return false
  }
}

interface SuccessResponse {
  success: true
  data: {
    webhook_id: string
    url: string
    events: string[]
    active: boolean
    created_at: string
  }
  message: string
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

/**
 * POST /api/webhooks/register
 * 
 * Register a new webhook subscription for real-time event notifications.
 * 
 * Request body:
 * {
 *   "url": "https://customer.com/webhook",        // Required, must be HTTPS
 *   "events": ["remate.created", "remate.live"],  // Required, at least one
 *   "secret": "your_secret_for_signatures",       // Required, min 16 chars
 *   "filters": {                                   // Optional
 *     "provincia": "BUENOS AIRES",
 *     "consignataria_slug": "aguirre-vazquez-s-a"
 *   },
 *   "description": "My integration",              // Optional
 *   "owner_email": "dev@company.com"              // Optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "webhook_id": "uuid",
 *     "url": "https://...",
 *     "events": [...],
 *     "active": true,
 *     "created_at": "2026-03-12T..."
 *   },
 *   "message": "Webhook registrado correctamente"
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Auth: must be a paying Enterprise user. Without this, anyone on the
    // internet can pollute the webhooks table, exfil event metadata, or use
    // the dispatcher as an SSRF / outbound-spam vector.
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response as NextResponse<ErrorResponse>

    const body = await request.json()

    // Validate input
    const parsed = webhookRegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de webhook inválidos',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }, { status: 400 })
    }

    const { url, events, secret, filters, description, owner_email } = parsed.data

    // Public-HTTPS-only check. Reject internal / loopback / cloud-metadata hosts.
    if (!isPublicHttpsUrl(url)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'webhook url must be a publicly reachable https:// host (no localhost, RFC1918, or link-local addresses).',
        },
      }, { status: 400 })
    }

    // DNS-resolution check — defeats hostnames that point at private IPs.
    if (!(await resolvesToPublicHost(new URL(url).hostname))) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'webhook host does not resolve to a public IP address.',
        },
      }, { status: 400 })
    }

    const supabase = requireServiceClient()

    // Check for duplicate URL (same URL + events combo)
    const { data: existing } = await supabase
      .from('webhooks')
      .select('id')
      .eq('url', url)
      .eq('active', true)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_WEBHOOK',
          message: 'Ya existe un webhook activo para esta URL. Desactívelo primero o use otra URL.',
        },
      }, { status: 409 })
    }

    // Insert webhook
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        url,
        events,
        secret,
        filters: filters || {},
        description: description || null,
        owner_email: owner_email || null,
        active: true,
      })
      .select('id, url, events, active, created_at')
      .single()

    if (insertError) {
      console.error('Webhook insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: 'Error al registrar el webhook',
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        webhook_id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active ?? true,
        created_at: webhook.created_at ?? new Date().toISOString(),
      },
      message: 'Webhook registrado correctamente',
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook registration error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/register
 * 
 * Returns available event types and documentation.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      available_events: WEBHOOK_EVENTS,
      documentation: 'https://consignatarias.com.ar/docs/api/webhooks',
      example: {
        url: 'https://your-domain.com/webhook',
        events: ['remate.created', 'remate.starting_soon'],
        secret: 'your_secret_minimum_16_chars',
        filters: {
          provincia: 'BUENOS AIRES',
        },
      },
    },
  })
}
