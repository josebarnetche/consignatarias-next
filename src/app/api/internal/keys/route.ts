import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { generateApiKey, getMonthlyUsage, getUserPlan, hasApiAccess, PLAN_LIMITS } from '@/lib/api-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_KEYS_PER_USER = 5

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await hasApiAccess(user.id))) {
    return NextResponse.json({ error: 'no_api_access' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: keys } = await admin
    .from('api_keys')
    .select('id, name, prefix, environment, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  // Compute monthly usage per key in parallel
  const usage = await Promise.all(
    (keys ?? []).map(async (k) => ({ id: k.id, used: await getMonthlyUsage(k.id) })),
  )
  const usageById = Object.fromEntries(usage.map((u) => [u.id, u.used]))

  const plan = (await getUserPlan(user.id))! // gated by hasApiAccess above
  const limits = PLAN_LIMITS[plan]
  const totalUsed = usage.reduce((sum, u) => sum + u.used, 0)

  return NextResponse.json({
    plan,
    limits,
    totalUsed,
    keys: (keys ?? []).map((k) => ({
      ...k,
      usedThisMonth: usageById[k.id] ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await hasApiAccess(user.id))) {
    return NextResponse.json(
      { error: 'no_api_access', message: 'Tu cuenta no tiene un plan Enterprise activo.' },
      { status: 403 },
    )
  }

  let body: { name?: string; environment?: 'live' | 'test' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const environment = body.environment === 'test' ? 'test' : 'live'
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Enforce max active keys per user
  const { count } = await admin
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if ((count ?? 0) >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      { error: 'max_keys_reached', limit: MAX_KEYS_PER_USER },
      { status: 409 },
    )
  }

  const generated = generateApiKey(environment)

  const { data: inserted, error } = await admin
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      prefix: generated.prefix,
      hash: generated.hash,
      environment: generated.environment,
    })
    .select('id, name, prefix, environment, created_at')
    .single()

  if (error || !inserted) {
    console.error('api_keys insert failed', error)
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({
    key: inserted,
    secret: generated.full, // SHOWN ONLY ONCE
  })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id) // belt + RLS
    .is('revoked_at', null)

  if (error) {
    console.error('api_keys revoke failed', error)
    return NextResponse.json({ error: 'revoke_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
