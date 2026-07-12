import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ cuit: string }> }

/**
 * POST /api/admin/frigorificos/[cuit]/verificar-habilitacion — SOLO admin.
 * Aprueba (o revoca) la habilitación declarada por el titular tras revisar la
 * constancia. Sólo acá se enciende `habilitacion_verificada` → es la única vía por
 * la que el sitio pasa a afirmar alcance (badge federal / provincial). El humano
 * es el gate: nadie se auto-verifica.
 *
 * body: { aprobar: boolean }
 */
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { cuit } = await params
  const { aprobar } = await req.json().catch(() => ({ aprobar: false }))

  const supabase = requireServiceClient()
  const { error } = await supabase
    .from('frigorifico_profiles')
    .update({
      habilitacion_verificada: aprobar === true,
      habilitacion_verificada_at: aprobar === true ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('cuit', cuit)

  if (error) {
    console.error('Verificar habilitacion error:', error)
    return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
  }

  try { revalidatePath(`/frigorificos/${cuit}`) } catch { /* best-effort */ }

  return NextResponse.json({ ok: true, verificada: aprobar === true })
}
