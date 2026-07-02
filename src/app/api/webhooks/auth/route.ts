import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

/**
 * POST /api/webhooks/auth
 * 
 * Supabase Auth webhook handler.
 * Triggers welcome email on user signup (user.created event).
 * 
 * Configure in Supabase Dashboard:
 * Settings > Auth > Webhooks > Add Webhook
 * - URL: https://www.consignatarias.com.ar/api/webhooks/auth
 * - Events: user.created
 * - Secret: SUPABASE_AUTH_WEBHOOK_SECRET env var
 */

const WEBHOOK_SECRET = process.env.SUPABASE_AUTH_WEBHOOK_SECRET

// Verify Supabase webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

interface SupabaseAuthWebhookPayload {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  table: string
  record: {
    id: string
    email?: string
    raw_user_meta_data?: {
      full_name?: string
      name?: string
      display_name?: string
    }
    created_at: string
  }
  old_record?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    
    // Verify signature — FAIL CLOSED. An unset secret previously skipped
    // verification entirely, letting anyone forge `user.created` events to
    // blast welcome emails (Resend domain abuse) and write outreach_log rows.
    const signature = request.headers.get('x-supabase-webhook-signature')
    if (!WEBHOOK_SECRET) {
      console.error('[Auth Webhook] SUPABASE_AUTH_WEBHOOK_SECRET not configured — rejecting')
      return NextResponse.json({ error: 'not_configured' }, { status: 503 })
    }
    if (!verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
      console.error('[Auth Webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const payload: SupabaseAuthWebhookPayload = JSON.parse(rawBody)
    const { type, record } = payload

    // Only handle user.created events
    if (type !== 'user.created') {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: `Event type ${type} not handled` 
      })
    }

    const userId = record.id
    const email = record.email
    const userName = record.raw_user_meta_data?.full_name 
      || record.raw_user_meta_data?.name
      || record.raw_user_meta_data?.display_name

    if (!email) {
      return NextResponse.json({ 
        status: 'skipped', 
        reason: 'No email in user record' 
      })
    }

    const supabase = requireServiceClient()

    // Check if welcome email already sent (idempotency)
    const { data: existingLog } = await supabase
      .from('outreach_log')
      .select('id')
      .eq('type', 'welcome_email')
      .eq('user_id', userId)
      .single()

    if (existingLog) {
      return NextResponse.json({ 
        status: 'skipped', 
        reason: 'Welcome email already sent' 
      })
    }

    // Send welcome email
    const result = await sendWelcomeEmail({
      to: email,
      userName: userName || undefined
    })

    if (!result.success) {
      console.error('[Auth Webhook] Failed to send welcome email:', result.error)
      return NextResponse.json({ 
        status: 'error', 
        error: result.error 
      }, { status: 500 })
    }

    // Log the send
    await supabase.from('outreach_log').insert({
      type: 'welcome_email',
      user_id: userId,
      email_sent_to: email,
    })

    // Track activation funnel event
    // Note: This could also be tracked client-side, but server-side is more reliable
    console.log(`[Auth Webhook] Welcome email sent to ${email} (user: ${userId})`)

    return NextResponse.json({
      status: 'sent',
      userId,
      email,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    console.error('[Auth Webhook] Error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    endpoint: '/api/webhooks/auth',
    purpose: 'Supabase Auth webhook handler',
    events: ['user.created'],
    status: 'ready'
  })
}
