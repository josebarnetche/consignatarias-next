import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { mismoEmail } from '@/lib/claims/aprobar'
import { flyerValido, urlValida } from '@/lib/remates-firma'

type Props = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params
  const supabase = requireServiceClient()

  // Explicit public column list — never `select('*')` here. The table has a
  // `created_by` column holding the claiming owner's email (written on POST);
  // `*` leaked it through this UNAUTHENTICATED GET, exposing owner emails for
  // every claimed consignataria. Add new public columns deliberately.
  const { data, error } = await supabase
    .from('consignataria_auctions')
    .select(
      'id, consignataria_slug, title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url, flyer_url, status, created_at, updated_at',
    )
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

  if (!consig || !mismoEmail(consig.claimed_by_email, auth.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url, flyer_url, reemplaza_clave } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Titulo y fecha son obligatorios' }, { status: 400 })
  }
  if (!urlValida(catalog_url) || !urlValida(youtube_url)) {
    return NextResponse.json({ error: 'Los enlaces tienen que empezar con https://' }, { status: 400 })
  }
  if (!flyerValido(flyer_url, slug)) {
    return NextResponse.json({ error: 'El flyer tiene que subirse desde el panel' }, { status: 400 })
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
      flyer_url: flyer_url || null,
      // Sólo si corrige un remate del calendario: la clave "fecha|LOCALIDAD" de ese remate.
      reemplaza_clave: typeof reemplaza_clave === 'string' && /^\d{4}-\d{2}-\d{2}\|/.test(reemplaza_clave) ? reemplaza_clave.slice(0, 200) : null,
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
