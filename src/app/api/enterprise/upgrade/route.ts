import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createEnterpriseGrowthLink } from '@/lib/rebill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/enterprise/upgrade?target=growth
 *
 * Self-serve upgrade from a lower Enterprise tier to Growth. Returns a Rebill
 * checkout URL. The webhook handler (kind='enterprise_subscription' +
 * metadata.api_tier='growth') flips api_tier on payment success.
 *
 * Scale upgrades stay sales-led (mailto). Only growth is self-serve.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target')
  if (target !== 'growth') {
    return NextResponse.json(
      {
        error: 'unsupported_target',
        message: 'Only target=growth is self-serve. Scale → mailto agro@memola.com.ar.',
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user || !user.email) {
    return NextResponse.json(
      { error: 'unauthenticated', message: 'Iniciá sesión para upgradear.' },
      { status: 401 },
    )
  }

  try {
    const link = await createEnterpriseGrowthLink(user.id, user.email)
    const checkoutUrl = (link?.shortUrl as string) || (link?.url as string) || null
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'no_checkout_url', message: 'Rebill no devolvió URL. Probá de nuevo.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ checkoutUrl, target })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'rebill_failed',
        message: err instanceof Error ? err.message : 'Error generando link de pago.',
      },
      { status: 500 },
    )
  }
}
