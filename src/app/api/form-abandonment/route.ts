import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'

// Blocks obvious garbage and header-injection patterns; not RFC-perfect.
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/

const VALID_FORM_TYPES = new Set(['claim', 'newsletter', 'enterprise', 'lead'])

/**
 * Captures email when user starts filling a form (before submit).
 * Used for abandonment recovery campaigns.
 *
 * POST /api/form-abandonment
 * Body: { email, slug, form_type }
 */
export async function POST(req: NextRequest) {
  try {
    // Per-IP rate-limit. Without this, attackers poison the re-engagement
    // queue with arbitrary email+slug pairs (used to email any address).
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const rl = checkRateLimit(`form-abandon:${ip}`, 'pro')
    if (!rl.success) {
      return NextResponse.json({ ok: true, throttled: true })
    }

    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const slug = typeof body?.slug === 'string' ? body.slug : null
    const formType = typeof body?.form_type === 'string' ? body.form_type : 'claim'

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (slug !== null && slug.length > 200) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }

    if (!VALID_FORM_TYPES.has(formType)) {
      return NextResponse.json({ error: 'Invalid form_type' }, { status: 400 })
    }

    const supabase = requireServiceClient()

    // Upsert to avoid duplicates (same email + slug combo)
    const { error } = await supabase
      .from('form_abandonment')
      .upsert(
        {
          email,
          slug,
          form_type: formType,
          captured_at: new Date().toISOString(),
        },
        { onConflict: 'email,slug' }
      )

    if (error) {
      // Log but don't fail — fire-and-forget
      console.error('Form abandonment capture error:', error)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
