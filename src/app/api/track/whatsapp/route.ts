import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

/**
 * POST /api/track/whatsapp
 * 
 * Track WhatsApp button clicks for dashboard analytics.
 * Called client-side when user clicks WhatsApp CTA.
 */
export async function POST(req: NextRequest) {
  try {
    const { slug, source = 'profile' } = await req.json()
    
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }

    const supabase = requireServiceClient()

    // Insert click record
    const { error } = await supabase
      .from('whatsapp_clicks')
      .insert({
        consignataria_slug: slug,
        clicked_at: new Date().toISOString(),
        source: source || 'profile',
      })

    if (error) {
      console.error('WhatsApp click insert error:', error)
      // Table might not exist yet - that's ok, we'll create it
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
