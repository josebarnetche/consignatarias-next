import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ cuit: string }> }

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

// POST /api/frigorificos/[cuit]/logo — sube el logo del frigorífico reclamado.
// Espeja el endpoint de consignatarias: mismo bucket (consignataria-assets),
// gate por claimed_by_email, upsert del archivo y guardado de la URL pública.
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit } = await params
  const supabase = requireServiceClient()

  // Verify ownership
  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', cuit)
    .single()

  if (!profile || profile.claimed_by_email !== auth.email) {
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

  const ext = file.type === 'image/svg+xml' ? 'svg'
    : file.type === 'image/webp' ? 'webp'
    : file.type === 'image/png' ? 'png'
    : 'jpg'

  // Prefijo frigo- para no colisionar con logos de consignatarias en el mismo bucket.
  const filePath = `logos/frigo-${cuit}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('consignataria-assets')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Frigo logo upload error:', uploadError)
    return NextResponse.json({ error: 'Error al subir el logo' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('consignataria-assets')
    .getPublicUrl(filePath)

  const logoUrl = urlData.publicUrl

  const { error: updateError } = await supabase
    .from('frigorifico_profiles')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('cuit', cuit)

  if (updateError) {
    console.error('Frigo logo URL update error:', updateError)
    return NextResponse.json({ error: 'Error al guardar URL del logo' }, { status: 500 })
  }

  // El perfil público es estático → revalidar para que el logo aparezca al instante.
  try {
    revalidatePath(`/frigorificos/${cuit}`)
  } catch {
    // best-effort
  }

  return NextResponse.json({ logo_url: logoUrl })
}
