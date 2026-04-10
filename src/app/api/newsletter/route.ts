import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendNewsletterWelcome } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, source = 'homepage' } = await request.json()

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
        return NextResponse.json(
          { message: 'Ya estás suscripto al newsletter' },
          { status: 200 }
        )
      }
      // Reactivate if unsubscribed
      await supabase
        .from('newsletter_subscribers')
        .update({ status: 'active', resubscribed_at: new Date().toISOString() })
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
