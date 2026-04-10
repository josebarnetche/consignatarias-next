import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'

interface AuthResult {
  authorized: boolean
  response?: NextResponse
  userId?: string
  email?: string
  role?: string
}

/**
 * Require admin role. Reads session from cookies (no request param needed).
 * Uses service client to check user_roles since RLS only allows own-row reads.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  const service = requireServiceClient()
  const { data: role } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role || role.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { authorized: true, userId: user.id, email: user.email, role: 'admin' }
}

/**
 * Require any authenticated user (admin or owner).
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  const service = requireServiceClient()
  const { data: role } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return {
    authorized: true,
    userId: user.id,
    email: user.email,
    role: role?.role ?? undefined,
  }
}
