import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createEnterpriseStarterLink } from '@/lib/rebill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/enterprise/checkout
 *
 * Creates a Rebill payment link for Enterprise Starter (USD 49/mes facturado
 * en ARS al equivalente — ver src/lib/rebill.ts). Requires logged-in user. Returns { checkoutUrl }.
 *
 * Higher tiers (Growth, Scale) stay sales-led via mailto for now.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user || !user.email) {
    return NextResponse.json(
      { error: 'unauthenticated', message: 'Iniciá sesión para contratar.' },
      { status: 401 },
    )
  }

  try {
    const link = await createEnterpriseStarterLink(user.id, user.email)
    const checkoutUrl = (link?.shortUrl as string) || (link?.url as string) || null
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'no_checkout_url', message: 'Rebill no devolvió URL. Probá de nuevo.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('Enterprise checkout error:', err)
    return NextResponse.json(
      {
        error: 'rebill_failed',
        message: err instanceof Error ? err.message : 'Error generando link de pago.',
      },
      { status: 500 },
    )
  }
}
