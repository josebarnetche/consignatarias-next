import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { mismoEmail } from '@/lib/claims/aprobar'

type Props = { params: Promise<{ slug: string }> }

// Un flyer de remate suele venir del diseñador como JPG/PNG grande o exportado del
// celular; 5 MB alcanza para una pieza de 1080×1350 con margen.
const MAX_SIZE = 5 * 1024 * 1024
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Sube el flyer de un remate y devuelve su URL pública (18-10-2026). No lo asocia a
 * ningún remate: el formulario guarda la URL junto con el resto de los datos, así un
 * remate nuevo puede llevar flyer desde el primer guardado. Cada subida es un archivo
 * nuevo (nombre aleatorio) para que el cambio de flyer no quede tapado por la caché.
 */
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

  const file = (await req.formData()).get('flyer') as File | null
  if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
  const ext = TIPOS[file.type]
  if (!ext) return NextResponse.json({ error: 'Formato no soportado. Usá JPG, PNG o WebP.' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo supera 5 MB' }, { status: 400 })

  const ruta = `flyers/${slug}/${randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('consignataria-assets')
    .upload(ruta, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })

  if (error) {
    console.error('Flyer upload error:', error)
    return NextResponse.json({ error: 'No se pudo subir el flyer' }, { status: 500 })
  }

  const { data } = supabase.storage.from('consignataria-assets').getPublicUrl(ruta)
  return NextResponse.json({ url: data.publicUrl }, { status: 201 })
}
