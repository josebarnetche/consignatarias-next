import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'

type Props = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params
  const supabase = requireServiceClient()

  const { data, error } = await supabase
    .from('consignataria_auctions')
    .select('*')
    .eq('consignataria_slug', slug)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener remates' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug } = await params
  const supabase = requireServiceClient()

  const { data: consig } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()

  if (!consig || consig.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Titulo y fecha son obligatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('consignataria_auctions')
    .insert({
      consignataria_slug: slug,
      title,
      date,
      time: time || null,
      location: location || null,
      province: province || null,
      type: type || 'general',
      main_category: main_category || 'mixto',
      estimated_heads: estimated_heads || null,
      description: description || null,
      catalog_url: catalog_url || null,
      youtube_url: youtube_url || null,
      created_by: auth.email!,
    })
    .select()
    .single()

  if (error) {
    console.error('Auction insert error:', error)
    return NextResponse.json({ error: 'Error al crear remate' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
