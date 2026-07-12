import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { frigorificoProfileUpdateSchema } from '@/lib/validators/frigorifico-profile'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ cuit: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit } = await params
  const supabase = requireServiceClient()

  // Verify ownership: user's email must match claimed_by_email
  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', cuit)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Frigorifico no encontrado' }, { status: 404 })
  }

  if (profile.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No sos el propietario de este perfil' }, { status: 403 })
  }

  const body = await req.json()

  // Convert empty strings to null for nullable fields
  const cleaned = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  )

  const parsed = frigorificoProfileUpdateSchema.safeParse(cleaned)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('frigorifico_profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('cuit', cuit)
    .select()
    .single()

  if (error) {
    console.error('Frigorifico profile update error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  // El perfil público es estático → revalidar para reflejar la edición al instante.
  try {
    revalidatePath(`/frigorificos/${cuit}`)
  } catch {
    // best-effort
  }

  return NextResponse.json({ frigorifico: data })
}
