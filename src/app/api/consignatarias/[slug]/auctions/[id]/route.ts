import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'

type Props = { params: Promise<{ slug: string; id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug, id } = await params
  const supabase = createServiceClient()

  const { data: consig } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()

  if (!consig || consig.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: auction } = await supabase
    .from('consignataria_auctions')
    .select('id')
    .eq('id', id)
    .eq('consignataria_slug', slug)
    .single()

  if (!auction) {
    return NextResponse.json({ error: 'Remate no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const allowed = ['title', 'date', 'time', 'location', 'province', 'type', 'main_category', 'estimated_heads', 'description', 'catalog_url', 'youtube_url', 'status']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('consignataria_auctions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug, id } = await params
  const supabase = createServiceClient()

  const { data: consig } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()

  if (!consig || consig.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { error } = await supabase
    .from('consignataria_auctions')
    .delete()
    .eq('id', id)
    .eq('consignataria_slug', slug)

  if (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Remate eliminado' })
}
