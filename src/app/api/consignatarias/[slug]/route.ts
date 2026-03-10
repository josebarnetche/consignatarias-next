import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { profileUpdateSchema } from '@/lib/validators/consignataria-profile'

type Props = { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug } = await params
  const supabase = createServiceClient()

  // Verify ownership: user's email must match claimed_by_email
  const { data: consignataria } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()

  if (!consignataria) {
    return NextResponse.json({ error: 'Consignataria no encontrada' }, { status: 404 })
  }

  if (consignataria.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No sos el propietario de este perfil' }, { status: 403 })
  }

  const body = await req.json()

  // Convert empty strings to null for nullable fields
  const cleaned = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  )

  const parsed = profileUpdateSchema.safeParse(cleaned)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('consignatarias')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('canonical_slug', slug)
    .select()
    .single()

  if (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  return NextResponse.json({ consignataria: data })
}
