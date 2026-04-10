import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { consignatariaUpdateSchema } from '@/lib/validators/consignataria'

type Props = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { slug } = await params
  const supabase = requireServiceClient()

  const { data, error } = await supabase
    .from('consignatarias')
    .select('*')
    .eq('canonical_slug', slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

  return NextResponse.json({ consignataria: data })
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { slug } = await params
  const body = await req.json()

  // Convert empty strings to null for nullable fields
  const cleaned = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  )

  const parsed = consignatariaUpdateSchema.safeParse(cleaned)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = requireServiceClient()

  const { data, error } = await supabase
    .from('consignatarias')
    .update(parsed.data)
    .eq('canonical_slug', slug)
    .select()
    .single()

  if (error) {
    console.error('Admin consignataria update error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  return NextResponse.json({ consignataria: data })
}
