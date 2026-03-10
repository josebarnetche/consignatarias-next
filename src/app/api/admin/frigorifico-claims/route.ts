import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const status = req.nextUrl.searchParams.get('status') || 'all'
  const supabase = createServiceClient()

  let query = supabase
    .from('frigorifico_claims')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Admin frigorifico claims fetch error:', error)
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 },
    )
  }

  return NextResponse.json({ claims: data })
}
