import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'

/**
 * Captures email when user starts filling a form (before submit).
 * Used for abandonment recovery campaigns.
 * 
 * POST /api/form-abandonment
 * Body: { email, slug, form_type }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, slug, form_type } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = requireServiceClient()

    // Upsert to avoid duplicates (same email + slug combo)
    const { error } = await supabase
      .from('form_abandonment')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          slug: slug || null,
          form_type: form_type || 'claim',
          captured_at: new Date().toISOString(),
        },
        { onConflict: 'email,slug' }
      )

    if (error) {
      // Log but don't fail — this is fire-and-forget
      console.error('Form abandonment capture error:', error)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
