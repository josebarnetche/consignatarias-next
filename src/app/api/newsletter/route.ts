import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendNewsletterWelcome } from '@/lib/email'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'

export async function POST(request: NextRequest) {
  try {
    // Durable per-IP rate limit — sends a welcome email to the submitted
    // address, so cap it to stop mailbox flooding / Resend quota burn.
    const rl = await enforceRateLimit({
      action: 'newsletter',
      identity: `ip:${clientIp(request)}`,
      limit: 20,
      windowSeconds: 3600,
    })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

    const { email, source = 'homepage', kgHa, hectareas } = await request.json()

    // Arriendo guardado (opcional, desde el calculador): personaliza el cierre mensual.
    const leaseFields = (typeof kgHa === 'number' && kgHa > 0 && typeof hectareas === 'number' && hectareas > 0)
      ? { lease_kg_ha: kgHa, lease_hectareas: hectareas }
      : null

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    const supabase = requireServiceClient()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      if (existing.status === 'active') {
        // Already subscribed — refresh the saved lease if they sent a new one.
        if (leaseFields) {
          await supabase.from('newsletter_subscribers').update(leaseFields).eq('id', existing.id)
        }
        return NextResponse.json(
          { message: 'Ya estás suscripto al newsletter' },
          { status: 200 }
        )
      }
      // Reactivate if unsubscribed
      await supabase
        .from('newsletter_subscribers')
        .update({ status: 'active', ...(leaseFields || {}) })
        .eq('id', existing.id)

      return NextResponse.json({
        success: true,
        message: 'Suscripción reactivada'
      })
    }

    // Insert new subscriber
    const normalizedEmail = email.toLowerCase().trim()
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: normalizedEmail,
        source,
        status: 'active',
        subscribed_at: new Date().toISOString(),
        ...(leaseFields || {}),
      })

    if (error) {
      console.error('Newsletter insert error:', error)
      return NextResponse.json(
        { error: 'Error al suscribirse. Intentá de nuevo.' },
        { status: 500 }
      )
    }

    // Send welcome email (fire and forget - don't block response)
    sendNewsletterWelcome({ to: normalizedEmail, source }).catch((err) => {
      console.error('Welcome email error:', err)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Suscripción exitosa' 
    })

  } catch (err) {
    console.error('Newsletter error:', err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
