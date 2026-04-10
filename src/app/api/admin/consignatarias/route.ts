import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const verified = req.nextUrl.searchParams.get('verified')

  const supabase = requireServiceClient()

  let query = supabase
    .from('consignatarias')
    .select('*')
    .order('display_name', { ascending: true })

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,canonical_slug.ilike.%${q}%`)
  }

  if (verified === 'true') query = query.eq('verified', true)
  if (verified === 'false') query = query.eq('verified', false)

  const { data, error } = await query

  if (error) {
    console.error('Admin consignatarias fetch error:', error)
    return NextResponse.json(
      { error: 'Error al obtener consignatarias' },
      { status: 500 },
    )
  }

  return NextResponse.json({ consignatarias: data })
}
