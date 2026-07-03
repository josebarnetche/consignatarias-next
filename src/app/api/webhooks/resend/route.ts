import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/resend
 *
 * Recibe los eventos de Resend (sent/delivered/opened/clicked/bounced/complained)
 * y los persiste en email_events para poder medir el canal — hasta ahora ciego.
 *
 * Seguridad: Resend firma con Svix. Verificamos `svix-id`/`svix-timestamp`/
 * `svix-signature` con RESEND_WEBHOOK_SECRET (formato whsec_<base64>). Si el
 * secreto no está seteado, rechazamos (no abrimos un endpoint sin firmar en prod).
 *
 * Dedupe de reintentos: processed_webhook_events (source='resend', event_id=svix-id).
 *
 * Setup (una vez, del lado del dueño):
 *  1. Vercel env: RESEND_WEBHOOK_SECRET = el "Signing Secret" del webhook (whsec_…).
 *  2. Resend → Webhooks → Add Endpoint: https://www.consignatarias.com.ar/api/webhooks/resend
 *     y seleccionar los eventos (email.sent/delivered/opened/clicked/bounced/complained).
 *  3. Resend → Domain settings: activar Open tracking + Click tracking.
 */

/** Verificación Svix (sin dependencia): HMAC-SHA256 sobre `${id}.${ts}.${body}`. */
function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): boolean {
  try {
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const signedContent = `${id}.${ts}.${body}`
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')
    const expectedBuf = Buffer.from(expected)
    // El header es lista separada por espacios de "v1,<sig>".
    for (const part of sigHeader.split(' ')) {
      const sig = part.split(',')[1]
      if (!sig) continue
      const sigBuf = Buffer.from(sig)
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) return true
    }
    return false
  } catch {
    return false
  }
}

function firstRecipient(to: unknown): string | null {
  if (typeof to === 'string') return to
  if (Array.isArray(to) && typeof to[0] === 'string') return to[0]
  return null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // ── Verificación de firma ──
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }
  const svixId = req.headers.get('svix-id') || ''
  const svixTs = req.headers.get('svix-timestamp') || ''
  const svixSig = req.headers.get('svix-signature') || ''
  if (!svixId || !svixTs || !svixSig || !verifySvix(secret, svixId, svixTs, rawBody, svixSig)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  // Replay window: reject signed events older/newer than 5 min (Svix spec).
  // Dedup on svix-id stops honest retries; this bounds captured-event replay.
  const tsSeconds = Number(svixTs)
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    return NextResponse.json({ error: 'stale_timestamp' }, { status: 401 })
  }

  let payload: { type?: string; created_at?: string; data?: Record<string, unknown> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const service = requireServiceClient()

  // ── Dedupe de reintentos (svix-id es único por entrega) ──
  const { error: dedupErr } = await service
    .from('processed_webhook_events')
    .insert({ event_id: svixId, source: 'resend', event_type: payload.type ?? 'unknown' })
  if (dedupErr) {
    if ((dedupErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, ignored: 'duplicate' })
    }
    console.error('[resend-webhook] dedup insert error:', dedupErr.message)
    return NextResponse.json({ error: 'dedup_failed' }, { status: 500 })
  }

  // ── Normalizar el evento ──
  const d = (payload.data ?? {}) as Record<string, unknown>
  const type = (payload.type ?? '').replace(/^email\./, '') // opened, delivered, …
  const tags = Array.isArray(d.tags) ? (d.tags as Array<{ name?: string; value?: string }>) : []
  const campaignTag = tags.find((t) => t.name === 'campaign' || t.name === 'campaña')?.value ?? null
  const click = (d.click ?? {}) as Record<string, unknown>
  const bounce = (d.bounce ?? {}) as Record<string, unknown>

  const row = {
    email_id: (d.email_id as string) ?? (d.id as string) ?? null,
    type: type || 'unknown',
    recipient: firstRecipient(d.to),
    subject: (d.subject as string) ?? null,
    campaign: campaignTag,
    link: (click.link as string) ?? null,
    bounce_type: (bounce.type as string) ?? null,
    occurred_at: (d.created_at as string) ?? payload.created_at ?? null,
    raw: payload as unknown as Json,
  }

  const { error: insErr } = await service.from('email_events').insert(row)
  if (insErr) {
    console.error('[resend-webhook] email_events insert error:', insErr.message)
    // 500 para que Resend reintente (y no perdamos el evento).
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
