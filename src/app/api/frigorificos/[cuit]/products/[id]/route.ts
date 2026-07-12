import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { frigorificoPuedeInterprovincial } from '@/lib/features'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ cuit: string; id: string }> }

// Campos editables del producto (nunca frigorifico_cuit ni created_by).
const EDITABLE = [
  'sku', 'producto', 'categoria', 'estado', 'presentacion', 'unidad_venta',
  'unidades_por_bulto', 'peso_unidad_g', 'pedido_minimo', 'incremento',
  'precio_modo', 'precio_desde', 'precio_kg', 'moneda', 'escala_volumen',
  'foto_url', 'segmento', 'disponibilidad', 'status',
] as const

async function assertOwner(cuit: string, authEmail: string | undefined) {
  const supabase = requireServiceClient()
  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', cuit)
    .single()
  return !!profile && !!authEmail && profile.claimed_by_email === authEmail
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit, id } = await params
  if (!(await assertOwner(cuit, auth.email))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = requireServiceClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  for (const k of EDITABLE) {
    if (k in body) update[k] = body[k] === '' ? null : body[k]
  }

  // Gate regulatorio para interprovincial (igual que en el POST).
  if (body.interprovincial === true) {
    update.interprovincial = await frigorificoPuedeInterprovincial(cuit)
  } else if (body.interprovincial === false) {
    update.interprovincial = false
  }

  const { data, error } = await supabase
    .from('frigorifico_products')
    .update(update)
    .eq('id', Number(id))
    .eq('frigorifico_cuit', cuit)
    .select()
    .single()

  if (error) {
    console.error('Frigo product update error:', error)
    return NextResponse.json({ error: 'Error al actualizar el producto' }, { status: 500 })
  }

  try { revalidatePath(`/frigorificos/${cuit}`) } catch { /* best-effort */ }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit, id } = await params
  if (!(await assertOwner(cuit, auth.email))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = requireServiceClient()
  const { error } = await supabase
    .from('frigorifico_products')
    .delete()
    .eq('id', Number(id))
    .eq('frigorifico_cuit', cuit)

  if (error) {
    console.error('Frigo product delete error:', error)
    return NextResponse.json({ error: 'Error al eliminar el producto' }, { status: 500 })
  }

  try { revalidatePath(`/frigorificos/${cuit}`) } catch { /* best-effort */ }

  return NextResponse.json({ ok: true })
}
