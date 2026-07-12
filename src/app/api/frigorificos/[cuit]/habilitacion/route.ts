import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { logEvent } from '@/lib/ops'

type Props = { params: Promise<{ cuit: string }> }

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB (constancia puede ser PDF/foto)
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/frigorificos/[cuit]/habilitacion — el titular DECLARA su nivel de
 * habilitación (nacional/provincial/municipal), su N° y sube la constancia.
 * Queda `habilitacion_verificada = false` hasta que un admin la apruebe: el sitio
 * NO afirma alcance por auto-declaración — la afirmación vive tras la verificación
 * humana. Emite ops_event para que la solicitud caiga en /admin/ops.
 */
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit } = await params
  const supabase = requireServiceClient()

  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', cuit)
    .single()

  if (!profile || profile.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const nivel = String(formData.get('nivel') || '')
  const nro = String(formData.get('nro') || '')
  const file = formData.get('doc') as File | null

  if (!['nacional', 'provincial', 'municipal'].includes(nivel)) {
    return NextResponse.json({ error: 'Nivel de habilitación inválido' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    habilitacion_nivel: nivel,
    habilitacion_nro: nro || null,
    // Declarar (o re-declarar) SIEMPRE resetea la verificación → requiere nueva
    // aprobación admin. Nadie se auto-verifica.
    habilitacion_verificada: false,
    habilitacion_verificada_at: null,
    updated_at: new Date().toISOString(),
  }

  if (file) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no soportado. Usá PDF, JPG, PNG o WebP.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera 5 MB' }, { status: 400 })
    }
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filePath = `hab-${cuit}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage
      .from('consignataria-assets')
      .upload(filePath, buffer, { contentType: file.type, upsert: true })
    if (upErr) {
      console.error('Habilitacion upload error:', upErr)
      return NextResponse.json({ error: 'Error al subir la constancia' }, { status: 500 })
    }
    const { data: urlData } = supabase.storage.from('consignataria-assets').getPublicUrl(filePath)
    update.habilitacion_doc_url = urlData.publicUrl
  }

  const { error } = await supabase
    .from('frigorifico_profiles')
    .update(update)
    .eq('cuit', cuit)

  if (error) {
    console.error('Habilitacion update error:', error)
    return NextResponse.json({ error: 'Error al guardar la declaración' }, { status: 500 })
  }

  logEvent({
    eventType: 'form_submit',
    status: 'ok',
    route: '/api/frigorificos/[cuit]/habilitacion',
    metadata: { form: 'habilitacion_declarada', cuit, nivel, tiene_doc: !!file },
  })

  return NextResponse.json({ ok: true, pendiente_verificacion: true })
}
