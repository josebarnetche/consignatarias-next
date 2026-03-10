import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'

type Props = { params: Promise<{ slug: string }> }

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug } = await params
  const supabase = createServiceClient()

  // Verify ownership
  const { data: consig } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()

  if (!consig || consig.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('logo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se envio archivo' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no soportado. Usa JPG, PNG, WebP o SVG.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera 2 MB' }, { status: 400 })
  }

  // Determine file extension
  const ext = file.type === 'image/svg+xml' ? 'svg'
    : file.type === 'image/webp' ? 'webp'
    : file.type === 'image/png' ? 'png'
    : 'jpg'

  const filePath = `logos/${slug}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to Supabase Storage (upsert)
  const { error: uploadError } = await supabase.storage
    .from('consignataria-assets')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Logo upload error:', uploadError)
    return NextResponse.json({ error: 'Error al subir el logo' }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('consignataria-assets')
    .getPublicUrl(filePath)

  const logoUrl = urlData.publicUrl

  // Save URL to consignatarias table
  const { error: updateError } = await supabase
    .from('consignatarias')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('canonical_slug', slug)

  if (updateError) {
    console.error('Logo URL update error:', updateError)
    return NextResponse.json({ error: 'Error al guardar URL del logo' }, { status: 500 })
  }

  return NextResponse.json({ logo_url: logoUrl })
}
